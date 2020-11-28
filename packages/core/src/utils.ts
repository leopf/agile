import { State, Agile, Event, Collection, Observer } from "./internal";

//=========================================================================================================
// Copy
//=========================================================================================================
/**
 * @internal
 * Creates a fresh copy of an Array/Object
 * https://www.samanthaming.com/tidbits/70-3-ways-to-clone-objects/
 * @param value - Array/Object that gets copied
 */
export function copy<T = any>(value: T): T {
  // Extra checking '!value' because 'typeof null === object'
  if (!value || typeof value !== "object") return value;
  let temp;
  let newObject: any = Array.isArray(value) ? [] : {};
  for (let property in value) {
    temp = value[property];
    newObject[property] = typeof temp === "object" ? copy(temp) : temp;
  }
  return newObject as T;
}

//=========================================================================================================
// Is Valid Object
//=========================================================================================================
/**
 * @internal
 * Checks if an value is a valid Object
 * https://stackoverflow.com/questions/12996871/why-does-typeof-array-with-objects-return-object-and-not-array
 * @param value - Value that is tested for its correctness
 */
export function isValidObject(value: any): boolean {
  function isHTMLElement(obj: any) {
    try {
      return obj instanceof HTMLElement;
    } catch (e) {
      return (
        typeof obj === "object" &&
        obj.nodeType === 1 &&
        typeof obj.style === "object" &&
        typeof obj.ownerDocument === "object"
      );
    }
  }

  return (
    value !== null &&
    typeof value === "object" &&
    !isHTMLElement(value) &&
    !Array.isArray(value)
  );
}

//=========================================================================================================
// Includes Array
//=========================================================================================================
/**
 * @internal
 * Check if array1 contains all elements of array2
 * @param array1 - Array 1
 * @param array2 - Array 2
 */
export function includesArray<DataType = any>(
  array1: Array<DataType>,
  array2: Array<DataType>
): boolean {
  return array2.every((element) => array1.includes(element));
}

//=========================================================================================================
// Normalize Array
//=========================================================================================================
/**
 * @internal
 * Transforms Item/s to an Item Array
 * @param items - Item/s that gets transformed to an Array
 * @param config - Config
 */
export function normalizeArray<DataType = any>(
  items?: DataType | Array<DataType>,
  config: { createUndefinedArray?: boolean } = {}
): Array<DataType> {
  config = defineConfig(config, {
    createUndefinedArray: false, // If it should return [] or [undefined] if the passed Item is undefined
  });
  if (!items && !config.createUndefinedArray) return [];
  return Array.isArray(items) ? items : [items as DataType];
}

//=========================================================================================================
// Get Instance
//=========================================================================================================
/**
 * @internal
 * Tries to get an AgileInstance from provided instance
 * If no agileInstance found it returns the global AgileInstance
 * @param instance - Instance that might hold an AgileInstance
 */
export function getAgileInstance(instance: any): Agile | undefined {
  try {
    // Try to find agileInstance in Instance
    if (instance) {
      if (instance instanceof State) return instance.agileInstance();
      if (instance instanceof Event) return instance.agileInstance();
      if (instance instanceof Collection) return instance.agileInstance();
      if (instance instanceof Observer) return instance.agileInstance();
      const _agileInstance = instance["agileInstance"];
      if (_agileInstance) return instance;
    }

    // Return global bound agileInstance (set in first instantiation of Agile)
    return globalThis["__agile__"];
  } catch (e) {
    Agile.logger.error("Failed to get Agile Instance", e);
  }
  return undefined;
}

//=========================================================================================================
// Is Function
//=========================================================================================================
/**
 * @internal
 * Checks if value is a function
 * @param value - Value that gets tested if its a function
 */
export function isFunction(value: any): boolean {
  return typeof value === "function";
}

//=========================================================================================================
// Is Async Function
//=========================================================================================================
/**
 * @internal
 * Checks if value is an async function
 * @param value - Value that gets tested if its an async function
 */
export function isAsyncFunction(value: any): boolean {
  const valueString = value.toString();
  return (
    isFunction(value) &&
    (value.constructor.name === "AsyncFunction" ||
      valueString.includes("__awaiter"))
  );
}

//=========================================================================================================
// Is Valid Url
//=========================================================================================================
/**
 * @internal
 * Checks the correctness of an url
 * Resource: https://stackoverflow.com/questions/5717093/check-if-a-javascript-string-is-a-url
 * @param url - Url that gets tested for its correctness
 */
