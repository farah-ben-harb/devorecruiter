import { ComponentFixture, TestBed } from '@angular/core/testing';
import { describe, it, expect, vi, beforeEach, Mocked } from 'vitest';
import { of, throwError } from 'rxjs';
import { RhAssistantComponent } from './rh-assistant.component';
import { RhAssistantFacade } from '../states/rh-assistant.facade';
import { RhAssistantService } from '../services/rh-assistant.service';
import { AuthService } from '../../auth/services/auth.service';
import { JwtPayload } from '../../auth/models/auth.model';
import {
  Message,
  SidebarConversation,
  ConversationHistory,
  Stats,
} from '../models/rh-assistant.model';

// ─────────────────────────────────────────────────────────────
// Types stricts mocks
// ─────────────────────────────────────────────────────────────

type FacadeMock = Mocked<RhAssistantFacade>;
type ServiceMock = Mocked<RhAssistantService>;
type AuthMock = Mocked<AuthService>;

// ─────────────────────────────────────────────────────────────
// Factories
// ─────────────────────────────────────────────────────────────

const makeMessage = (overrides?: Partial<Message>): Message => ({
  role: 'user',
  content: 'Bonjour',
  isLoading: false,
  createdAt: new Date(),
  ...overrides,
});

const makeApiMessage = () => ({
  id: 1,
  role: 'user',
  content: 'Bonjour',
  sources: null,
  createdAt: '2024-01-15T10:00:00.000Z',
});

const makeConv = (overrides?: Partial<SidebarConversation>): SidebarConversation => ({
  id: 1,
  title: 'Conv 1',
  createdAt: '2024-01-15T10:00:00.000Z',
  isActive: false,
  isPinned: false,
  ...overrides,
});

const makeHistory = (): ConversationHistory => ({
  conversationId: 10,
  userId: 1,
  messages: [makeMessage(), makeMessage({ role: 'assistant', content: 'Réponse' })],
  total: 2,
  createdAt: new Date(),
});

const makeStats = (): Stats => ({
  totalConversations: 3,
  totalMessages: 12,
  userId: 1,
});

const makeJwtPayload = (overrides?: Partial<JwtPayload>): JwtPayload => ({
  sub: 1,
  email: 'alice@example.com',
  roles: [],
  firstName: 'Alice',
  lastName: 'Dupont',
  picture: '',
  exp: 9999999999,
  ...overrides,
});

// ─────────────────────────────────────────────────────────────
// Mocks
// ─────────────────────────────────────────────────────────────

const makeFacadeMock = (): FacadeMock =>
  ({
    snapshot: { status: 'idle' } as RhAssistantFacade['snapshot'],
    messages$: of([]),
    stats$: of(null),
    isLoading$: of(false),
    hasMessages$: of(false),
    showSidebar$: of(true),
    conversationId$: of(null),
    error$: of(null),

    setHistoryLoading: vi.fn(),
    setHistorySuccess: vi.fn(),
    setHistoryError: vi.fn(),
    setStats: vi.fn(),
    setAsking: vi.fn(),
    addUserMessage: vi.fn(),
    addLoadingMessage: vi.fn(),
    replaceLoadingWithResponse: vi.fn(),
    replaceLoadingWithError: vi.fn(),
    setConversationId: vi.fn(),
    resetConversation: vi.fn(),
    toggleSidebar: vi.fn(),
  }) as unknown as FacadeMock;

const makeServiceMock = (): ServiceMock =>
  ({
    getHistory: vi.fn().mockReturnValue(of(makeHistory())),
    getStats: vi.fn().mockReturnValue(of(makeStats())),
    getSidebarHistory: vi.fn().mockReturnValue(of({ conversations: [makeConv()] })),
    ask: vi.fn().mockReturnValue(
      of({
        response: 'Réponse IA',
        sources: [],
        timestamp: new Date(),
        conversationId: 10,
      }),
    ),
    reset: vi.fn().mockReturnValue(of({ message: 'ok' })),
    getConversationById: vi.fn().mockReturnValue(
      of({
        conversationId: 10,
        messages: [makeApiMessage()],
      }),
    ),
    deleteConversation: vi.fn().mockReturnValue(of({})),
    pinConversation: vi.fn().mockReturnValue(of({})),
  }) as unknown as ServiceMock;

