import {
  Agile,
  StorageKey,
  copy,
  defineConfig,
  flatMerge,
  isValidObject,
  StateObserver,
  StatePersistent,
  Observer,
  equal,
  isFunction,
  notEqual,
  generateId,
  JobConfigInterface,
} from "../internal";

export class State<ValueType = any> {
  public agileInstance: () => Agile;

  public _key?: StateKey;
  public valueType?: string; // primitive Type of State Value (for JS users)
  public isSet = false; // If value is not the same as initialValue
  public isPlaceholder = false;
  public initialStateValue: ValueType;
  public _value: ValueType; // Current Value of State
  public previousStateValue: ValueType;
  public nextStateValue: ValueType; // Represents the next Value of the State (mostly used internal)

  public observer: StateObserver<ValueType>; // Handles deps and subs of State and is like an interface to the Runtime
  public sideEffects: {
    [key: string]: (properties?: { [key: string]: any }) => void;
  } = {}; // SideEffects of State (will be executed in Runtime)
  public computeMethod?: ComputeMethod<ValueType>;

  public isPersisted = false; // If State can be stored in Agile Storage (-> successfully integrated persistent)
  public persistent: StatePersistent | undefined; // Manages storing State Value into Storage

  public watchers: { [key: string]: StateWatcherCallback<ValueType> } = {};

  /**
   * @public
   * State - Class that holds one Value and causes rerender on subscribed Components
   * @param agileInstance - An instance of Agile
   * @param initialValue - Initial Value of State
   * @param config - Config
   */
  constructor(
    agileInstance: Agile,
    initialValue: ValueType,
    config: StateConfigInterface = {}
  ) {
    config = defineConfig(config, {
      deps: [],
    });
    this.agileInstance = () => agileInstance;
    this.initialStateValue = initialValue;
    this._key = config.key;
    this._value = copy(initialValue);
    this.previousStateValue = copy(initialValue);
    this.nextStateValue = copy(initialValue);
    this.observer = new StateObserver<ValueType>(this, {
      key: config.key,
      deps: config.deps,
    });
  }

  /**
   * @public
   * Set Value of State
   */
  public set value(value: ValueType) {
    this.set(value);
  }

  /**
   * @public
   * Get Value of State
   */
  public get value(): ValueType {
    // Add State to tracked Observers (for auto tracking used observers in computed function)
    if (this.agileInstance().runtime.trackObservers)
      this.agileInstance().runtime.trackedObservers.add(this.observer);

    return this._value;
  }

  /**
   * @public
   * Set Key/Name of State
   */
  public set key(value: StateKey | undefined) {
    this.setKey(value);
  }

  /**
   * @public
   * Get Key/Name of State
   */
  public get key(): StateKey | undefined {
    return this._key;
  }

  //=========================================================================================================
  // Set Key
  //=========================================================================================================
  /**
   * @internal
   * Set Key/Name of State
   * https://github.com/microsoft/TypeScript/issues/338
   * @param value - New Key/Name of State
   */
  public setKey(value: StateKey | undefined): this {
    const oldKey = this._key;

    // Update State Key
    this._key = value;

    // Update Key in Observer
    this.observer.key = value;

    // Update Key in PersistManager (only if the Keys are the same -> otherwise the PersistKey got formatted and will be set where other)
    if (this.persistent?.key === oldKey) this.persistent?.setKey(value);

    return this;
  }

  //=========================================================================================================
  // Set
  //=========================================================================================================
  /**
   * @public
   * Updates Value of State
   * @param value - new State Value
   * @param config - Config
   */
  public set(value: ValueType, config: SetConfigInterface = {}): this {
    config = defineConfig(config, {
      sideEffects: true,
      background: false,
      force: false,
      storage: true,
    });

    // Check value has correct Type (js)
    if (!this.hasCorrectType(value)) {
      const message = `Incorrect type (${typeof value}) was provided.`;
      if (!config.force) {
        Agile.logger.error(message);
        return this;
      }
      Agile.logger.warn(message);
    }

    // Check if value has changed
    if (equal(this.nextStateValue, value) && !config.force) return this;

    // Ingest new value into runtime
    this.observer.ingestValue(value, config);

    return this;
  }

