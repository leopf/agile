import {
  CreatePersistentConfigInterface,
  defineConfig,
  Persistent,
  PersistentKey,
  State,
  StorageKey,
} from "../internal";

export class StatePersistent<ValueType = any> extends Persistent {
  private stateSideEffectKey = "rebuildStateStorageValue";
  public state: () => State;

  /**
   * @internal
   * State Persist Manager - Handles permanent storing of State Value
   * @param state - State that gets stored
   * @param config - Config
   */
  constructor(
    state: State<ValueType>,
    config: CreatePersistentConfigInterface = {}
  ) {
    super(state.agileInstance(), {
      instantiate: false,
    });
    config = defineConfig(config, {
      instantiate: true,
      storageKeys: [],
    });
    this.state = () => state;
    this.instantiatePersistent({
      key: config.key,
      storageKeys: config.storageKeys,
    });

    // Load/Store persisted Value for the first Time
    if (this.ready && config.instantiate) this.initialLoading();
  }

  //=========================================================================================================
  // Set Key
  //=========================================================================================================
  /**
   * @internal
   * Sets Key/Name of Persistent
   * @param value - New Key/Name of Persistent
   */
  public async setKey(value?: StorageKey): Promise<void> {
    const oldKey = this._key;
    const wasReady = this.ready;

    // Assign Key
    if (value === this._key) return;
    this._key = value || Persistent.placeHolderKey;

    const isValid = this.validatePersistent();

    // Try to Initial Load Value if persistent wasn't ready
    if (!wasReady) {
      if (isValid) this.initialLoading();
      return;
    }

    // Remove value at old Key
    await this.removePersistedValue(oldKey);

    // Assign Value to new Key
    if (isValid) await this.persistValue(value);
  }

  //=========================================================================================================
  // Initial Loading
  //=========================================================================================================
  /**
   * @internal
   * Loads/Saves Storage Value for the first Time
   */
  public async initialLoading() {
    super.initialLoading().then(() => {
      this.state().isPersisted = true;
    });
  }

  //=========================================================================================================
  // Load Persisted Value
  //=========================================================================================================
  /**
   * @internal
   * Loads State from the Storage
   * @return Value got loaded
   */
  public async loadPersistedValue(key?: PersistentKey): Promise<boolean> {
    if (!this.ready) return false;
    const _key = key || this.key;

    // Load Value from default Storage
    const loadedValue = await this.agileInstance().storages.get<ValueType>(
      _key,
      this.defaultStorageKey
    );
    if (!loadedValue) return false;

    // Assign loaded Value to State
    this.state().set(loadedValue, { storage: false });

    // Persist State, so that the Storage Value updates dynamically if the State updates
    await this.persistValue(_key);

    return true;
  }

  //=========================================================================================================
  // Persist Value
  //=========================================================================================================
  /**
   * @internal
   * Sets everything up so that the State gets saved in the Storage
   * @return Success?
   */
  public async persistValue(key?: PersistentKey): Promise<boolean> {
    if (!this.ready) return false;
    const _key = key || this.key;

    // Add sideEffect to State that updates the Storage Value depending on the State Value
    this.state().addSideEffect(this.stateSideEffectKey, (config) => {
      this.rebuildStorageSideEffect(this.state(), _key, config);
    });
    this.rebuildStorageSideEffect(this.state(), _key);

    this.isPersisted = true;
    return true;
  }

  //=========================================================================================================
  // Remove Persisted Value
  //=========================================================================================================
  /**
   * @internal
   * Removes Value form Storage
   * @return Success?
   */
  public async removePersistedValue(key?: PersistentKey): Promise<boolean> {
    if (!this.ready) return false;
    const _key = key || this.key;

    // Remove SideEffect
    this.state().removeSideEffect(this.stateSideEffectKey);

    // Remove Value from Storage
    this.agileInstance().storages.remove(_key, this.storageKeys);

    this.isPersisted = false;
    return true;
  }

  //=========================================================================================================
  // Format Key
  //=========================================================================================================
  /**
   * @internal
   * Formats Storage Key
   * @param key - Key that gets formatted
   */
  public formatKey(key?: PersistentKey): PersistentKey | undefined {
    const state = this.state();

    // Get key from State
    if (!key && state.key) return state.key;

    if (!key) return;

    // Set State Key to Storage Key if State has no key
    if (!state.key) state.key = key;

    return key;
  }

  //=========================================================================================================
  // Rebuild Storage SideEffect
  //=========================================================================================================
  /**
   * @internal
   * Rebuilds Storage depending on State Value
   * @param state - State that value gets updated
   * @param key - Key/Name of Persistent
   * @param config - Config
   */
  private rebuildStorageSideEffect(
    state: State<ValueType>,
    key: PersistentKey,
    config: any = {}
  ) {
    if (config.storage !== undefined && !config.storage) return;

    this.agileInstance().storages.set(
      key,
      this.state().getPersistableValue(),
      this.storageKeys
    );
  }
}
