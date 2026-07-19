import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { AssistanceService } from './assistance.service';
import { StorageService } from '@core/services/storage.service';
import type { Message } from '../models/assistance.model';

describe('AssistanceService', () => {
  let service: AssistanceService;
  let httpMock: HttpTestingController;
  let storageMock: { get: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    storageMock = {
      get: vi.fn().mockReturnValue('jwt-token'),
    };

    TestBed.configureTestingModule({
      providers: [
        AssistanceService,
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: StorageService, useValue: storageMock },
      ],
    });

    service = TestBed.inject(AssistanceService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
    vi.restoreAllMocks();
  });

  it('sendMessage() should POST mapped messages', () => {
    const messages: Message[] = [
      { id: 'm1', role: 'user', content: 'Hello', timestamp: new Date() },
    ];

    service.sendMessage('conv-1', messages).subscribe((res) => {
      expect(res.content).toBe('Hi');
    });

    const req = httpMock.expectOne('/api/assistance/chat');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({
      conversationId: 'conv-1',
      messages: [{ role: 'user', content: 'Hello' }],
    });
    req.flush({ content: 'Hi' });
  });

  it('generateTitle() should map response title', () => {
    service.generateTitle('question').subscribe((title) => {
      expect(title).toBe('Titre IA');
    });

    const req = httpMock.expectOne('/api/assistance/generate-title');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ message: 'question' });
    req.flush({ title: 'Titre IA' });
  });

  it('sendMessageStream() should stream chunks and done title', async () => {
    const encoder = new TextEncoder();
    const chunks = [
      encoder.encode('data: {"chunk":"Bon"}\n'),
      encoder.encode('data: {"chunk":"jour"}\n'),
      encoder.encode('data: {"done":true,"title":"Titre stream"}\n'),
    ];

    let index = 0;
    const reader = {
      read: vi.fn().mockImplementation(() => {
        if (index < chunks.length) {
          const value = chunks[index++];
          return Promise.resolve({ done: false, value });
        }
        return Promise.resolve({ done: true, value: undefined });
      }),
    };

    const fetchMock = vi.fn().mockResolvedValue({
      body: {
        getReader: () => reader,
      },
    });
    vi.stubGlobal('fetch', fetchMock);

    const onChunk = vi.fn();
    const onDone = vi.fn();

    await new Promise<void>((resolve, reject) => {
      service.sendMessageStream(
        'conv-1',
        [{ id: 'm1', role: 'user', content: 'Salut', timestamp: new Date() }],
        (chunk) => onChunk(chunk),
        (title) => {
          onDone(title);
          resolve();
        },
        reject,
      );
    });

    expect(storageMock.get).toHaveBeenCalledWith('access_token');
    expect(fetchMock).toHaveBeenCalledWith('/api/assistance/chat/stream', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer jwt-token',
      },
      body: JSON.stringify({
        conversationId: 'conv-1',
        messages: [{ role: 'user', content: 'Salut' }],
      }),
    });
    expect(onChunk).toHaveBeenNthCalledWith(1, 'Bon');
    expect(onChunk).toHaveBeenNthCalledWith(2, 'jour');
    expect(onDone).toHaveBeenCalledWith('Titre stream');
  });

  it('sendMessageStream() should forward fetch errors to onError', async () => {
    const onError = vi.fn();
    const fetchMock = vi.fn().mockRejectedValue(new Error('network error'));
    vi.stubGlobal('fetch', fetchMock);

    service.sendMessageStream('conv-err', [], vi.fn(), vi.fn(), onError);
    await Promise.resolve();
    await Promise.resolve();

    expect(onError).toHaveBeenCalledTimes(1);
  });
});
