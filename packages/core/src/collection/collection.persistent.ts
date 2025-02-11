import { defineConfig } from '@agile-ts/utils';
import { logCodeManager } from '../logCodeManager';
import { Collection, CollectionKey, DefaultItem, ItemKey } from './collection';
import { Group, GroupKey } from './group';
import {
  CreatePersistentConfigInterface,
  getSharedStorageManager,
  Persistent,
  PersistentKey,
  StorageKey,
} from '../storages';

export class CollectionPersistent<
  DataType extends DefaultItem = DefaultItem
> extends Persistent {
  // Collection the Persistent belongs to
  public collection: () => Collection<DataType>;

  static defaultGroupSideEffectKey = 'rebuildGroupStorageValue';
  static storageItemKeyPattern = '_${collectionKey}_item_${itemKey}';
  static storageGroupKeyPattern = '_${collectionKey}_group_${groupKey}';

  /**
   * Internal Class for managing the permanent persistence of a Collection.
   *
   * @internal
   * @param collection - Collection to be persisted.
   * @param config - Configuration object
   */
  constructor(
    collection: Collection<DataType>,
    config: CreatePersistentConfigInterface = {}
  ) {
    super(collection.agileInstance(), {
      loadValue: false,
    });
    config = defineConfig(config, {
      loadValue: true,
      storageKeys: [],
      defaultStorageKey: null as any,
    });
    this.collection = () => collection;
    this.instantiatePersistent({
      key: config.key,
      storageKeys: config.storageKeys,
      defaultStorageKey: config.defaultStorageKey,
    });

    // Load/Store persisted value/s for the first time
    if (this.ready && config.loadValue) this.initialLoading();
  }

  /**
   * Loads the persisted value into the Collection
   * or persists the Collection value in the corresponding Storage.
   * This behaviour depends on whether the Collection has been persisted before.
   *
   * @internal
   */
  public async initialLoading() {
    super.initialLoading().then(() => {
      this.collection().isPersisted = true;
    });
  }

  /**
   * Loads Collection Instances (like Items or Groups) from the corresponding Storage
   * and sets up side effects that dynamically update
   * the Storage value when the Collection (Instances) changes.
   *
   * @internal
   * @param storageItemKey - Prefix Storage key of the to load Collection Instances.
   * | default = Persistent.key |
   * @return Whether the loading of the persisted Collection Instances and setting up of the corresponding side effects was successful.
   */
  public async loadPersistedValue(
    storageItemKey?: PersistentKey
  ): Promise<boolean> {
    if (!this.ready) return false;
    const _storageItemKey = storageItemKey ?? this._key;

    // Check if Collection is already persisted
    // (indicated by the persistence of 'true' at '_storageItemKey')
    const isPersisted = await getSharedStorageManager()?.get<DataType>(
      _storageItemKey,
      this.config.defaultStorageKey as any
    );

    // Return 'false' if Collection isn't persisted yet
    if (!isPersisted) return false;

    // Helper function to load persisted values into the Collection
    const loadValuesIntoCollection = async () => {
      const defaultGroup = this.collection().getDefaultGroup();
      if (defaultGroup == null) return false;
      const defaultGroupStorageKey = CollectionPersistent.getGroupStorageKey(
        defaultGroup._key,
        _storageItemKey
      );

      // Persist default Group and load its value manually to be 100% sure
      // that it was loaded completely
      defaultGroup.loadedInitialValue = false;
      defaultGroup.persist({
        key: defaultGroupStorageKey,
        loadValue: false,
        defaultStorageKey: this.config.defaultStorageKey || undefined,
        storageKeys: this.storageKeys,
        followCollectionPersistKeyPattern: false, // Because of the dynamic 'storageItemKey', the key is already formatted above
      });
      if (defaultGroup.persistent?.ready)
        await defaultGroup.persistent.initialLoading();

      // Persist Items found in the default Group's value
      for (const itemKey of defaultGroup._value) {
        const item = this.collection().getItem(itemKey);
        const itemStorageKey = CollectionPersistent.getItemStorageKey(
          itemKey,
          _storageItemKey
        );

        // Persist an already present Item and load its value manually to be 100% sure
        // that it was loaded completely
        if (item != null) {
          item.persist({
            key: itemStorageKey,
            loadValue: false,
            defaultStorageKey: this.config.defaultStorageKey || undefined,
            storageKeys: this.storageKeys,
            followCollectionPersistKeyPattern: false, // Because of the dynamic 'storageItemKey', the key is already formatted above
          });
          if (item?.persistent?.ready) await item.persistent.initialLoading();
        }
        // Persist an already present placeholder Item
        // or create a new placeholder Item to load the value in
        // and load its value manually to be 100% sure
        // that it was loaded completely.
        // After a successful loading assign the now valid Item to the Collection.
        else {
          const placeholderItem = this.collection().getItemWithReference(
            itemKey
          );
          placeholderItem?.persist({
            key: itemStorageKey,
            loadValue: false,
            defaultStorageKey: this.config.defaultStorageKey as any,
            storageKeys: this.storageKeys,
            followCollectionPersistKeyPattern: false, // Because of the dynamic 'storageItemKey', the key is already formatted above
          });
          if (placeholderItem?.persistent?.ready) {
            const loadedPersistedValueIntoItem = await placeholderItem.persistent.loadPersistedValue();

            // If successfully loaded Item value, assign Item to Collection
            if (loadedPersistedValueIntoItem) {
              this.collection().assignItem(placeholderItem, {
                overwrite: true, // Overwrite to overwrite the existing placeholder Item, if one exists
                rebuildGroups: false, // Not necessary since the Groups that include the to assign Item were already rebuild while assigning the loaded value to the Item via 'loadPersistedValue()'
              });

              placeholderItem.isPersisted = true;

              // Manually increase Collection size,
              // since these Items already exist in the Collection (because of 'getItemWithReference()')
              // but were placeholder before the persisted value got loaded
              // -> Collection size wasn't increased in 'assignItem()'
              this.collection().size += 1;
            }
          }
        }
      }

      defaultGroup.loadedInitialValue = true;
      return true;
    };
    const success = await loadValuesIntoCollection();

    // Setup side effects to keep the Storage value in sync
    // with the Collection (Instances) value
    if (success) this.setupSideEffects(_storageItemKey);

    return success;
  }

  /**
   * Persists Collection Instances (like Items or Groups) in the corresponding Storage
   * and sets up side effects that dynamically update
   * the Storage value when the Collection (Instances) changes.
   *
   * @internal
   * @param storageItemKey - Prefix Storage key of the to persist Collection Instances.
   * | default = Persistent.key |
   * @return Whether the persisting of the Collection Instances and the setting up of the corresponding side effects was successful.
   */
  public async persistValue(storageItemKey?: PersistentKey): Promise<boolean> {
    if (!this.ready) return false;
    const _storageItemKey = storageItemKey ?? this._key;
    const defaultGroup = this.collection().getDefaultGroup();
    if (defaultGroup == null) return false;
    const defaultGroupStorageKey = CollectionPersistent.getGroupStorageKey(
      defaultGroup._key,
      _storageItemKey
    );

    // Set flag in Storage to indicate that the Collection is persisted
    getSharedStorageManager()?.set(_storageItemKey, true, this.storageKeys);

    // Persist default Group
    defaultGroup.persist({
      key: defaultGroupStorageKey,
      defaultStorageKey: this.config.defaultStorageKey || undefined,
      storageKeys: this.storageKeys,
      followCollectionPersistKeyPattern: false, // Because of the dynamic 'storageItemKey', the key is already formatted above
    });

    // Persist Items found in the default Group's value
    for (const itemKey of defaultGroup._value) {
      const item = this.collection().getItem(itemKey);
      const itemStorageKey = CollectionPersistent.getItemStorageKey(
        itemKey,
        _storageItemKey
      );
      item?.persist({
        key: itemStorageKey,
        defaultStorageKey: this.config.defaultStorageKey || undefined,
        storageKeys: this.storageKeys,
        followCollectionPersistKeyPattern: false, // Because of the dynamic 'storageItemKey', the key is already formatted above
      });
    }

    // Setup side effects to keep the Storage value in sync
    // with the Collection (Instances) value
    this.setupSideEffects(_storageItemKey);

    this.isPersisted = true;
    return true;
  }

  /**
   * Sets up side effects to keep the Storage value in sync
   * with the Collection (Instances) value.
   *
   * @internal
   * @param storageItemKey - Prefix Storage key of the to remove Collection Instances.
   * | default = Persistent.key |
   */
  public setupSideEffects(storageItemKey?: PersistentKey): void {
    const _storageItemKey = storageItemKey ?? this._key;
    const defaultGroup = this.collection().getDefaultGroup();
    if (defaultGroup == null) return;

    // Add side effect to the default Group
    // that adds and removes Items from the Storage based on the Group value
    defaultGroup.addSideEffect<typeof defaultGroup>(
      CollectionPersistent.defaultGroupSideEffectKey,
      (instance) => this.rebuildStorageSideEffect(instance, _storageItemKey),
      { weight: 0 }
    );
  }

  /**
   * Removes the Collection from the corresponding Storage.
   * -> Collection is no longer persisted
   *
   * @internal
   * @param storageItemKey - Prefix Storage key of the persisted Collection Instances.
   * | default = Persistent.key |
   * @return Whether the removal of the Collection Instances was successful.
   */
  public async removePersistedValue(
    storageItemKey?: PersistentKey
  ): Promise<boolean> {
    if (!this.ready) return false;
    const _storageItemKey = storageItemKey ?? this._key;
    const defaultGroup = this.collection().getDefaultGroup();
    if (!defaultGroup) return false;
    const defaultGroupStorageKey = CollectionPersistent.getGroupStorageKey(
      defaultGroup._key,
      _storageItemKey
    );

    // Remove Collection is persisted indicator flag from Storage
    getSharedStorageManager()?.remove(_storageItemKey, this.storageKeys);

    // Remove default Group from the Storage
    defaultGroup.persistent?.removePersistedValue(defaultGroupStorageKey);
    defaultGroup.removeSideEffect(
      CollectionPersistent.defaultGroupSideEffectKey
    );

    // Remove Items found in the default Group's value from the Storage
    for (const itemKey of defaultGroup._value) {
      const item = this.collection().getItem(itemKey);
      const itemStorageKey = CollectionPersistent.getItemStorageKey(
        itemKey,
        _storageItemKey
      );
      item?.persistent?.removePersistedValue(itemStorageKey);
    }

    this.isPersisted = false;
    return true;
  }

  /**
   * Formats the specified key so that it can be used as a valid Storage key
   * and returns the formatted variant of it.
   *
   * If no formatable key (`undefined`/`null`) was provided,
   * an attempt is made to use the Collection identifier key as Storage key.
   *
   * @internal
   * @param key - Storage key to be formatted.
   */
  public formatKey(key: StorageKey | undefined | null): StorageKey | undefined {
    if (key == null && this.collection()._key) return this.collection()._key;
    if (key == null) return;
    if (this.collection()._key == null) this.collection()._key = key;
    return key;
  }

  /**
   * Adds and removes Items from the Storage based on the Group value.
   *
   * @internal
   * @param group - Group whose Items are to be dynamically added or removed from the Storage.
   * @param storageItemKey - Prefix Storage key of the persisted Collection Instances.
   * | default = Persistent.key |
   */
  public rebuildStorageSideEffect(
    group: Group<DataType>,
    storageItemKey?: PersistentKey
  ) {
    const collection = group.collection();
    const _storageItemKey = storageItemKey || collection.persistent?._key;

    // Return if no Item got added or removed
    // because then the changed Item performs the Storage update itself
    if (group.previousStateValue.length === group._value.length) return;

    // Extract Item keys that got added or removed from the Group
    const addedKeys = group._value.filter(
      (key) => !group.previousStateValue.includes(key)
    );
    const removedKeys = group.previousStateValue.filter(
      (key) => !group._value.includes(key)
    );

    // Persist newly added Items
    addedKeys.forEach((itemKey) => {
      const item = collection.getItem(itemKey);
      const itemStorageKey = CollectionPersistent.getItemStorageKey(
        itemKey,
        _storageItemKey
      );
      if (item != null && !item.isPersisted)
        item.persist({
          key: itemStorageKey,
          defaultStorageKey: this.config.defaultStorageKey || undefined,
          storageKeys: this.storageKeys,
          followCollectionPersistKeyPattern: false, // Because of the dynamic 'storageItemKey', the key is already formatted above
        });
    });

    // Remove removed Items from the Storage
    removedKeys.forEach((itemKey) => {
      const item = collection.getItem(itemKey);
      const itemStorageKey = CollectionPersistent.getItemStorageKey(
        itemKey,
        _storageItemKey
      );
      if (item != null && item.isPersisted)
        item.persistent?.removePersistedValue(itemStorageKey);
    });
  }

  /**
   * Builds valid Item Storage key based on the 'Collection Item Persist Pattern'.
   *
   * @internal
   * @param itemKey - Key identifier of Item
   * @param collectionKey - Key identifier of Collection
   */
  public static getItemStorageKey(
    itemKey: ItemKey | undefined | null,
    collectionKey: CollectionKey | undefined | null
  ): string {
    if (itemKey == null || collectionKey == null)
      logCodeManager.log('1A:02:00');
    if (itemKey == null) itemKey = 'unknown';
    if (collectionKey == null) collectionKey = 'unknown';
    return this.storageItemKeyPattern
      .replace('${collectionKey}', collectionKey.toString())
      .replace('${itemKey}', itemKey.toString());
  }

  /**
   * Builds valid Item Storage key based on the 'Collection Group Persist Pattern'.
   *
   * @internal
   * @param groupKey - Key identifier of Group
   * @param collectionKey - Key identifier of Collection
   */
  public static getGroupStorageKey(
    groupKey: GroupKey | undefined | null,
    collectionKey: CollectionKey | undefined | null
  ): string {
    if (groupKey == null || collectionKey == null)
      logCodeManager.log('1A:02:01');
    if (groupKey == null) groupKey = 'unknown';
    if (collectionKey == null) collectionKey = 'unknown';
    return this.storageGroupKeyPattern
      .replace('${collectionKey}', collectionKey.toString())
      .replace('${groupKey}', groupKey.toString());
  }
}
