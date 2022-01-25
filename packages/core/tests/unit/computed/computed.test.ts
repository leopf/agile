import {
  Computed,
  Agile,
  StateObserver,
  Observer,
  State,
  ComputedTracker,
  EnhancedState,
} from '../../../src';
import * as Utils from '../../../src/utils';
import * as AgileUtils from '@agile-ts/utils';
import { LogMock } from '../../helper/logMock';
import waitForExpect from 'wait-for-expect';

describe('Computed Tests', () => {
  let dummyAgile: Agile;

  beforeEach(() => {
    LogMock.mockLogs();

    dummyAgile = new Agile();

    jest.spyOn(Computed.prototype, 'recompute');
    jest.spyOn(Utils, 'extractRelevantObservers');

    jest.clearAllMocks();
  });

  describe('watch function tests', () => {
    let dummyCallbackFunction;
    let counterState: EnhancedState<number>;
    let numberState: Computed<number>;

    beforeEach(() => {
      counterState = new EnhancedState<number>(dummyAgile, 10, {
        key: 'numberStateKey',
      });
      numberState = new Computed(dummyAgile, () => counterState.value * 2);

      jest.spyOn(numberState, 'addSideEffect');
      dummyCallbackFunction = jest.fn();
    });

    it('should add passed watcherFunction to watchers at passed key', () => {
      const response = numberState.watch('dummyKey', dummyCallbackFunction);

      expect(response).toBe(numberState);
      expect(numberState.addSideEffect).toHaveBeenCalledWith(
        'dummyKey',
        expect.any(Function),
        { weight: 0 }
      );

      // Test whether registered callback function is called
      numberState.sideEffects['dummyKey'].callback(numberState);
      expect(dummyCallbackFunction).toHaveBeenCalledWith(
        numberState._value,
        'dummyKey'
      );
    });

    it('should add passed watcherFunction to watchers at random key if no key passed and return that generated key', () => {
      jest.spyOn(AgileUtils, 'generateId').mockReturnValue('randomKey');

      const response = numberState.watch(dummyCallbackFunction);

      expect(response).toBe('randomKey');
      expect(numberState.addSideEffect).toHaveBeenCalledWith(
        'randomKey',
        expect.any(Function),
        { weight: 0 }
      );
      expect(AgileUtils.generateId).toHaveBeenCalled();

      // Test whether registered callback function is called
      numberState.sideEffects['randomKey'].callback(numberState);
      expect(dummyCallbackFunction).toHaveBeenCalledWith(
        numberState._value,
        'randomKey'
      );
    });

    it("shouldn't add passed invalid watcherFunction to watchers at passed key", () => {
      const response = numberState.watch(
        'dummyKey',
        'noFunction hehe' as any
      );

      expect(response).toBe(numberState);
      expect(numberState.addSideEffect).not.toHaveBeenCalled();
      LogMock.hasLoggedCode('00:03:01', ['Watcher Callback', 'function']);
    });
  });

  it('should create Computed with a not async compute method (default config)', () => {
    const computedFunction = () => 'computedValue';

    const computed = new Computed(dummyAgile, computedFunction);

    expect(computed.computeFunction).toBe(computedFunction);
    expect(computed.config).toStrictEqual({ autodetect: true });
    expect(computed.isComputed).toBeTruthy();
    expect(Array.from(computed.deps)).toStrictEqual([]);
    expect(computed.hardCodedDeps).toStrictEqual([]);
    expect(Utils.extractRelevantObservers).toHaveBeenCalledWith([]);

    expect(computed.recompute).toHaveBeenCalledWith({
      autodetect: computed.config.autodetect,
      overwrite: true,
    });

    // Check if State was called with correct parameters
    expect(computed._key).toBeUndefined();
    expect(computed.isSet).toBeFalsy();
    expect(computed.isPlaceholder).toBeFalsy();
    expect(computed.initialStateValue).toBe(computedFunction());
    expect(computed._value).toBe(computedFunction());
    expect(computed.previousStateValue).toBe(computedFunction());
    expect(computed.nextStateValue).toBe(computedFunction());
    expect(computed.observers['value']).toBeInstanceOf(StateObserver);
    expect(Array.from(computed.observers['value'].dependents)).toStrictEqual(
      []
    );
    expect(computed.observers['value'].key).toBeUndefined();
    expect(computed.sideEffects).toStrictEqual({});
  });

  it('should create Computed with a not async compute method (specific config)', () => {
    const dummyObserver1 = new Observer(dummyAgile);
    dummyObserver1.addDependent = jest.fn();
    const dummyObserver2 = new Observer(dummyAgile);
    dummyObserver2.addDependent = jest.fn();
    const dummyState = new State(dummyAgile, undefined);
    const dummyStateObserver = new StateObserver(dummyState);
    dummyStateObserver.addDependent = jest.fn();
    dummyState.observers['value'] = dummyStateObserver;
    const computedFunction = () => 'computedValue';

    const computed = new Computed(dummyAgile, computedFunction, {
      key: 'coolComputed',
      dependents: [dummyObserver1],
      computedDeps: [dummyObserver2, undefined as any, dummyState],
      autodetect: false,
      initialValue: 'initialValue',
    });

    expect(computed.computeFunction).toBe(computedFunction);
    expect(computed.config).toStrictEqual({ autodetect: false });
    expect(computed.isComputed).toBeTruthy();
    expect(Array.from(computed.deps)).toStrictEqual([
      dummyObserver2,
      dummyStateObserver,
    ]);
    expect(computed.hardCodedDeps).toStrictEqual([
      dummyObserver2,
      dummyStateObserver,
    ]);
    expect(Utils.extractRelevantObservers).toHaveBeenCalledWith([
      dummyObserver2,
      undefined,
      dummyState,
    ]);

    expect(computed.recompute).toHaveBeenCalledWith({
      autodetect: computed.config.autodetect,
      overwrite: true,
    });

    expect(dummyObserver1.addDependent).not.toHaveBeenCalled(); // Because no Computed dependent
    expect(dummyObserver2.addDependent).toHaveBeenCalledWith(
      computed.observers['value']
    );
    expect(dummyStateObserver.addDependent).toHaveBeenCalledWith(
      computed.observers['value']
    );

    // Check if State was called with correct parameters
    expect(computed._key).toBe('coolComputed');
    expect(computed.isSet).toBeFalsy();
    expect(computed.isPlaceholder).toBeFalsy();
    expect(computed.initialStateValue).toBe('initialValue');
    expect(computed._value).toBe('initialValue');
    expect(computed.previousStateValue).toBe('initialValue');
    expect(computed.nextStateValue).toBe('initialValue');
    expect(computed.observers['value']).toBeInstanceOf(StateObserver);
    expect(Array.from(computed.observers['value'].dependents)).toStrictEqual([
      dummyObserver1,
    ]);
    expect(computed.observers['value'].key).toBe('coolComputed');
    expect(computed.sideEffects).toStrictEqual({});
  });

  it('should create Computed with an async compute method (default config)', () => {
    const computedFunction = async () => 'computedValue';

    const computed = new Computed(dummyAgile, computedFunction);

    expect(computed.computeFunction).toBe(computedFunction);
    expect(computed.config).toStrictEqual({ autodetect: false });
    expect(computed.isComputed).toBeTruthy();
    expect(Array.from(computed.deps)).toStrictEqual([]);
    expect(computed.hardCodedDeps).toStrictEqual([]);
    expect(Utils.extractRelevantObservers).toHaveBeenCalledWith([]);

    expect(computed.recompute).toHaveBeenCalledWith({
      autodetect: computed.config.autodetect,
      overwrite: true,
    });

    // Check if State was called with correct parameters
    expect(computed._key).toBeUndefined();
    expect(computed.isSet).toBeFalsy();
    expect(computed.isPlaceholder).toBeFalsy();
    expect(computed.initialStateValue).toBe(null);
    expect(computed._value).toBe(null);
    expect(computed.previousStateValue).toBe(null);
    expect(computed.nextStateValue).toBe(null);
    expect(computed.observers['value']).toBeInstanceOf(StateObserver);
    expect(Array.from(computed.observers['value'].dependents)).toStrictEqual(
      []
    );
    expect(computed.observers['value'].key).toBeUndefined();
    expect(computed.sideEffects).toStrictEqual({});
  });

  describe('Computed Function Tests', () => {
    let computed: Computed;
    const dummyComputeFunction = jest.fn(() => 'computedValue');

    beforeEach(() => {
      computed = new Computed(dummyAgile, dummyComputeFunction);
    });

    describe('recompute function tests', () => {
      beforeEach(() => {
        computed.observers['value'].ingestValue = jest.fn();
      });

      it('should ingest Computed Class into the Runtime (default config)', async () => {
        computed.compute = jest.fn(() => Promise.resolve('jeff'));

        computed.recompute();

        expect(computed.compute).toHaveBeenCalledWith({ autodetect: false });
        await waitForExpect(() => {
          expect(computed.observers['value'].ingestValue).toHaveBeenCalledWith(
            'jeff',
            {
              autodetect: false, // Not required but passed for simplicity
            }
          );
        });
      });

      it('should ingest Computed Class into the Runtime (specific config)', async () => {
        computed.compute = jest.fn(() => Promise.resolve('jeff'));

        computed.recompute({
          autodetect: true,
          background: true,
          sideEffects: {
            enabled: false,
          },
          force: false,
          key: 'jeff',
        });

        expect(computed.compute).toHaveBeenCalledWith({ autodetect: true });
        await waitForExpect(() => {
          expect(computed.observers['value'].ingestValue).toHaveBeenCalledWith(
            'jeff',
            {
              background: true,
              sideEffects: {
                enabled: false,
              },
              force: false,
              key: 'jeff',
              autodetect: true, // Not required but passed for simplicity
            }
          );
        });
      });
    });

    describe('updateComputeFunction function tests', () => {
      const newComputeFunction = () => 'newComputedValue';
      let dummyObserver: Observer;
      let oldDummyObserver: Observer;
      let dummyStateObserver: StateObserver;
      let dummyState: State;

      beforeEach(() => {
        dummyObserver = new Observer(dummyAgile);
        dummyObserver.removeDependent = jest.fn();
        dummyObserver.addDependent = jest.fn();

        oldDummyObserver = new Observer(dummyAgile);
        oldDummyObserver.removeDependent = jest.fn();
        oldDummyObserver.addDependent = jest.fn();

        dummyState = new State(dummyAgile, undefined);
        dummyStateObserver = new StateObserver(dummyState);
        dummyStateObserver.removeDependent = jest.fn();
        dummyStateObserver.addDependent = jest.fn();
        dummyState.observers['value'] = dummyStateObserver;

        computed.hardCodedDeps = [oldDummyObserver];
        computed.deps = new Set([oldDummyObserver]);
      });

      it('should updated computeFunction and overwrite its dependencies (default config)', () => {
        computed.config.autodetect = 'dummyBoolean' as any;

        computed.updateComputeFunction(newComputeFunction, [
          dummyState,
          dummyObserver,
        ]);

        expect(computed.hardCodedDeps).toStrictEqual([
          dummyStateObserver,
          dummyObserver,
        ]);
        expect(Array.from(computed.deps)).toStrictEqual([
          dummyStateObserver,
          dummyObserver,
        ]);
        expect(computed.computeFunction).toBe(newComputeFunction);
        expect(computed.recompute).toHaveBeenCalledWith({
          autodetect: computed.config.autodetect,
        });

        expect(Utils.extractRelevantObservers).toHaveBeenCalledWith([
          dummyState,
          dummyObserver,
        ]);

        // Make this Observer no longer depend on the old dep Observers
        expect(oldDummyObserver.removeDependent).toHaveBeenCalledWith(
          computed.observers['value']
        );
        expect(dummyStateObserver.removeDependent).not.toHaveBeenCalled();
        expect(dummyObserver.removeDependent).not.toHaveBeenCalled();

        // Make this Observer depend on the new hard coded dep Observers
        expect(oldDummyObserver.addDependent).not.toHaveBeenCalled();
        expect(dummyStateObserver.addDependent).toHaveBeenCalledWith(
          computed.observers['value']
        );
        expect(dummyObserver.addDependent).toHaveBeenCalledWith(
          computed.observers['value']
        );
      });

      it('should updated computeFunction and overwrite its dependencies (specific config)', () => {
        computed.updateComputeFunction(
          newComputeFunction,
          [dummyState, dummyObserver],
          {
            background: true,
            sideEffects: {
              enabled: false,
            },
            key: 'jeff',
            force: true,
            autodetect: false,
          }
        );

        expect(computed.hardCodedDeps).toStrictEqual([
          dummyStateObserver,
          dummyObserver,
        ]);
        expect(Array.from(computed.deps)).toStrictEqual([
          dummyStateObserver,
          dummyObserver,
        ]);
        expect(computed.computeFunction).toBe(newComputeFunction);
        expect(computed.recompute).toHaveBeenCalledWith({
          background: true,
          sideEffects: {
            enabled: false,
          },
          key: 'jeff',
          force: true,
          autodetect: false,
        });

        expect(Utils.extractRelevantObservers).toHaveBeenCalledWith([
          dummyState,
          dummyObserver,
        ]);

        // Make this Observer no longer depend on the old dep Observers
        expect(oldDummyObserver.removeDependent).toHaveBeenCalledWith(
          computed.observers['value']
        );
        expect(dummyStateObserver.removeDependent).not.toHaveBeenCalled();
        expect(dummyObserver.removeDependent).not.toHaveBeenCalled();

        // Make this Observer depend on the new hard coded dep Observers
        expect(oldDummyObserver.addDependent).not.toHaveBeenCalled();
        expect(dummyStateObserver.addDependent).toHaveBeenCalledWith(
          computed.observers['value']
        );
        expect(dummyObserver.addDependent).toHaveBeenCalledWith(
          computed.observers['value']
        );
      });
    });

    describe('compute function tests', () => {
      let dummyObserver1: Observer;
      let dummyObserver2: Observer;
      let dummyObserver3: Observer;
      let dummyObserver4: Observer;

      beforeEach(() => {
        dummyObserver1 = new Observer(dummyAgile);
        jest.spyOn(dummyObserver1, 'addDependent');
        jest.spyOn(dummyObserver1, 'removeDependent');

        dummyObserver2 = new Observer(dummyAgile);
        jest.spyOn(dummyObserver2, 'addDependent');
        jest.spyOn(dummyObserver2, 'removeDependent');

        dummyObserver3 = new Observer(dummyAgile);
        jest.spyOn(dummyObserver3, 'addDependent');
        jest.spyOn(dummyObserver3, 'removeDependent');

        dummyObserver4 = new Observer(dummyAgile);
        jest.spyOn(dummyObserver4, 'addDependent');
        jest.spyOn(dummyObserver4, 'removeDependent');

        computed.hardCodedDeps = [dummyObserver3];
        computed.deps = new Set([dummyObserver3, dummyObserver4]);

        // mockClear because otherwise the static mock doesn't get reset after each '.it()' test
        jest.spyOn(ComputedTracker, 'track').mockClear();
        jest.spyOn(ComputedTracker, 'getTrackedObservers').mockClear();
      });

      it(
        'should call computeFunction ' +
          'and track dependencies the computeFunction depends on (config.autodetect = true)',
        async () => {
          jest
            .spyOn(ComputedTracker, 'getTrackedObservers')
            .mockReturnValueOnce([dummyObserver1, dummyObserver2]);
          computed.computeFunction = jest.fn(() => 'newComputedValue');

          const response = await computed.compute({ autodetect: true });

          expect(response).toBe('newComputedValue');
          expect(dummyComputeFunction).toHaveBeenCalled();

          // Tracking
          expect(ComputedTracker.track).toHaveBeenCalled();
          expect(ComputedTracker.getTrackedObservers).toHaveBeenCalled();
          expect(computed.hardCodedDeps).toStrictEqual([dummyObserver3]);
          expect(Array.from(computed.deps)).toStrictEqual([
            dummyObserver3,
            dummyObserver1,
            dummyObserver2,
          ]);

          // Clean up old dependencies
          expect(dummyObserver1.removeDependent).not.toHaveBeenCalled();
          expect(dummyObserver2.removeDependent).not.toHaveBeenCalled();
          expect(dummyObserver3.removeDependent).not.toHaveBeenCalled();
          expect(dummyObserver4.removeDependent).toHaveBeenCalledWith(
            computed.observers['value']
          );

          // Make this Observer depend on the newly found dep Observers
          expect(dummyObserver1.addDependent).toHaveBeenCalledWith(
            computed.observers['value']
          );
          expect(dummyObserver2.addDependent).toHaveBeenCalledWith(
            computed.observers['value']
          );
          expect(dummyObserver3.addDependent).not.toHaveBeenCalled(); // Because Computed already depends on the 'dummyObserver3'
          expect(dummyObserver4.addDependent).not.toHaveBeenCalled();
        }
      );

      it(
        'should call computeFunction ' +
          "and shouldn't track dependencies the computeFunction depends on (config.autodetect = false)",
        async () => {
          computed.computeFunction = jest.fn(async () => {
            await new Promise((resolve) => setTimeout(resolve, 500));
            return 'newComputedValue';
          });

          const response = await computed.compute({ autodetect: false });

          expect(response).toBe('newComputedValue');
          expect(dummyComputeFunction).toHaveBeenCalled();

          // Tracking
          expect(ComputedTracker.track).not.toHaveBeenCalled();
          expect(ComputedTracker.getTrackedObservers).not.toHaveBeenCalled();
          expect(computed.hardCodedDeps).toStrictEqual([dummyObserver3]);
          expect(Array.from(computed.deps)).toStrictEqual([
            dummyObserver3,
            dummyObserver4,
          ]);

          expect(dummyObserver1.removeDependent).not.toHaveBeenCalled();
          expect(dummyObserver2.removeDependent).not.toHaveBeenCalled();
          expect(dummyObserver3.removeDependent).not.toHaveBeenCalled();
          expect(dummyObserver4.removeDependent).not.toHaveBeenCalled();

          expect(dummyObserver1.addDependent).not.toHaveBeenCalled();
          expect(dummyObserver2.addDependent).not.toHaveBeenCalled();
          expect(dummyObserver3.addDependent).not.toHaveBeenCalled();
          expect(dummyObserver4.addDependent).not.toHaveBeenCalled();
        }
      );
    });
  });
});
