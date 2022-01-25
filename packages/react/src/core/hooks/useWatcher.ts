import React from 'react';
import { StateWatcherCallback, Watchable } from '@agile-ts/core';

export function useWatcher<T = any>(
  state: Watchable,
  callback: StateWatcherCallback<T>
): void {
  React.useEffect(() => {
    const generatedKey = state.watch(callback);
    return () => {
      state.removeWatcher(generatedKey);
    };
  }, []);
}
