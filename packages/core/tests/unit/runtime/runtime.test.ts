import {
  Agile,
  CallbackSubscriptionContainer,
  ComponentSubscriptionContainer,
  RuntimeJob,
  Observer,
  Runtime,
  SubscriptionContainer,
} from '../../../src';
import * as Utils from '@agile-ts/utils';
import testIntegration from '../../helper/test.integration';
import { LogMock } from '../../helper/logMock';

describe('Runtime Tests', () => {
  let dummyAgile: Agile;

  beforeEach(() => {
    jest.clearAllMocks();
    LogMock.mockLogs();

    dummyAgile = new Agile({ localStorage: false });
  });

  it('should create Runtime', () => {
    const runtime = new Runtime(dummyAgile);

    expect(runtime.currentJob).toBeNull();
    expect(runtime.jobQueue).toStrictEqual([]);
    expect(runtime.notReadyJobsToRerender.size).toBe(0);
    expect(runtime.jobsToRerender).toStrictEqual([]);
  });

  describe('Runtime Function Tests', () => {
    let runtime: Runtime;
    let dummyObserver1: Observer;
    let dummyObserver2: Observer;
    let dummyObserver3: Observer;

    beforeEach(() => {
      runtime = new Runtime(dummyAgile);
      dummyObserver1 = new Observer(dummyAgile, { key: 'dummyObserver1' });
      dummyObserver2 = new Observer(dummyAgile, { key: 'dummyObserver2' });
      dummyObserver3 = new Observer(dummyAgile, { key: 'dummyObserver3' });
    });

    describe('ingest function tests', () => {
      let dummyJob: RuntimeJob;

      beforeEach(() => {
        dummyJob = new RuntimeJob(dummyObserver1);

        runtime.perform = jest.fn();
      });

      it('should perform passed Job (default config)', () => {
        runtime.ingest(dummyJob);

        expect(runtime.jobQueue.length).toBe(0);
        expect(runtime.perform).toHaveBeenCalledWith(dummyJob);
      });

      it("shouldn't perform passed Job (config.perform = false)", () => {
        runtime.ingest(dummyJob, { perform: false });

        expect(runtime.jobQueue.length).toBe(1);
        expect(runtime.jobQueue[0]).toBe(dummyJob);
        expect(runtime.perform).not.toHaveBeenCalled();
      });
    });

    describe('perform function tests', () => {
      let dummyJob1: RuntimeJob;
      let dummyJob2: RuntimeJob;
      let dummyJob3: RuntimeJob;

      beforeEach(() => {
        dummyJob1 = new RuntimeJob(dummyObserver1, { key: 'dummyJob1' });
        dummyJob2 = new RuntimeJob(dummyObserver2, { key: 'dummyJob2' });
        dummyJob3 = new RuntimeJob(dummyObserver1, { key: 'dummyJob3' });
        dummyJob1.rerender = true;
        dummyJob2.rerender = true;
        dummyJob3.rerender = false;

        runtime.updateSubscribers = jest.fn();
        jest.spyOn(dummyObserver1, 'perform');
        jest.spyOn(dummyObserver2, 'perform');
        dummyObserver1.ingest = jest.fn();
        dummyObserver2.ingest = jest.fn();
      });

      it('should perform passed and all in jobQueue remaining Jobs and call updateSubscribers', async () => {
        runtime.jobQueue.push(dummyJob2);
        runtime.jobQueue.push(dummyJob3);

        runtime.perform(dummyJob1);

        expect(dummyObserver1.perform).toHaveBeenCalledWith(dummyJob1);
        expect(dummyJob1.performed).toBeTruthy();
        expect(dummyObserver2.perform).toHaveBeenCalledWith(dummyJob2);
        expect(dummyJob2.performed).toBeTruthy();
        expect(dummyObserver1.perform).toHaveBeenCalledWith(dummyJob3);
        expect(dummyJob3.performed).toBeTruthy();

        expect(runtime.jobQueue.length).toBe(0);
        expect(runtime.jobsToRerender.length).toBe(2);
        expect(runtime.jobsToRerender.includes(dummyJob1)).toBeTruthy();
        expect(runtime.jobsToRerender.includes(dummyJob2)).toBeTruthy();
        expect(runtime.jobsToRerender.includes(dummyJob3)).toBeFalsy();

        // Sleep 5ms because updateSubscribers get called in Timeout
        await new Promise((resolve) => setTimeout(resolve, 5));

        expect(runtime.updateSubscribers).toHaveBeenCalledTimes(1);
      });

      it('should perform passed Job and update it dependents', async () => {
        dummyJob1.observer.dependents.add(dummyObserver2);
        dummyJob1.observer.dependents.add(dummyObserver1);

        runtime.perform(dummyJob1);

        expect(dummyObserver1.perform).toHaveBeenCalledWith(dummyJob1);
        expect(dummyJob1.performed).toBeTruthy();

        expect(dummyObserver1.ingest).toHaveBeenCalledWith({
          perform: false,
        });
        expect(dummyObserver1.ingest).toHaveBeenCalledTimes(1);
        expect(dummyObserver2.ingest).toHaveBeenCalledWith({
          perform: false,
        });
        expect(dummyObserver2.ingest).toHaveBeenCalledTimes(1);
      });

      it("should perform passed and all in jobQueue remaining Jobs and shouldn't call updateSubscribes if no job needs to rerender", async () => {
        dummyJob1.rerender = false;
        runtime.jobQueue.push(dummyJob3);

        runtime.perform(dummyJob1);

        expect(dummyObserver1.perform).toHaveBeenCalledWith(dummyJob1);
        expect(dummyJob1.performed).toBeTruthy();
        expect(dummyObserver1.perform).toHaveBeenCalledWith(dummyJob3);
        expect(dummyJob3.performed).toBeTruthy();

        expect(runtime.jobQueue.length).toBe(0);
        expect(runtime.jobsToRerender.length).toBe(0);

        // Sleep 5ms because updateSubscribers get called in Timeout
        await new Promise((resolve) => setTimeout(resolve, 5));

        expect(runtime.updateSubscribers).not.toHaveBeenCalled();
      });
    });

    describe('updateSubscriptions function tests', () => {
      // TODO
    });

    describe('extractToUpdateSubscriptionContainer function tests', () => {
      // TODO
    });

    describe('updateSubscriptionContainer function tests', () => {
      // TODO
    });

    describe('getUpdatedObserverValues function tests', () => {
      let subscriptionContainer: SubscriptionContainer;
      const dummyFunction = () => {
        /* empty function */
      };

      beforeEach(() => {
        subscriptionContainer = dummyAgile.subController.subscribe(
          dummyFunction,
          {
            observer1: dummyObserver1,
            observer2: dummyObserver2,
            observer3: dummyObserver3,
          }
        ).subscriptionContainer;
        dummyObserver1.value = 'dummyObserverValue1';
        dummyObserver3.value = 'dummyObserverValue3';
      });

      it('should build Observer Value Object out of observerKeysToUpdate and Value of Observer', () => {
        subscriptionContainer.updatedSubscribers.push('observer1');
        subscriptionContainer.updatedSubscribers.push('observer2');
        subscriptionContainer.updatedSubscribers.push('observer3');

        const props = runtime.getUpdatedObserverValues(subscriptionContainer);

        expect(props).toStrictEqual({
          observer1: 'dummyObserverValue1',
          observer2: undefined,
          observer3: 'dummyObserverValue3',
        });
        expect(subscriptionContainer.updatedSubscribers).toStrictEqual([]);
      });
    });

    describe('handleSelector function tests', () => {
      let objectSubscriptionContainer: SubscriptionContainer;
      const dummyFunction = () => {
        /* empty function */
      };
      let objectJob: RuntimeJob;

      let arraySubscriptionContainer: SubscriptionContainer;
      const dummyFunction2 = () => {
        /* empty function */
      };
      let arrayJob: RuntimeJob;

      beforeEach(() => {
        // Create Job with Object value
        objectSubscriptionContainer = dummyAgile.subController.subscribe(
          dummyFunction,
          { observer1: dummyObserver1 }
        ).subscriptionContainer;
        dummyObserver1.value = {
          key: 'dummyObserverValue1',
          data: { name: 'jeff' },
        };
        dummyObserver1.previousValue = {
          key: 'dummyObserverValue1',
          data: { name: 'jeff' },
        };
        objectSubscriptionContainer.isProxyBased = true;
        objectSubscriptionContainer.proxyKeyMap = {
          [dummyObserver1._key || 'unknown']: { paths: [['data', 'name']] },
        };

        objectJob = new RuntimeJob(dummyObserver1, { key: 'dummyObjectJob1' });

        // Create Job with Array value
        arraySubscriptionContainer = dummyAgile.subController.subscribeWithSubsObject(
          dummyFunction2,
          { observer2: dummyObserver2 }
        ).subscriptionContainer;
        dummyObserver2.value = [
          {
            key: 'dummyObserver2Value1',
            data: { name: 'jeff' },
          },
          {
            key: 'dummyObserver2Value2',
            data: { name: 'hans' },
          },
        ];
        dummyObserver2.previousValue = [
          {
            key: 'dummyObserver2Value1',
            data: { name: 'jeff' },
          },
          {
            key: 'dummyObserver2Value2',
            data: { name: 'hans' },
          },
        ];
        arraySubscriptionContainer.isProxyBased = true;
        arraySubscriptionContainer.proxyKeyMap = {
          [dummyObserver2._key || 'unknown']: {
            paths: [['0', 'data', 'name']],
          },
        };

        arrayJob = new RuntimeJob(dummyObserver2, { key: 'dummyObjectJob2' });

        jest.spyOn(Utils, 'notEqual');

        // Because not equals is called once during the creation of the subscriptionContainer
        jest.clearAllMocks();
      });

      it("should return true if subscriptionContainer isn't proxy based", () => {
        objectSubscriptionContainer.isProxyBased = false;

        const response = runtime.handleSelectors(
          objectSubscriptionContainer,
          objectJob
        );

        expect(response).toBeTruthy();
        expect(Utils.notEqual).not.toHaveBeenCalled();
      });

      it('should return true if observer the job represents has no key', () => {
        objectJob.observer._key = undefined;

        const response = runtime.handleSelectors(
          objectSubscriptionContainer,
          objectJob
        );

        expect(response).toBeTruthy();
        expect(Utils.notEqual).not.toHaveBeenCalled();
      });

      it("should return true if the observer key isn't represented in the proxyKeyMap", () => {
        objectSubscriptionContainer.proxyKeyMap = {
          unknownKey: { paths: [['a', 'b']] },
        };

        const response = runtime.handleSelectors(
          objectSubscriptionContainer,
          objectJob
        );

        expect(response).toBeTruthy();
        expect(Utils.notEqual).not.toHaveBeenCalled();
      });

      it('should return true if used property has changed (object value)', () => {
        dummyObserver1.value = {
          key: 'dummyObserverValue1',
          data: { name: 'hans' },
        };

        const response = runtime.handleSelectors(
          objectSubscriptionContainer,
          objectJob
        );

        expect(response).toBeTruthy();
        expect(Utils.notEqual).toHaveBeenCalledWith(
          dummyObserver1.value.data.name,
          dummyObserver1.previousValue.data.name
        );
      });

      it("should return false if used property hasn't changed (object value)", () => {
        const response = runtime.handleSelectors(
          objectSubscriptionContainer,
          objectJob
        );

        expect(response).toBeFalsy();
        expect(Utils.notEqual).toHaveBeenCalledWith(
          dummyObserver1.value.data.name,
          dummyObserver1.previousValue.data.name
        );
      });

      it('should return true if used property has changed in the deepness (object value)', () => {
        dummyObserver1.value = {
          key: 'dummyObserverValue1',
        };
        dummyObserver1.previousValue = {
          key: 'dummyObserverValue1',
          data: { name: undefined },
        };

        const response = runtime.handleSelectors(
          objectSubscriptionContainer,
          objectJob
        );

        expect(response).toBeTruthy();
        expect(Utils.notEqual).toHaveBeenCalledWith(undefined, undefined);
      });

      it('should return true if used property has changed (array value)', () => {
        dummyObserver2.value = [
          {
            key: 'dummyObserver2Value1',
            data: { name: 'frank' },
          },
          {
            key: 'dummyObserver2Value2',
            data: { name: 'hans' },
          },
        ];

        const response = runtime.handleSelectors(
          arraySubscriptionContainer,
          arrayJob
        );

        expect(response).toBeTruthy();
        expect(Utils.notEqual).toHaveBeenCalledWith(
          dummyObserver2.value['0'].data.name,
          dummyObserver2.previousValue['0'].data.name
        );
      });

      it("should return false if used property hasn't changed (array value)", () => {
        const response = runtime.handleSelectors(
          arraySubscriptionContainer,
          arrayJob
        );

        expect(response).toBeFalsy();
        expect(Utils.notEqual).toHaveBeenCalledWith(
          dummyObserver2.value['0'].data.name,
          dummyObserver2.previousValue['0'].data.name
        );
      });
    });
  });
});