  //=========================================================================================================
  // Ingest
  //=========================================================================================================
  /**
   * @internal
   * Ingests nextStateValue, computedValue into Runtime
   * @param config - Config
   */
  public ingest(config: JobConfigInterface = {}): this {
    config = defineConfig(config, {
      sideEffects: true,
      background: false,
      force: false,
    });
    this.observer.ingest(config);
    return this;
  }

  //=========================================================================================================
  // Type
  //=========================================================================================================
  /**
   * @public
   * Assign primitive type to State Value
   * Note: This function is mainly thought for JS users
   * @param type - wished Type ('String', 'Boolean', 'Array', 'Object', 'Number')
   */
  public type(type: any): this {
    const supportedTypes = ["String", "Boolean", "Array", "Object", "Number"];

    // Check if type is a supported Type
    if (!supportedTypes.includes(type.name)) {
      Agile.logger.warn(
        `'${type}' is not supported! Supported types: String, Boolean, Array, Object, Number`
      );
      return this;
    }

    this.valueType = type.name.toLowerCase();
    return this;
  }

  //=========================================================================================================
  // Undo
  //=========================================================================================================
  /**
   * @public
   * Undoes latest State Value change
   * @param config - Config
   */
  public undo(config: SetConfigInterface = {}): this {
    this.set(this.previousStateValue, config);
    return this;
  }

  //=========================================================================================================
  // Reset
  //=========================================================================================================
  /**
   * @public
   * Resets State to its initial Value
   * @param config - Config
   */
  public reset(config: SetConfigInterface = {}): this {
    this.set(this.initialStateValue, config);
    return this;
  }

  //=========================================================================================================
  // Patch
  //=========================================================================================================
  /**
   * @public
   * Patches Object with changes into State Value
   * Note: Only useful if State is an Object
   * @param targetWithChanges - Object that holds changes which get patched into State Value
   * @param config - Config
   */
  public patch(
    targetWithChanges: object,
    config: PatchConfigInterface = {}
  ): this {
    config = defineConfig(config, {
      addNewProperties: true,
      background: false,
      force: false,
    });

    if (!isValidObject(this.nextStateValue)) {
      Agile.logger.error(
        "You can't use the patch method on a non object based States!"
      );
      return this;
    }

    if (!isValidObject(targetWithChanges)) {
      Agile.logger.error("TargetWithChanges has to be an Object!");
      return this;
    }

    // Merge targetWithChanges into nextStateValue
    this.nextStateValue = flatMerge<ValueType>(
      this.nextStateValue,
      targetWithChanges,
      { addNewProperties: config.addNewProperties }
    );

    // Check if value has been changed
    if (equal(this.value, this.nextStateValue) && !config.force) return this;

    // Ingest updated nextStateValue into Runtime
    this.ingest({ background: config.background, force: config.force });

    return this;
  }

  //=========================================================================================================
  // Watch
  // https://stackoverflow.com/questions/12688275/is-there-a-way-to-do-method-overloading-in-typescript/12689054#12689054
  //=========================================================================================================
  /**
   * @public
   * Watches State and detects State changes
   * @param callback - Callback Function that gets called if the State Value changes
   * @return Key of Watcher
   */
  public watch(callback: StateWatcherCallback<ValueType>): string;
  /**
   * @public
   * Watches State and detects State changes
   * @param key - Key/Name of Watcher Function
   * @param callback - Callback Function that gets called if the State Value changes
   */
  public watch(key: string, callback: StateWatcherCallback<ValueType>): this;
  public watch(
    keyOrCallback: string | StateWatcherCallback<ValueType>,
    callback?: StateWatcherCallback<ValueType>
  ): this | string {
    const generateKey = isFunction(keyOrCallback);
    let _callback: StateWatcherCallback<ValueType>;
    let key: string;

    if (generateKey) {
      key = generateId();
      _callback = keyOrCallback as StateWatcherCallback<ValueType>;
    } else {
      key = keyOrCallback as string;
      _callback = callback as StateWatcherCallback<ValueType>;
    }

    // Check if Callback is a valid Function
    if (!isFunction(_callback)) {
      Agile.logger.error(
        "A Watcher Callback Function has to be typeof Function!"
      );
      return this;
    }

    // Check if watcherKey is already occupied
    if (this.watchers[key]) {
      Agile.logger.error(
        `Watcher Callback Function with the key/name '${key}' already exists!`
      );
      return this;
    }

    this.watchers[key] = _callback;
    return generateKey ? key : this;
  }

