export type StateWatcherCallback<T = any> = (value: T, key: string) => void;

export interface Watchable<ValueType = any> {
    /**
   * Fires on each State value change.
   *
   * Returns the key/name identifier of the created watcher callback.
   *
   * [Learn more..](https://agile-ts.org/docs/core/state/methods/#watch)
   *
   * @public
   * @param callback - A function to be executed on each State value change.
   */
  watch(callback: StateWatcherCallback<ValueType>): string;
  /**
   * Fires on each State value change.
   *
   * [Learn more..](https://agile-ts.org/docs/core/state/methods/#watch)
   *
   * @public
   * @param key - Key/Name identifier of the watcher callback.
   * @param callback - A function to be executed on each State value change.
   */
  watch(key: string, callback: StateWatcherCallback<ValueType>): this;
  watch(
    keyOrCallback: string | StateWatcherCallback<ValueType>,
    callback?: StateWatcherCallback<ValueType>
  ): this | string;

  /**
   * Removes a watcher callback with the specified key/name identifier from the State.
   *
   * [Learn more..](https://agile-ts.org/docs/core/state/methods/#removewatcher)
   *
   * @public
   * @param key - Key/Name identifier of the watcher callback to be removed.
   */
  removeWatcher(key: string): this;
}