import {
  Agile,
  Collection,
  CollectionKey,
  CreatePersistentConfigInterface,
  defineConfig,
  Group,
  GroupKey,
  ItemKey,
  Persistent,
  PersistentKey,
  StorageKey,
} from "../internal";

export class CollectionPersistent<DataType = any> extends Persistent {
  public collection: () => Collection<DataType>;
  private defaultGroupSideEffectKey = "rebuildGroupStorageValue";

  public static storageItemKeyPattern = "_${collectionKey}_item_${itemKey}";
  public static storageGroupKeyPattern = "_${collectionKey}_group_${groupKey}";

  /**
   * @internal
   * Collection Persist Manager - Handles permanent storing of Collection Value
   * @param collection - Collection that gets stored
   * @param config - Config
   */
  constructor(
    collection: Collection<DataType>,
    config: CreatePersistentConfigInterface = {}
  ) {
    super(collection.agileInstance(), {
      instantiate: false,
    });
    config = defineConfig(config, {
      instantiate: true,
    });
    this.collection = () => collection;
    this.instantiatePersistent(config);

    // Load/Store persisted Value/s for the first Time
    if (this.ready && config.instantiate) this.initialLoading();
  }

  //=========================================================================================================
  // Set Key
  //=========================================================================================================
  /**
   * @public
   * Sets Key/Name of Persistent
   * @param value - New Key/Name of Persistent
   */
  public async setKey(value: StorageKey) {
    const oldKey = this._key;
    const wasReady = this.ready;

    // Assign Key
    if (value === this._key) return;
    this._key = value;

    const isValid = this.validatePersistent();

    // Try to Initial Load Value if persistent wasn't ready
    if (!wasReady && isValid) {
      this.initialLoading();
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
      this.collection().isPersisted = true;
    });
  }

  //=========================================================================================================
  // Load Persisted Value
  //=========================================================================================================
  /**
   * @internal
   * Loads Collection from Storage
   * @return Success?
   */
  public async loadPersistedValue(key?: PersistentKey): Promise<boolean> {
    if (!this.ready) return false;
    const _key = key || this.key;

    // Check if Collection is Persisted
    const isPersisted = await this.agileInstance().storages.get<DataType>(
      _key,
      this.defaultStorageKey
    );
    if (!isPersisted) return false;

    // Loads Values into Collection
    const loadValuesIntoCollection = async () => {
      // Get Default Group
      const defaultGroup = this.collection().getGroup(
        this.collection().config.defaultGroupKey
      );
      if (!defaultGroup) return false;

      // Persist Default Group and load its Value manually to be 100% sure it got loaded
      defaultGroup.persist({
        instantiate: false,
        followCollectionPattern: true,
      });
      if (defaultGroup.persistent?.ready) {
        await defaultGroup.persistent?.initialLoading();
        defaultGroup.isPersisted = true;
      }

      // Load Items into Collection
      for (let itemKey of defaultGroup.value) {
        const itemStorageKey = CollectionPersistent.getItemStorageKey(
          itemKey,
          this.collection().key
        );

        // Get Storage Value
        const storageValue = await this.agileInstance().storages.get<DataType>(
          itemStorageKey,
          this.defaultStorageKey
        );
        if (!storageValue) continue;

        // Collect found Storage Value
        this.collection().collect(storageValue);
      }
    };
    await loadValuesIntoCollection();

    // Persist Collection, so that the Storage Value updates dynamically if the Collection updates
    await this.persistValue(_key);

    return true;
  }

  //=========================================================================================================
  // Persist Value
  //=========================================================================================================
  /**
   * @internal
   * Sets everything up so that the Collection gets saved in the Storage
   * @return Success?
   */
  public async persistValue(key?: PersistentKey): Promise<boolean> {
    if (!this.ready) return false;
    const _key = key || this.key;

    // Set Collection to Persisted (in Storage)
    this.agileInstance().storages.set(_key, true, this.storageKeys);

    // Get default Group
    const defaultGroup = this.collection().getGroup(
      this.collection().config.defaultGroupKey
    );
    if (!defaultGroup) return false;

    // Persist default Group
    defaultGroup.persist({ followCollectionPattern: true });

    // Add sideEffect to default Group which adds and removes Items from the Storage depending on the Group Value
    defaultGroup.addSideEffect(this.defaultGroupSideEffectKey, () =>
      this.rebuildStorageSideEffect(defaultGroup)
    );

    // Persist Collection Items
    for (let itemKey of defaultGroup.value) {
      const item = this.collection().getItem(itemKey);
      const itemStorageKey = CollectionPersistent.getItemStorageKey(
        itemKey,
        this.collection().key
      );
      item?.persist(itemStorageKey);
    }

    this.isPersisted = true;
    return true;
  }

  //=========================================================================================================
  // Remove Persisted Value
  //=========================================================================================================
  /**
   * @internal
   * Removes Collection from the Storage
   * @return Success?
   */
  public async removePersistedValue(key?: PersistentKey): Promise<boolean> {
    if (!this.ready) return false;
    const _key = key || this.key;

    // Set Collection to not Persisted
    this.agileInstance().storages.remove(_key, this.storageKeys);

    // Get default Group
    const defaultGroup = this.collection().getGroup(
      this.collection().config.defaultGroupKey
    );
    if (!defaultGroup) return false;

    // Remove default Group from Storage
    defaultGroup.persistent?.removePersistedValue();

    // Remove Rebuild Storage sideEffect from default Group
    defaultGroup.removeSideEffect(this.defaultGroupSideEffectKey);

    // Remove Collection Items from Storage
    for (let itemKey of defaultGroup.value) {
      const item = this.collection().getItem(itemKey);
      item?.persistent?.removePersistedValue();
    }

    this.isPersisted = false;
    return false;
  }

  //=========================================================================================================
  // Format Key
  //=========================================================================================================
  /**
   * @internal
   * Formats Storage Key
   * @param key - Key that gets formatted
   */
  public formatKey(key?: StorageKey): StorageKey | undefined {
    const collection = this.collection();

    // Get key from Collection
    if (!key && collection.key) return collection.key;

    if (!key) return;

    // Set Storage Key to Collection Key if Collection has no key
    if (!collection.key) collection.key = key;

    return key;
  }

  //=========================================================================================================
  // Rebuild Storage SideEffect
  //=========================================================================================================
  /**
   * @internal
   * Rebuilds Storage depending on Group
   * @param group - Group
   */
  private rebuildStorageSideEffect(group: Group<DataType>) {
    const collection = group.collection();

    // Return if only one ItemKey got updated, because the Group value hasn't changed
    if (group.previousStateValue.length === group.value.length) return;

    const addedKeys = group.value.filter(
      (key) => !group.previousStateValue.includes(key)
    );
    const removedKeys = group.previousStateValue.filter(
      (key) => !group.value.includes(key)
    );

    // Persist Added Keys
    addedKeys.forEach((itemKey) => {
      const item = collection.getItem(itemKey);
      if (!item?.isPersisted)
        item?.persist(
          CollectionPersistent.getItemStorageKey(itemKey, collection.key)
        );
    });

    // Unpersist removed Keys
    removedKeys.forEach((itemKey) => {
      const item = collection.getItem(itemKey);
      if (item?.isPersisted) item?.persistent?.removePersistedValue();
    });
  }

  //=========================================================================================================
  // Get Item Storage Key
  //=========================================================================================================
  /**
   * @internal
   * Build Item StorageKey with Collection Persist Pattern
   * @param itemKey - Key of Item
   * @param collectionKey - Key of Collection
   */
  public static getItemStorageKey(
    itemKey?: ItemKey,
    collectionKey?: CollectionKey
  ): string {
    if (!itemKey) {
      Agile.logger.error("Failed to build Item StorageKey");
      itemKey = "unknown";
    }
    if (!collectionKey) {
      Agile.logger.error("Failed to build Item StorageKey");
      collectionKey = "unknown";
    }
    return this.storageItemKeyPattern
      .replace("${collectionKey}", collectionKey.toString())
      .replace("${itemKey}", itemKey.toString());
  }

  //=========================================================================================================
  // Get Group Storage Key
  //=========================================================================================================
  /**
   * @internal
   * Build Group StorageKey with Collection Persist Pattern
   * @param groupKey - Key of Group
   * @param collectionKey - Key of Collection
   */
  public static getGroupStorageKey(
    groupKey?: GroupKey,
    collectionKey?: CollectionKey
  ): string {
    if (!groupKey) {
      Agile.logger.error("Failed to build Group StorageKey");
      groupKey = "unknown";
    }
    if (!collectionKey) {
      Agile.logger.error("Failed to build Group StorageKey");
      collectionKey = "unknown";
    }
    return this.storageGroupKeyPattern
      .replace("${collectionKey}", collectionKey.toString())
      .replace("${groupKey}", groupKey.toString());
  }
}