  //=========================================================================================================
  // Remove Watcher
  //=========================================================================================================
  /**
   * @public
   * Removes Watcher at given Key
   * @param key - Key of Watcher that gets removed
   */
  public removeWatcher(key: string): this {
    delete this.watchers[key];
    return this;
  }

  /**
   * @public
   * Creates a Watcher that gets once called when the State Value changes for the first time and than destroys itself
   * @param callback - Callback Function that gets called if the State Value changes
   */
  public onInaugurated(callback: StateWatcherCallback<ValueType>) {
    const watcherKey = "InauguratedWatcherKey";
    this.watch(watcherKey, (value) => {
      callback(value);
      this.removeWatcher(watcherKey);
    });
  }

  //=========================================================================================================
  // Has Watcher
  //=========================================================================================================
  /**
   * @public
   * Checks if watcher at given Key exists
   * @param key - Key/Name of Watcher
   */
  public hasWatcher(key: string): boolean {
    return !!this.watchers[key];
  }

  //=========================================================================================================
  // Persist
  //=========================================================================================================
  /**
   * @public
   * Stores State Value into Agile Storage permanently
   * @param config - Config
   */
  public persist(config?: StatePersistentConfigInterface): this;
  /**
   * @public
   * Stores State Value into Agile Storage permanently
   * @param key - Storage Key (Note: not needed if State has key/name)
   * @param config - Config
   */
  public persist(
    key?: StorageKey,
    config?: StatePersistentConfigInterface
  ): this;
  public persist(
    keyOrConfig: StorageKey | StatePersistentConfigInterface = {},
    config: StatePersistentConfigInterface = {}
  ): this {
    let _config: StatePersistentConfigInterface;
    let key: StorageKey | undefined;

    if (isValidObject(keyOrConfig)) {
      _config = keyOrConfig as StatePersistentConfigInterface;
      key = undefined;
    } else {
      _config = config || {};
      key = keyOrConfig as StorageKey;
    }

    _config = defineConfig(_config, {
      instantiate: true,
    });

    if (this.persistent) {
      Agile.logger.warn(
        "By persisting a State twice you overwrite the old Persistent Instance!"
      );
    }

    // Create persistent -> Persist Value
    this.persistent = new StatePersistent<ValueType>(this, {
      instantiate: _config.instantiate,
      storageKeys: _config.storageKeys,
      key: key,
    });

    return this;
  }

  //=========================================================================================================
  // On Load
  //=========================================================================================================
  /**
   * @public
   * Callback Function gets called if persisted Value gets loaded into the State for the first Time
   * Note: Only useful for persisted States!
   * @param callback - Callback Function
   */
  public onLoad(callback: (success: boolean) => void): this {
    if (this.persistent) {
      this.persistent.onLoad = callback;

      // If State isPersisted the loading was successful -> callback can be called
      if (this.isPersisted) callback(true);
    } else {
      Agile.logger.warn(
        `Please make sure you persist the State '${this.key}' before using onLoad!`
      );
    }
    return this;
  }

  //=========================================================================================================
  // Copy
  //=========================================================================================================
  /**
   * @public
   * Creates fresh copy of State Value (-> No reference to State Value)
   */
  public copy(): ValueType {
    return copy(this.value);
  }

  //=========================================================================================================
  // Exists
  //=========================================================================================================
  /**
   * @public
   * Checks if State exists
   */
  public get exists(): boolean {
    return this.getPublicValue() !== undefined && !this.isPlaceholder;
  }

  //=========================================================================================================
  // Is
  //=========================================================================================================
  /**
   * @public
   * Equivalent to ===
   * @param value - Value that gets checked if its equals to the State Value
   */
  public is(value: ValueType): boolean {
    return equal(value, this.value);
  }

  //=========================================================================================================
  // Is Not
  //=========================================================================================================
  /**
   * @public
   * Equivalent to !==
   * @param value - Value that gets checked if its not equals to the State Value
   */
  public isNot(value: ValueType): boolean {
    return notEqual(value, this.value);
  }

