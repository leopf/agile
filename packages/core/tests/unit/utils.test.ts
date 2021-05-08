import {
  clone,
  copy,
  defineConfig,
  equal,
  flatMerge,
  generateId,
  includesArray,
  isAsyncFunction,
  isFunction,
  isJsonString,
  isValidObject,
  normalizeArray,
  notEqual,
  globalBind,
  getAgileInstance,
  extractObservers,
  Agile,
  State,
  Observer,
  Collection,
  createArrayFromObject,
  StateObserver,
  removeProperties,
} from '../../src';
import mockConsole from 'jest-mock-console';

describe('Utils Tests', () => {
  let dummyAgile: Agile;

  beforeEach(() => {
    jest.clearAllMocks();
    mockConsole(['error', 'warn']);

    dummyAgile = new Agile({ localStorage: false });

    // @ts-ignore | Reset globalThis
    globalThis = {};
  });

  describe('copy function tests', () => {
    it('should copy Array without any reference', () => {
      const myArray = [1, 2, 3, 4, 5];
      const myCopiedArray = copy(myArray);
      const myDateArray = [new Date(), 2, new Date(), new Date()];
      const myCopiedDateArray = copy(myDateArray);

      expect(myCopiedArray).toStrictEqual([1, 2, 3, 4, 5]);
      expect(myArray).toStrictEqual([1, 2, 3, 4, 5]);
      expect(myCopiedDateArray).toStrictEqual(myDateArray);
      expect(myDateArray).toStrictEqual(myDateArray);

      myCopiedArray.push(6);
      myCopiedDateArray.push(1);

      expect(myCopiedArray).toStrictEqual([1, 2, 3, 4, 5, 6]);
      expect(myArray).toStrictEqual([1, 2, 3, 4, 5]);
      expect(myCopiedDateArray).not.toStrictEqual(myDateArray);
      expect(myDateArray).toStrictEqual(myDateArray);
    });

    it('should copy Object without any reference', () => {
      const myObject = { id: 1, name: 'jeff' };
      const myCopiedObject = copy(myObject);

      expect(myCopiedObject).toStrictEqual({ id: 1, name: 'jeff' });
      expect(myObject).toStrictEqual({ id: 1, name: 'jeff' });

      myObject.name = 'hans';

      expect(myObject).toStrictEqual({ id: 1, name: 'hans' });
      expect(myCopiedObject).toStrictEqual({ id: 1, name: 'jeff' });
    });

    it('should copy deep Object without any reference', () => {
      const myObject = {
        id: 1,
        name: 'jeff',
        location: { country: 'Germany', state: 'Bayern' },
      };
      const myCopiedObject = copy(myObject);

      expect(myCopiedObject).toStrictEqual({
        id: 1,
        name: 'jeff',
        location: { country: 'Germany', state: 'Bayern' },
      });
      expect(myObject).toStrictEqual({
        id: 1,
        name: 'jeff',
        location: { country: 'Germany', state: 'Bayern' },
      });

      myObject.name = 'hans';
      myObject.location.state = 'Sachsen';

      expect(myObject).toStrictEqual({
        id: 1,
        name: 'hans',
        location: { country: 'Germany', state: 'Sachsen' },
      });
      expect(myCopiedObject).toStrictEqual({
        id: 1,
        name: 'jeff',
        location: { country: 'Germany', state: 'Bayern' },
      });
    });

    it('should copy default Types', () => {
      const myNumber = 5;
      const myCopiedNumber = copy(myNumber);
      const myString = 'frank';
      const myCopiedString = copy(myString);
      const myNull = null;
      const myCopiedNull = copy(myNull);
      const myUndefined = undefined;
      const myCopiedUndefined = copy(myUndefined);

      expect(myCopiedNumber).toBe(5);
      expect(myNumber).toBe(5);
      expect(myCopiedString).toBe('frank');
      expect(myString).toBe('frank');
      expect(myCopiedNull).toBe(null);
      expect(myNull).toBe(null);
      expect(myCopiedUndefined).toBe(undefined);
      expect(myUndefined).toBe(undefined);
    });

    it("shouldn't copy classes", () => {
      const myDate = new Date();
      const myCopiedDate = copy(myDate);

      expect(myCopiedDate).toBe(myDate);
      expect(myDate).toBe(myDate);
    });
  });

  describe('isValidObject function tests', () => {
    // Can't be Tested in not Web-Environment
    // it("should return false if passing HTML Element", () => {
    //   expect(isValidObject(HTMLElement)).toBeFalsy();
    // });

    it('should return false if passed instance is invalid Object (default config)', () => {
      expect(isValidObject(null)).toBeFalsy();
      expect(isValidObject('Hello')).toBeFalsy();
      expect(isValidObject([1, 2])).toBeFalsy();
      expect(isValidObject(123)).toBeFalsy();
    });

    it('should return true if passed instance is valid Object (default config)', () => {
      expect(isValidObject({ hello: 'jeff' })).toBeTruthy();
      expect(
        isValidObject({ hello: 'jeff', deep: { hello: 'franz' } })
      ).toBeTruthy();
    });

    it('should return true if passed instance is array (considerArray = true)', () => {
      expect(isValidObject([1, 2], true)).toBeTruthy();
    });
  });

  describe('includesArray function tests', () => {
    it("should return false if Array1 doesn't include Array2", () => {
      expect(includesArray([1, 2], [5, 6])).toBeFalsy();
    });

    it('should return false if Array1 does only include parts of Array2', () => {
      expect(includesArray([1, 2], [2, 6])).toBeFalsy();
    });

    it('should return true if Array1 includes Array2', () => {
      expect(includesArray([1, 4, 2, 3], [1, 2])).toBeTruthy();
    });

    it('should return true if Array1 is equal to Array2', () => {
      expect(includesArray([1, 2], [1, 2])).toBeTruthy();
    });
  });

  describe('normalizeArray function tests', () => {
    it('should normalize Array (default config)', () => {
      expect(normalizeArray([1, 2, undefined, 3, 'hi'])).toStrictEqual([
        1,
        2,
        undefined,
        3,
        'hi',
      ]);
    });

    it('should normalize single Item (default config)', () => {
      expect(normalizeArray(1)).toStrictEqual([1]);
    });

    it("shouldn't normalize undefined (default config)", () => {
      expect(normalizeArray(undefined)).toStrictEqual([]);
    });

    it('should normalize undefined (config.createUndefinedArray = true)', () => {
      expect(
        normalizeArray(undefined, { createUndefinedArray: true })
      ).toStrictEqual([undefined]);
    });
  });

  describe('getAgileInstance function tests', () => {
    beforeEach(() => {
      globalThis[Agile.globalKey] = dummyAgile;
    });

    it('should get agileInstance from State', () => {
      const dummyState = new State(dummyAgile, 'dummyValue');

      expect(getAgileInstance(dummyState)).toBe(dummyAgile);
    });

    it('should get agileInstance from Collection', () => {
      const dummyCollection = new Collection(dummyAgile);

      expect(getAgileInstance(dummyCollection)).toBe(dummyAgile);
    });

    it('should get agileInstance from Observer', () => {
      const dummyObserver = new Observer(dummyAgile);

      expect(getAgileInstance(dummyObserver)).toBe(dummyAgile);
    });

    it('should get agileInstance from globalThis if passed instance holds no agileInstance', () => {
      expect(getAgileInstance('weiredInstance')).toBe(dummyAgile);
    });

    it('should print error if something went wrong', () => {
      // @ts-ignore | Destroy globalThis
      globalThis = undefined;

      const response = getAgileInstance('weiredInstance');

      expect(response).toBeUndefined();
      expect(console.error).toHaveBeenCalledWith(
        'Agile Error: Failed to get Agile Instance from ',
        'weiredInstance'
      );
    });
  });

  describe('extractObservers function tests', () => {
    let dummyObserver: Observer;
    let dummyObserver2: Observer;
    let dummyStateObserver: StateObserver;
    let dummyState: State;
    let dummyDefaultGroupObserver: StateObserver;
    let dummyCollection: Collection;

    beforeEach(() => {
      dummyObserver = new Observer(dummyAgile);
      dummyObserver2 = new Observer(dummyAgile);

      dummyState = new State(dummyAgile, undefined);
      dummyStateObserver = new StateObserver(dummyState);
      dummyState.observer = dummyStateObserver;

      dummyCollection = new Collection(dummyAgile);
      const defaultGroup =
        dummyCollection.groups[dummyCollection.config.defaultGroupKey];
      dummyDefaultGroupObserver = new StateObserver(defaultGroup);
      defaultGroup.observer = dummyDefaultGroupObserver;
    });

    it('should extract Observers from passed Instances', () => {
      const response = extractObservers([
        dummyObserver,
        dummyState,
        undefined,
        {},
        { observer: 'fake' },
        dummyCollection,
        { observer: dummyObserver2 },
      ]);

      expect(response).toStrictEqual([
        dummyObserver,
        dummyStateObserver,
        undefined,
        undefined,
        undefined,
        dummyDefaultGroupObserver,
        dummyObserver2,
      ]);
    });
  });

  describe('isFunction function tests', () => {
    it('should return true if passed instance is valid Function', () => {
      expect(
        isFunction(() => {
          /* empty function */
        })
      ).toBeTruthy();
    });

    it('should return false if passed instance is invalid Function', () => {
      expect(isFunction('hello')).toBeFalsy();
      expect(isFunction(1)).toBeFalsy();
      expect(isFunction([1, 2, 3])).toBeFalsy();
      expect(isFunction({ hello: 'jeff' })).toBeFalsy();
    });
  });

  describe('isAsyncFunction function tests', () => {
    it('should return true if passed instance is valid async Function', () => {
      expect(
        isAsyncFunction(async () => {
          /* empty function */
        })
      ).toBeTruthy();
      expect(
        isAsyncFunction(async function () {
          /* empty function */
        })
      ).toBeTruthy();
    });

    it('should return false if passed instance is invalid async Function', () => {
      expect(isAsyncFunction('hello')).toBeFalsy();
      expect(isAsyncFunction(1)).toBeFalsy();
      expect(isAsyncFunction([1, 2, 3])).toBeFalsy();
      expect(isAsyncFunction({ hello: 'jeff' })).toBeFalsy();
      expect(
        isAsyncFunction(() => {
          /* empty function */
        })
      ).toBeFalsy();
      expect(
        isAsyncFunction(function () {
          /* empty function */
        })
      ).toBeFalsy();
    });
  });

  describe('isJsonString function tests', () => {
    it('should return true if passed instance is valid Json String', () => {
      expect(isJsonString('{"name":"John", "age":31, "city":"New York"}')).toBe(
        true
      );
    });

    it('should return false if passed instance is invalid Json String', () => {
      expect(isJsonString('frank')).toBeFalsy();
      expect(isJsonString('{name":"John", "age":31, "city":"New York"}')).toBe(
        false
      );
      expect(isJsonString(10)).toBeFalsy();
      expect(isJsonString({ name: 'John', age: 31 })).toBeFalsy();
    });
  });

  describe('defineConfig function tests', () => {
    it('should merge defaults into config and overwrite undefined properties (default config)', () => {
      const config = {
        allowLogging: true,
        loops: 10,
        isHuman: undefined,
      };
      expect(
        defineConfig(config, {
          allowLogging: false,
          loops: 15,
          isHuman: true,
          isRobot: false,
          name: 'jeff',
        })
      ).toStrictEqual({
        allowLogging: true,
        loops: 10,
        isHuman: true,
        isRobot: false,
        name: 'jeff',
      });
    });

    it("should merge defaults into config and shouldn't overwrite undefined properties (overwriteUndefinedProperties = false)", () => {
      const config = {
        allowLogging: true,
        loops: 10,
        isHuman: undefined,
      };
      expect(
        defineConfig(
          config,
          {
            allowLogging: false,
            loops: 15,
            isHuman: true,
            isRobot: false,
            name: 'jeff',
          },
          false
        )
      ).toStrictEqual({
        allowLogging: true,
        loops: 10,
        isHuman: undefined,
        isRobot: false,
        name: 'jeff',
      });
    });
  });

  describe('flatMerge function tests', () => {
    it('should merge Changes Object into Source Object', () => {
      const source = {
        id: 123,
        name: 'jeff',
        size: 189,
      };
      expect(
        flatMerge(source, {
          name: 'hans',
          size: 177,
        })
      ).toStrictEqual({
        id: 123,
        name: 'hans',
        size: 177,
      });
    });

    it('should add new properties to Source Object', () => {
      const source = {
        id: 123,
        name: 'jeff',
        size: 189,
      };

      expect(
        flatMerge(source, {
          name: 'hans',
          size: 177,
          location: 'behind you',
        })
      ).toStrictEqual({
        id: 123,
        name: 'hans',
        size: 177,
        location: 'behind you',
      });
    });

    it("shouldn't add new properties to source Object (config.addNewProperties = false)", () => {
      const source = {
        id: 123,
        name: 'jeff',
        size: 189,
      };

      expect(
        flatMerge(
          source,
          {
            name: 'hans',
            size: 177,
            location: 'behind you',
          },
          { addNewProperties: false }
        )
      ).toStrictEqual({
        id: 123,
        name: 'hans',
        size: 177,
      });
    });

    it("shouldn't deep merge Changes Object into Source Object", () => {
      const source = {
        id: 123,
        name: 'jeff',
        address: {
          place: 'JeffsHome',
          country: 'Germany',
        },
      };

      expect(
        flatMerge(source, {
          place: 'JeffsNewHome',
        })
      ).toStrictEqual({
        id: 123,
        name: 'jeff',
        address: {
          place: 'JeffsHome',
          country: 'Germany',
        },
        place: 'JeffsNewHome',
      });
    });
  });

  describe('equal function tests', () => {
    it('should return true if value1 and value2 are equal', () => {
      expect(equal({ id: 123, name: 'jeff' }, { id: 123, name: 'jeff' })).toBe(
        true
      );
      expect(equal([1, 2, 3], [1, 2, 3])).toBeTruthy();
      expect(equal(12, 12)).toBeTruthy();
      expect(equal('hi', 'hi')).toBeTruthy();
    });

    it("should return false if value1 and value2 aren't equal", () => {
      expect(equal({ id: 123, name: 'jeff' }, { id: 123, name: 'hans' })).toBe(
        false
      );
      expect(equal([1, 2], [3, 5])).toBeFalsy();
      expect(equal(12, 13)).toBeFalsy();
      expect(equal('hi', 'bye')).toBeFalsy();
    });
  });

  describe('notEqual function tests', () => {
    it('should return false if value1 and value2 are equal', () => {
      expect(
        notEqual({ id: 123, name: 'jeff' }, { id: 123, name: 'jeff' })
      ).toBeFalsy();
      expect(notEqual([1, 2, 3], [1, 2, 3])).toBeFalsy();
      expect(notEqual(12, 12)).toBeFalsy();
      expect(equal('hi', 'bye')).toBeFalsy();
    });

    it("should return true if value1 and value2 aren't equal", () => {
      expect(
        notEqual({ id: 123, name: 'jeff' }, { id: 123, name: 'hans' })
      ).toBeTruthy();
      expect(notEqual([1, 2], [3, 5])).toBeTruthy();
      expect(notEqual(12, 13)).toBeTruthy();
      expect(notEqual('hi', 'bye')).toBeTruthy();
    });
  });

  describe('generateId function tests', () => {
    it('should returned generated Id that matches regex', () => {
      expect(generateId()).toMatch(/^[a-zA-Z0-9]*$/);
    });

    it('should returned generated Id with correct length (length = x)', () => {
      expect(generateId(10)).toMatch(/^[a-zA-Z0-9]*$/);
      expect(generateId(10).length).toEqual(10);
      expect(generateId(5).length).toEqual(5);
      expect(generateId(-10).length).toEqual(0);
    });
  });

  describe('createArrayFromObject function tests', () => {
    it('should transform Object to Array', () => {
      const dummyObject = {
        jeff: {
          hello: 'there',
        },
        frank: {
          see: 'you',
        },
        hans: {
          how: 'are you',
        },
      };

      const generatedArray = createArrayFromObject(dummyObject);

      expect(generatedArray).toStrictEqual([
        {
          key: 'jeff',
          instance: {
            hello: 'there',
          },
        },
        {
          key: 'frank',
          instance: {
            see: 'you',
          },
        },
        {
          key: 'hans',
          instance: {
            how: 'are you',
          },
        },
      ]);
    });
  });

  describe('clone function tests', () => {
    it('should clone Object/Class without any reference', () => {
      class DummyClass {
        constructor(
          public id: number,
          public name: string,
          public location: { country: string; state: string }
        ) {}
      }
      const dummyClass = new DummyClass(10, 'jeff', {
        country: 'USA',
        state: 'California',
      });
      const clonedDummyClass = clone(dummyClass);

      expect(dummyClass).toBeInstanceOf(DummyClass);
      expect(clonedDummyClass).toBeInstanceOf(DummyClass);
      expect(dummyClass.name).toBe('jeff');
      expect(dummyClass.id).toBe(10);
      expect(dummyClass.location).toStrictEqual({
        country: 'USA',
        state: 'California',
      });
      expect(clonedDummyClass.name).toBe('jeff');
      expect(clonedDummyClass.id).toBe(10);
      expect(clonedDummyClass.location).toStrictEqual({
        country: 'USA',
        state: 'California',
      });

      dummyClass.name = 'frank';
      dummyClass.location.state = 'Florida';

      expect(dummyClass.name).toBe('frank');
      expect(dummyClass.id).toBe(10);
      expect(dummyClass.location).toStrictEqual({
        country: 'USA',
        state: 'Florida',
      });
      expect(clonedDummyClass.name).toBe('jeff');
      expect(clonedDummyClass.id).toBe(10);
      expect(clonedDummyClass.location).toStrictEqual({
        country: 'USA',
        state: 'California',
      });
    });
  });

  describe('removeProperties function tests', () => {
    it('should remove properties from object and remove reference', () => {
      const myObject = { id: 20, name: 'jeff', age: 10, location: 'Germany' };
      const newObject = removeProperties(myObject, ['location', 'age']);
      newObject['size'] = 100.2;

      expect(myObject).toStrictEqual({
        id: 20,
        name: 'jeff',
        age: 10,
        location: 'Germany',
      });
      expect(newObject).toStrictEqual({ id: 20, name: 'jeff', size: 100.2 });
    });
  });

  describe('globalBind function tests', () => {
    const dummyKey = 'myDummyKey';

    beforeEach(() => {
      globalThis[dummyKey] = undefined;
    });

    it('should bind instance at key globally (default config)', () => {
      globalBind(dummyKey, 'dummyInstance');

      expect(globalThis[dummyKey]).toBe('dummyInstance');
    });

    it("shouldn't overwrite already existing instance at key (default config)", () => {
      globalBind(dummyKey, 'I am first!');

      globalBind(dummyKey, 'dummyInstance');

      expect(globalThis[dummyKey]).toBe('I am first!');
    });

    it('should overwrite already existing instance at key (overwrite = true)', () => {
      globalBind(dummyKey, 'I am first!');

      globalBind(dummyKey, 'dummyInstance', true);

      expect(globalThis[dummyKey]).toBe('dummyInstance');
    });

    it('should print error if something went wrong during the bind process', () => {
      // @ts-ignore | Destroy globalThis
      globalThis = undefined;

      globalBind(dummyKey, 'dummyInstance');

      expect(console.error).toHaveBeenCalledWith(
        `Agile Error: Failed to create global Instance called '${dummyKey}'`
      );
    });
  });
});