const makeAuthMock = (): AuthMock =>
  ({
    getUser: vi.fn(),
  }) as unknown as AuthMock;

// ─────────────────────────────────────────────────────────────
// Tests
// ─────────────────────────────────────────────────────────────

describe('RhAssistantComponent', () => {
  let component: RhAssistantComponent;
  let fixture: ComponentFixture<RhAssistantComponent>;
  let facadeMock: FacadeMock;
  let serviceMock: ServiceMock;
  let authMock: AuthMock;

  beforeEach(async () => {
    facadeMock = makeFacadeMock();
    serviceMock = makeServiceMock();
    authMock = makeAuthMock();

    await TestBed.configureTestingModule({
      imports: [RhAssistantComponent],
      providers: [
        { provide: RhAssistantFacade, useValue: facadeMock },
        { provide: RhAssistantService, useValue: serviceMock },
        { provide: AuthService, useValue: authMock },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(RhAssistantComponent);
    component = fixture.componentInstance;
  });

  // ───────── lifecycle ─────────

  it('ngOnInit charge les données et user', () => {
    authMock.getUser.mockReturnValue(makeJwtPayload());

    const loadHistorySpy = vi.spyOn(serviceMock, 'getHistory');
    const loadStatsSpy = vi.spyOn(serviceMock, 'getStats');
    const loadSidebarSpy = vi.spyOn(serviceMock, 'getSidebarHistory');

    component.ngOnInit();

    expect(loadHistorySpy).toHaveBeenCalled();
    expect(loadStatsSpy).toHaveBeenCalled();
    expect(loadSidebarSpy).toHaveBeenCalled();

    expect(component.currentUser).toEqual({
      name: 'Alice Dupont',
      picture: '',
    });
  });

  it('gère user null', () => {
    authMock.getUser.mockReturnValue(null);

    component.ngOnInit();

    expect(component.currentUser).toBeNull();
  });

  // ───────── loadHistory ─────────

  it('loadHistory success', () => {
    component.loadHistory();

    expect(facadeMock.setHistoryLoading).toHaveBeenCalled();
    expect(facadeMock.setHistorySuccess).toHaveBeenCalled();
  });

  it('loadHistory error', () => {
    serviceMock.getHistory.mockReturnValue(throwError(() => new Error('err')));

    component.loadHistory();

    expect(facadeMock.setHistoryError).toHaveBeenCalled();
  });

  // ───────── stats ─────────

  it('loadStats', () => {
    component.loadStats();

    expect(facadeMock.setStats).toHaveBeenCalled();
  });

  // ───────── sidebar ─────────

  it('loadSidebarHistory', () => {
    component.loadSidebarHistory();

    expect(component.sidebarHistory.length).toBeGreaterThan(0);
  });

  // ───────── sendMessage ─────────

  it('sendMessage ignore empty', () => {
    component.question = '   ';
    component.sendMessage();

    expect(facadeMock.setAsking).not.toHaveBeenCalled();
  });

  it('sendMessage success', () => {
    component.question = 'Hello';
    component.sendMessage();

    expect(facadeMock.addUserMessage).toHaveBeenCalled();
    expect(facadeMock.addLoadingMessage).toHaveBeenCalled();
  });

  it('sendMessage error', () => {
    serviceMock.ask.mockReturnValue(throwError(() => new Error('fail')));

    component.question = 'Hello';
    component.sendMessage();

    expect(facadeMock.replaceLoadingWithError).toHaveBeenCalled();
  });

  // ───────── reset ─────────

  it('resetChat', () => {
    component.resetChat();

    expect(serviceMock.reset).toHaveBeenCalled();
    expect(facadeMock.resetConversation).toHaveBeenCalled();
  });

  // ───────── suggestions ─────────

  it('suggestions length', () => {
    expect(component.suggestions.length).toBe(6);
  });
});
