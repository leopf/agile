import {
  State,
  Collection,
  DefaultItem,
  ItemKey,
  defineConfig,
  normalizeArray,
  Item,
  copy,
  CollectionPersistent,
  StatePersistentConfigInterface,
  isValidObject,
  PersistentKey,
  ComputedTracker,
  StateRuntimeJobConfigInterface,
  StateIngestConfigInterface,
  removeProperties,
  LogCodeManager,
} from '../internal';

export class Group<DataType extends Object = DefaultItem> extends State<
  Array<ItemKey>
> {
  static rebuildGroupSideEffectKey = 'rebuildGroup';
  collection: () => Collection<DataType>;

  _output: Array<DataType> = []; // Output of Group
  _items: Array<() => Item<DataType>> = []; // Items of Group
  notFoundItemKeys: Array<ItemKey> = []; // Contains all itemKeys that couldn't be found in the Collection

  /**
   * An extension of the State Class that categorizes and preserves the ordering of structured data.
   * It allows us to cluster together data from a Collection as an array of Item keys.
   *
   * Note that a Group doesn't store the actual Items. It only keeps track of the Item keys
   * and retrieves the fitting Items when needed.
   *
   * [Learn more..](https://agile-ts.org/docs/core/collection/group/)
   *
   * @public
   * @param collection - Collection to which the Item belongs.
   * @param initialItems - Identifiers of the Items to be clustered by the Group.
   * @param config - Configuration object
   */
  constructor(
    collection: Collection<DataType>,
    initialItems?: Array<ItemKey>,
    config: GroupConfigInterface = {}
  ) {
    super(collection.agileInstance(), initialItems || [], config);
    this.collection = () => collection;

    // Add the 'Rebuild Group' action to the Group side effects
    // in order to rebuild the Group whenever its value changes
    this.addSideEffect(Group.rebuildGroupSideEffectKey, () => this.rebuild());

    // Initial rebuild
    this.rebuild();
  }

  /**
   * Retrieves values of the Items clustered by the Group.
   *
   * @public
   */
  public get output(): Array<DataType> {
    ComputedTracker.tracked(this.observer);
    return copy(this._output);
  }

  public set output(value: DataType[]) {
    LogCodeManager.log('1C:03:00', [this._key]);
  }

  /**
   * Retrieves Items clustered by the Group.
   *
   * @public
   */
  public get items(): Array<Item<DataType>> {
    ComputedTracker.tracked(this.observer);
    return this._items.map((item) => item());
  }

  public set items(value: Array<Item<DataType>>) {
    LogCodeManager.log('1C:03:01', [this._key]);
  }

  /**
   *
   * Returns a boolean indicating whether an Item with the specified `itemKey`
   * is clustered in the Group or not.
   *
   * [Learn more..](https://agile-ts.org/docs/core/collection/group/methods/#has)
   *
   * @public
   * @param itemKey - Key/Name identifier of the Item.
   */
  public has(itemKey: ItemKey) {
    return this.value.findIndex((key) => key === itemKey) !== -1;
  }

  /**
   * Returns the count of the Items clustered in the Group.
   *
   * [Learn more..](https://agile-ts.org/docs/core/collection/group/properties#size)
   *
   * @public
   */
  public get size(): number {
    return this.value.length;
  }

  /**
   * Removes an Item with the specified key/name identifier from the Group,
   * if it exists in the Group.
   *
   * [Learn more..](https://agile-ts.org/docs/core/collection/group/methods#remove)
   *
   * @public
   * @param itemKeys - Key/Name identifier/s of the Item/s to be removed.
   * @param config - Configuration object
   */
  public remove(
    itemKeys: ItemKey | ItemKey[],
    config: StateIngestConfigInterface = {}
  ): this {
    const _itemKeys = normalizeArray<ItemKey>(itemKeys);
    const notExistingItemKeysInCollection: Array<ItemKey> = [];
    const notExistingItemKeys: Array<ItemKey> = [];
    let newGroupValue = copy(this.nextStateValue);

    // Remove itemKeys from Group
    _itemKeys.forEach((itemKey) => {
      // Check if itemKey exists in Group
      if (!newGroupValue.includes(itemKey)) {
        notExistingItemKeys.push(itemKey);
        notExistingItemKeysInCollection.push(itemKey);
        return;
      }

      // Check if itemKey exists in Collection
      if (!this.collection().getItem(itemKey))
        notExistingItemKeysInCollection.push(itemKey);

      // Remove itemKey from Group
      newGroupValue = newGroupValue.filter((key) => key !== itemKey);
    });

    // Return if none of the specified itemKeys exists
    if (notExistingItemKeys.length >= _itemKeys.length) return this;

    // If all removed itemKeys don't exist in the Collection
    // -> no rerender necessary since the output won't change
    if (notExistingItemKeysInCollection.length >= _itemKeys.length)
      config.background = true;

    this.set(newGroupValue, config);

    return this;
  }

  /**
   * Appends new Item/s to the end of the Group.
   *
   * [Learn more..](https://agile-ts.org/docs/core/collection/group/methods#add)
   *
   * @public
   * @param itemKeys - Key/Name identifier/s of Item/s to be added.
   * @param config - Configuration object
   */
  public add(
    itemKeys: ItemKey | ItemKey[],
    config: GroupAddConfigInterface = {}
  ): this {
    const _itemKeys = normalizeArray<ItemKey>(itemKeys);
    const notExistingItemKeysInCollection: Array<ItemKey> = [];
    const existingItemKeys: Array<ItemKey> = [];
    let newGroupValue = copy(this.nextStateValue);
    config = defineConfig<GroupAddConfigInterface>(config, {
      method: 'push',
      overwrite: false,
    });

    // Add itemKeys to Group
    _itemKeys.forEach((itemKey) => {
      // Check if itemKey exists in Collection
      if (!this.collection().getItem(itemKey))
        notExistingItemKeysInCollection.push(itemKey);

      // Remove itemKey from Group if it should be overwritten and already exists
      if (this.has(itemKey)) {
        if (config.overwrite) {
          newGroupValue = newGroupValue.filter((key) => key !== itemKey);
        } else {
          existingItemKeys.push(itemKey);
          return;
        }
      }

      // Add new itemKey to Group
      newGroupValue[config.method || 'push'](itemKey);
    });

    // Return if all specified itemKeys already exist
    if (existingItemKeys.length >= _itemKeys.length) return this;

    // If all added itemKeys don't exist in the Collection
    // -> no rerender necessary since the output won't change
    if (
      notExistingItemKeysInCollection.concat(existingItemKeys).length >=
      _itemKeys.length
    )
      config.background = true;

    this.set(newGroupValue, removeProperties(config, ['method', 'overwrite']));

    return this;
  }

  /**
   * Replaces the old `itemKey` with a new specified `itemKey`.
   *
   * [Learn more..](https://agile-ts.org/docs/core/collection/group/methods#replace)
   *
   * @public
   * @param oldItemKey - Old `itemKey` to be replaced.
   * @param newItemKey - New `itemKey` which replaces the specified old `itemKey`.
   * @param config - Configuration object
   */
  public replace(
    oldItemKey: ItemKey,
    newItemKey: ItemKey,
    config: StateIngestConfigInterface = {}
  ): this {
    const newGroupValue = copy(this._value);
    newGroupValue.splice(newGroupValue.indexOf(oldItemKey), 1, newItemKey);
    this.set(newGroupValue, config);
    return this;
  }

  /**
   * Preserves the Group `value` in the corresponding external Storage.
   *
   * The Group key/name is used as the unique identifier for the Persistent.
   * If that is not desired or the Group has no unique identifier,
   * please specify a separate unique identifier for the Persistent.
   *
   * [Learn more..](https://agile-ts.org/docs/core/state/methods/#persist)
   *
   * @public
   * @param config - Configuration object
   */
  public persist(config?: GroupPersistConfigInterface): this;
  /**
   * Preserves the Group `value` in the corresponding external Storage.
   *
   * The specified key is used as the unique identifier for the Persistent.
   *
   * [Learn more..](https://agile-ts.org/docs/core/state/methods/#persist)
   *
   * @public
   * @param key - Key/Name identifier of Persistent.
   * @param config - Configuration object
   */
  public persist(
    key?: PersistentKey,
    config?: GroupPersistConfigInterface
  ): this;
  public persist(
    keyOrConfig: PersistentKey | GroupPersistConfigInterface = {},
    config: GroupPersistConfigInterface = {}
  ): this {
    let _config: GroupPersistConfigInterface;
    let key: PersistentKey | undefined;

    if (isValidObject(keyOrConfig)) {
      _config = keyOrConfig as GroupPersistConfigInterface;
      key = this._key;
    } else {
      _config = config || {};
      key = keyOrConfig as PersistentKey;
    }

    _config = defineConfig(_config, {
      loadValue: true,
      followCollectionPersistKeyPattern: true,
      storageKeys: [],
      defaultStorageKey: null,
    });

    // Create storageItemKey based on Collection key/name identifier
    if (_config.followCollectionPersistKeyPattern) {
      key = CollectionPersistent.getGroupStorageKey(
        key || this._key,
        this.collection()._key
      );
    }

    // Persist Group
    super.persist(key, {
      loadValue: _config.loadValue,
      storageKeys: _config.storageKeys,
      defaultStorageKey: _config.defaultStorageKey,
    });

    return this;
  }

  /**
   * Rebuilds the entire `output` and `items` property of the Group.
   *
   * In doing so, it traverses the Group `value` (Item identifiers)
   * and fetches the Items that belong to an Item identifier.
   *
   * [Learn more..](https://agile-ts.org/docs/core/collection/group/methods#rebuild)
   *
   * @internal
   */
  public rebuild(): this {
    const notFoundItemKeys: Array<ItemKey> = []; // Item keys that couldn't be found in the Collection
    const groupItems: Array<Item<DataType>> = [];

    // Don't rebuild Group if Collection isn't correctly instantiated
    // (because only after a successful instantiation the Collection
    // contains the Items which are essential for a proper rebuild)
    if (!this.collection().isInstantiated) return this;

    // Fetch Items from Collection
    this._value.forEach((itemKey) => {
      const item = this.collection().getItem(itemKey);
      if (item != null) groupItems.push(item);
      else notFoundItemKeys.push(itemKey);
    });

    // Get Item values of fetched Items
    const groupOutput = groupItems.map((item) => {
      return item.getPublicValue();
    });

    // Logging
    if (notFoundItemKeys.length > 0) {
      LogCodeManager.log(
        '1C:02:00',
        [this.collection()._key, this._key],
        notFoundItemKeys
      );
    }

    this._items = groupItems.map((item) => () => item);
    this._output = groupOutput;
    this.notFoundItemKeys = notFoundItemKeys;

    return this;
  }
}

export type GroupKey = string | number;

export interface GroupAddConfigInterface extends StateIngestConfigInterface {
  /**
   * In which way the `itemKey` should be added to the Group.
   * - 'push' =  at the end
   * - 'unshift' = at the beginning
   * @default 'push'
   */
  method?: 'unshift' | 'push';
  /**
   * If the to add `itemKey` already exists,
   * whether to overwrite its position with the position of the new `itemKey`.
   * @default false
   */
  overwrite?: boolean;
}

/**
 * @param key - Key/Name of Group
 * @param isPlaceholder - If Group is initially a Placeholder
 */
export interface GroupConfigInterface {
  /**
   * Key/Name identifier of Group.
   * @default undefined
   */
  key?: GroupKey;
  /**
   * Whether the Group should be a placeholder
   * and therefore should only exists in the background.
   * @default false
   */
  isPlaceholder?: boolean;
}

export interface GroupPersistConfigInterface
  extends StatePersistentConfigInterface {
  /**
   * Whether to format the specified Storage key following the Collection Group Storage key pattern.
   * `_${collectionKey}_group_${groupKey}`
   * @default true
   */
  followCollectionPersistKeyPattern?: boolean;
}
