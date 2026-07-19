import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { map, distinctUntilChanged } from 'rxjs/operators';
import { LoadingStatus, Message, RhAssistantState, Stats } from '../models/rh-assistant.model';
import { RhAssistantMapper } from '../mappers/rh-assistant.mapper';

const initialState: RhAssistantState = {
  messages: [],
  conversationId: null,
  createdAt: null,
  stats: null,
  status: 'idle',
  historyStatus: 'idle',
  statsStatus: 'idle',
  error: null,
  inputValue: '',
  showSidebar: true,
};

@Injectable({ providedIn: 'root' })
export class RhAssistantFacade {
  private readonly _state$ = new BehaviorSubject<RhAssistantState>(initialState);

  readonly state$: Observable<RhAssistantState> = this._state$.asObservable();
  readonly messages$: Observable<Message[]> = this.select((s) => s.messages);
  readonly stats$: Observable<Stats | null> = this.select((s) => s.stats);
  readonly status$: Observable<LoadingStatus> = this.select((s) => s.status);
  readonly historyStatus$: Observable<LoadingStatus> = this.select((s) => s.historyStatus);
  readonly error$: Observable<string | null> = this.select((s) => s.error);
  readonly inputValue$: Observable<string> = this.select((s) => s.inputValue);
  readonly conversationId$: Observable<number | null> = this.select((s) => s.conversationId);
  readonly showSidebar$: Observable<boolean> = this.select((s) => s.showSidebar);

  readonly isLoading$: Observable<boolean> = this.select((s) => s.status === 'loading');

  readonly hasMessages$: Observable<boolean> = this.select((s) => s.messages.length > 0);

  get snapshot(): RhAssistantState {
    return this._state$.getValue();
  }

  private patch(partial: Partial<RhAssistantState>): void {
    this._state$.next({ ...this.snapshot, ...partial });
  }

  private select<T>(selector: (state: RhAssistantState) => T): Observable<T> {
    return this._state$.pipe(map(selector), distinctUntilChanged());
  }

  setHistoryLoading(): void {
    this.patch({ historyStatus: 'loading', error: null });
  }

  setHistorySuccess(messages: Message[], conversationId: number, createdAt: Date): void {
    this.patch({ messages, conversationId, createdAt, historyStatus: 'success' });
  }

  setHistoryError(error: string): void {
    this.patch({ historyStatus: 'error', error });
  }

  setAsking(): void {
    this.patch({ status: 'loading', error: null, inputValue: '' });
  }

  addUserMessage(content: string): void {
    const msg = RhAssistantMapper.createUserMessage(content);
    this.patch({ messages: [...this.snapshot.messages, msg] });
  }

  addLoadingMessage(): void {
    const msg = RhAssistantMapper.createLoadingMessage();
    this.patch({ messages: [...this.snapshot.messages, msg] });
  }

  replaceLoadingWithResponse(message: Message): void {
    const messages = [...this.snapshot.messages];
    const idx = messages.reduce((last, m, i) => (m.isLoading ? i : last), -1);
    if (idx !== -1) messages[idx] = message;
    this.patch({ messages, status: 'success' });
  }

  replaceLoadingWithError(): void {
    const messages = [...this.snapshot.messages];
    const idx = messages.reduce((last, m, i) => (m.isLoading ? i : last), -1);
    if (idx !== -1) messages[idx] = RhAssistantMapper.createErrorMessage();
    this.patch({ messages, status: 'error', error: 'Erreur de communication.' });
  }

  setStats(stats: Stats): void {
    this.patch({ stats, statsStatus: 'success' });
  }

  setInputValue(value: string): void {
    this.patch({ inputValue: value });
  }

  setConversationId(id: number): void {
    this.patch({ conversationId: id });
  }

  resetConversation(): void {
    this.patch({
      messages: [],
      conversationId: null,
      createdAt: null,
      status: 'idle',
      error: null,
    });
  }

  toggleSidebar(): void {
    this.patch({ showSidebar: !this.snapshot.showSidebar });
  }
}
