import type { InputAdapter, InputEvent, InputState } from '../types';

/** Taps come from the UI; the adapter only fans them out. Always running. */
export interface TapInputAdapter extends InputAdapter {
  emit(event: Omit<InputEvent, 'confidence' | 'at'> & Partial<Pick<InputEvent, 'at'>>): void;
}

export function createTapInput(now: () => number = () => performance.now()): TapInputAdapter {
  const listeners = new Set<(e: InputEvent) => void>();
  return {
    id: 'tap',
    state: 'running' as InputState,
    error: null,
    start: () => Promise.resolve(),
    stop() {},
    onEvent(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    onStateChange() {
      return () => undefined;
    },
    emit(event) {
      const full: InputEvent = { ...event, kind: 'tap', confidence: 1, at: event.at ?? now() };
      listeners.forEach((l) => l(full));
    },
  };
}