export function isValidUrl(url: string): boolean {
  const pattern = new RegExp(
    "^(https?:\\/\\/)?" + // protocol
      "((([a-z\\d]([a-z\\d-]*[a-z\\d])*)\\.)+[a-z]{2,}|" + // domain name
      "((\\d{1,3}\\.){3}\\d{1,3}))" + // OR ip (v4) address
      "(\\:\\d+)?(\\/[-a-z\\d%_.~+]*)*" + // port and path
      "(\\?[;&a-z\\d%_.~+=-]*)?" + // query string
      "(\\#[-a-z\\d_]*)?$",
    "i"
  );
  return pattern.test(url);
}

//=========================================================================================================
// Is Json String
//=========================================================================================================
/**
 * @internal
 * Checks if value is valid JsonString
 * @param value - Value that gets checked
 */
export function isJsonString(value: any): boolean {
  if (typeof value !== "string") return false;
  try {
    JSON.parse(value);
  } catch (e) {
    return false;
  }
  return true;
}

//=========================================================================================================
// Define Config
//=========================================================================================================
/**
 * @internal
 * Merges default values/properties into config object
 * @param config - Config object that receives default values
 * @param defaults - Default values object that gets merged into config object
 */
export function defineConfig<ConfigInterface = Object>(
  config: ConfigInterface,
  defaults: Object
): ConfigInterface {
  return { ...defaults, ...config };
}

//=========================================================================================================
// Flat Merge
//=========================================================================================================
/**
 * @internal
 * @param addNewProperties - Adds new properties to source Object
 */
export interface FlatMergeConfigInterface {
  addNewProperties?: boolean;
}

/**
 * @internal
 * Merges items into object, be aware that the merge will only happen at the top level of the object
 * @param source - Source object
 * @param changes - Changes that get merged into the source object
 * @param config - Config
 */
export function flatMerge<DataType = Object>(
  source: DataType,
  changes: Object,
  config: FlatMergeConfigInterface = {}
): DataType {
  // Copy Source to avoid references
  const _source = copy<DataType>(source);
  if (!_source) return _source;

  // Loop through source object an merge changes into it
  let keys = Object.keys(changes);
  keys.forEach((property) => {
    if (!config.addNewProperties && !_source[property]) return;
    _source[property] = changes[property];
  });

  return _source;
}

//=========================================================================================================
// Equals
//=========================================================================================================
/**
 * @internal
 * Check if two values are equal
 * @param value1 - First Value
 * @param value2 - Second Value
 */
export function equal(value1: any, value2: any): boolean {
  return value1 === value2 || JSON.stringify(value1) === JSON.stringify(value2);
}

//=========================================================================================================
// Not Equals
//=========================================================================================================
/**
 * @internal
 * Checks if two values aren't equal
 * @param value1 - First Value
 * @param value2 - Second Value
 */
export function notEqual(value1: any, value2: any): boolean {
  return !equal(value1, value2);
}

//=========================================================================================================
// Generate Id
//=========================================================================================================
/**
 * @internal
 * Generates random Id
 * @param length - Length of generated Id
 */
export function generateId(length?: number): string {
  const characters =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  const charactersLength = characters.length;
  let result = "";
  if (!length) length = 5;
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
  }
  return result;
}

//=========================================================================================================
// Clone
//=========================================================================================================
/**
 * @internal
 * Clones a Class
 * @param instance - Instance of Class you want to clone
 */
export function clone<T = any>(instance: T): T {
  // Clone Class
  const objectCopy: T = Object.create(Object.getPrototypeOf(instance));
  const objectClone = Object.assign(objectCopy, instance);

  // Copy Properties of Class
  for (let key in objectClone) objectClone[key] = copy(objectClone[key]);

  return objectClone;
}

//=========================================================================================================
// Global Bind
//=========================================================================================================
/**
 * @internal
 * Binds Instance Global
 * https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/globalThis
 * https://blog.logrocket.com/what-is-globalthis-why-use-it/
 * @param key - Key of Instance
 * @param instance - Instance which becomes globally accessible (globalThis.key)
 */
export function globalBind(key: string, instance: any) {
  try {
    if (!globalThis[key]) globalThis[key] = instance;
  } catch (e) {
    Agile.logger.error(
      `Failed to create global Instance called '${name}'`,
      instance
    );
  }
}