  //=========================================================================================================
  // Invert
  //=========================================================================================================
  /**
   * @public
   * Inverts State Value
   * Note: Only useful with boolean based States
   */
  public invert(): this {
    if (typeof this._value !== "boolean") {
      Agile.logger.error("You can only invert boolean based States!");
      return this;
    }
    this.set(this._value);
    return this;
  }

  //=========================================================================================================
  // Compute
  //=========================================================================================================
  /**
   * @public
   * Compute Value if it changes
   * @param method - Method that will be used to compute the new Value
   */
  public compute(method: ComputeMethod<ValueType>): this {
    this.computeMethod = method;
    return this;
  }

  //=========================================================================================================
  // Add SideEffect
  //=========================================================================================================
  /**
   * @internal
   * Adds SideEffect to State
   * @param key - Key of SideEffect
   * @param sideEffect - Callback Function that gets called on every State Value change
   */
  public addSideEffect(
    key: string,
    sideEffect: (properties?: { [key: string]: any }) => void
  ): this {
    if (!isFunction(sideEffect)) {
      Agile.logger.error("A sideEffect function has to be an function!");
      return this;
    }
    this.sideEffects[key] = sideEffect;
    return this;
  }

  //=========================================================================================================
  // Remove SideEffect
  //=========================================================================================================
  /**
   * @internal
   * Removes SideEffect at given Key
   * @param key - Key of the SideEffect that gets removed
   */
  public removeSideEffect(key: string): this {
    delete this.sideEffects[key];
    return this;
  }

  //=========================================================================================================
  // Has SideEffect
  //=========================================================================================================
  /**
   * @internal
   * Checks if sideEffect at given Key exists
   * @param key - Key of SideEffect
   */
  public hasSideEffect(key: string): boolean {
    return !!this.sideEffects[key];
  }

  //=========================================================================================================
  // Is Correct Type
  //=========================================================================================================
  /**
   * @internal
   * Checks if Value has correct valueType (js)
   * Note: If no valueType set it returns true
   * @param value - Value that gets checked for its correct Type
   */
  private hasCorrectType(value: any): boolean {
    if (!this.valueType) return true;
    let type: string = typeof value;
    return type === this.valueType;
  }

  //=========================================================================================================
  // Get Public Value
  //=========================================================================================================
  /**
   * @internal
   * Returns public Value of State
   */
  public getPublicValue(): ValueType {
    // If State Value is used internal and output represents the real state value (for instance in Group)
    if (this["output"] !== undefined) return this["output"];

    return this._value;
  }

  //=========================================================================================================
  // Get Persistable Value
  //=========================================================================================================
  /**
   * @internal
   * Returns Value that gets written into the Agile Storage
   */
  public getPersistableValue(): any {
    return this.value;
  }
}

export type StateKey = string | number;

/**
 * @param key - Key/Name of State
 * @param deps - Initial deps of State
 */
export interface StateConfigInterface {
  key?: StateKey;
  deps?: Array<Observer>;
}

/**
 * @param background - If assigning a new value happens in the background (-> not causing any rerender)
 * @param sideEffects - If Side Effects of State get executed
 * @param storage - If State value gets saved in Agile Storage (only useful if State is persisted)
 * @param force -  Force creating and performing Job
 */
export interface SetConfigInterface {
  background?: boolean;
  sideEffects?: boolean;
  storage?: boolean;
  force?: boolean;
}

/**
 * @param background - If assigning new value happens in the background (-> not causing any rerender)
 * @param addNewProperties - If new Properties gets added to the State Value
 * @param force - Force patching Value into State
 */
export interface PatchConfigInterface {
  addNewProperties?: boolean;
  background?: boolean;
  force?: boolean;
}

/**
 * @param instantiate - If Persistent gets instantiated
 * @param storageKeys - Key/Name of Storages which gets used to persist the State Value (NOTE: If not passed the default Storage will be used)
 */
export interface StatePersistentConfigInterface {
  instantiate?: boolean;
  storageKeys?: StorageKey[];
}

export type StateWatcherCallback<T = any> = (value: T) => void;
export type ComputeMethod<T = any> = (value: T) => T;
