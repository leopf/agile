import {
  Agile,
  StorageKey,
  copy,
  defineConfig,
  flatMerge,
  isValidObject,
  StateObserver,
  internalIngestKey,
  StatePersistent,
  Observer,
  equal,
  StateJobConfigInterface,
  isFunction,
  notEqual,
} from "../internal";

export class State<ValueType = any> {
  public agileInstance: () => Agile;

  public _key?: StateKey;
  public valueType?: string; // primitive Type of State Value (for JS users)
  public isSet: boolean = false; // If value is not the same as initialValue
  public isPlaceholder: boolean = false;
  public initialStateValue: ValueType;
  public _value: ValueType; // Current Value of State
  public previousStateValue: ValueType;
  public nextStateValue: ValueType; // Represents the next Value of the State (mostly used internal)

  public observer: StateObserver; // Handles deps and subs of State and is like an interface to the Runtime
  public sideEffects: {
    [key: string]: (properties?: { [key: string]: any }) => void;
  } = {}; // SideEffects of State (will be executed in Runtime)

  public isPersisted: boolean = false; // If State is stored in Storage
  public persistent: StatePersistent | undefined; // Manages storing State Value into Storage

  public watchers: { [key: string]: (value: any) => void } = {};

  /**
   * @public
   * State - Class that holds one Value and causes rerender on subscribed Components
   * @param agileInstance - An instance of Agile
   * @param initialValue - Initial Value of State
   * @param key - Key/Name of State
   * @param deps - Initial deps of State
   */
  constructor(
    agileInstance: Agile,
    initialValue: ValueType,
    key?: StateKey,
    deps: Array<Observer> = []
  ) {
    this.agileInstance = () => agileInstance;
    this.initialStateValue = initialValue;
    this._key = key;
    this._value = initialValue;
    this.previousStateValue = initialValue;
    this.nextStateValue = initialValue;
    this.observer = new StateObserver<ValueType>(
      agileInstance,
      this,
      deps,
      key
    );
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
      this.agileInstance().runtime.foundObservers.add(this.observer);

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
  public setKey(value: StateKey | undefined) {
    const oldKey = this._key;

    // Update State Key
    this._key = value;

    // Update Key in Observer
    this.observer.key = value;

    // Update Key in PersistManager
    if (
      value !== undefined &&
      this.persistent &&
      this.persistent.key === oldKey
    )
      this.persistent.key = value;
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
    });

    // Check value has correct Type (js)
    if (this.valueType && !this.hasCorrectType(value)) {
      console.warn(`Agile: Incorrect type (${typeof value}) was provided.`);
      return this;
    }

    // Check if value has changed
    if (equal(this.nextStateValue, value)) return this;

    // Ingest new value into runtime
    this.observer.ingest(value, config);

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
  public ingest(config: StateJobConfigInterface = {}): this {
    config = defineConfig(config, {
      sideEffects: true,
      background: false,
      forceRerender: false,
    });
    this.observer.ingest(internalIngestKey, config);
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
      console.warn(
        `Agile: '${type}' is not supported! Supported types: String, Boolean, Array, Object, Number`
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
   */
  public undo() {
    this.set(this.previousStateValue);
  }

  //=========================================================================================================
  // Reset
  //=========================================================================================================
  /**
   * @public
   * Resets State to its initial Value
   */
  public reset(): this {
    this.set(this.initialStateValue);
    this.persistent?.removeValue(); // Remove State from Storage (since its the initial Value)
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
    });

    if (!isValidObject(this.nextStateValue)) {
      console.warn(
        "Agile: You can't use the patch method on a non object States!"
      );
      return this;
    }

    if (!isValidObject(targetWithChanges)) {
      console.warn("Agile: TargetWithChanges has to be an object!");
      return this;
    }

    // Merge targetWithChanges into nextStateValue
    this.nextStateValue = flatMerge<ValueType>(
      this.nextStateValue,
      targetWithChanges,
      { addNewProperties: config.addNewProperties }
    );

    // Check if value has been changed
    if (equal(this.value, this.nextStateValue)) return this;

    // Ingest updated nextStateValue into Runtime
    this.ingest({ background: config.background });

    return this;
  }

  //=========================================================================================================
  // Watch
  //=========================================================================================================
  /**
   * @public
   * Watches State and detects State changes
   * @param key - Key of Watcher Function
   * @param callback - Callback Function which will be called if State value changes
   */
  public watch(key: string, callback: (value: ValueType) => void): this {
    if (!isFunction(callback)) {
      console.error(
        "Agile: A watcher callback function has to be an function!"
      );
      return this;
    }

    // Check if Callback Function already exists
    if (this.watchers[key]) {
      console.error(
        `Agile: Watcher Callback Function with the key/name ${key} already exists!`
      );
      return this;
    }

    this.watchers[key] = callback;
    return this;
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

  //=========================================================================================================
  // Persist
  //=========================================================================================================
  /**
   * @public
   * Saves State Value into Agile Storage permanently
   * @param key - Storage Key (Note: not needed if State has key/name)
   */
  public persist(key?: StorageKey): this {
    // Update Persistent Key
    if (this.persistent) {
      if (key) this.persistent.key = key;
      return this;
    }

    // Create persistent -> Persist Value
    this.persistent = new StatePersistent<ValueType>(
      this.agileInstance(),
      this,
      key
    );
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
      console.warn("Agile: You can only invert boolean based States!");
      return this;
    }
    this.set(this._value);
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
      console.error("Agile: A sideEffect function has to be an function!");
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
  // Private Write
  //=========================================================================================================
  /**
   * @internal
   * Writes new Value into State
   * @param value - New Value of State
   */
  public privateWrite(value: any) {
    this._value = copy(value);
    this.nextStateValue = copy(value);

    // Save changes in Storage
    this.persistent?.updateValue();
  }

  //=========================================================================================================
  // Is Correct Type
  //=========================================================================================================
  /**
   * @internal
   * Checks if Value has correct valueType (js)
   * @param value - Value that gets checked for its correct Type
   */
  private hasCorrectType(value: any): boolean {
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
   * Returns persistable Value of State
   */
  public getPersistableValue(): any {
    return this.value;
  }
}

export type StateKey = string | number;

/**
 * @param background - If assigning a new value happens in the background (-> not causing any rerender)
 * @param sideEffects - If Side Effects of State get executed
 */
export interface SetConfigInterface {
  background?: boolean;
  sideEffects?: boolean;
}

/**
 * @param background - If assigning new value happens in the background (-> not causing any rerender)
 * @param addNewProperties - If new Properties gets added to the State Value
 */
export interface PatchConfigInterface {
  addNewProperties?: boolean;
  background?: boolean;
}
