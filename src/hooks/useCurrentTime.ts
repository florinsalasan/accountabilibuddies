import { useSyncExternalStore } from 'react';
import { useGoalStore } from '../store/useGoalStore.ts';

let currentTime = Date.now();
const listeners = new Set<() => void>();

function tickClock() {
  currentTime = Date.now();
  listeners.forEach((listener) => listener());
}

if (typeof setInterval !== 'undefined') {
  setInterval(tickClock, 30_000);
}

function subscribe(callback: () => void) {
  listeners.add(callback);
  return () => {
    listeners.delete(callback);
  };
}

function getSnapshot() {
  return currentTime;
}

/**
 * React 19 pure clock hook using useSyncExternalStore.
 */
export function useCurrentTime(): number {
  const simulatedOffset = useGoalStore((s) => s.simulatedTimeOffsetMs);
  const time = useSyncExternalStore(subscribe, getSnapshot);
  return time + simulatedOffset;
}
