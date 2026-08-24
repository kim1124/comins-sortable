import { SortableError } from './errors.js';
import type {
  AfterDragReason,
  PointerSnapshot,
  SortableChange,
  SortableId,
  SortableLocation,
} from './model.js';

export interface PendingSession {
  pointerId: number;
  pointerType: PointerSnapshot['type'];
  itemId: SortableId;
  source: SortableLocation;
  origin: PointerSnapshot;
}

export interface ActiveSession extends PendingSession {
  pointer: PointerSnapshot;
  destination: SortableLocation | null;
}

export type SessionState =
  | { status: 'idle' }
  | { status: 'pending'; value: PendingSession }
  | { status: 'dragging'; value: ActiveSession }
  | { status: 'committing'; value: ActiveSession; change: SortableChange }
  | { status: 'cancelling'; value: ActiveSession; reason: AfterDragReason };

export type SessionStatus = SessionState['status'];

export class SessionMachine {
  private current: SessionState = { status: 'idle' };
  readonly history: SessionStatus[] = ['idle'];

  get state(): SessionState {
    return this.current;
  }

  pending(value: PendingSession): void {
    this.stateWithStatus('idle');
    this.transition({ status: 'pending', value });
  }

  activate(value: ActiveSession): void {
    this.stateWithStatus('pending');
    this.transition({ status: 'dragging', value });
  }

  commit(change: SortableChange): void {
    const dragging = this.stateWithStatus('dragging');
    this.transition({ status: 'committing', value: dragging.value, change });
  }

  cancel(reason: AfterDragReason): void {
    const dragging = this.stateWithStatus('dragging');
    this.transition({ status: 'cancelling', value: dragging.value, reason });
  }

  finish(): void {
    if (this.current.status !== 'committing' && this.current.status !== 'cancelling') {
      throw new SortableError('INVALID_OPTION');
    }
    this.transition({ status: 'idle' });
  }

  abandon(): void {
    if (this.current.status === 'idle') {
      return;
    }
    this.stateWithStatus('pending');
    this.transition({ status: 'idle' });
  }

  private stateWithStatus<T extends SessionStatus>(
    status: T,
  ): Extract<SessionState, { status: T }> {
    if (this.current.status !== status) {
      throw new SortableError('INVALID_OPTION');
    }
    return this.current as Extract<SessionState, { status: T }>;
  }

  private transition(state: SessionState): void {
    this.current = state;
    this.history.push(state.status);
  }
}
