import {
  Agile,
  CallbackSubscriptionContainer,
  Observer,
} from '../../../../../src';
import mockConsole from 'jest-mock-console';

describe('CallbackSubscriptionContainer Tests', () => {
  let dummyAgile: Agile;
  let dummyObserver1: Observer;
  let dummyObserver2: Observer;

  beforeEach(() => {
    jest.clearAllMocks();
    mockConsole(['error', 'warn']);

    dummyAgile = new Agile();
    dummyObserver1 = new Observer(dummyAgile, { key: 'dummyObserver1' });
    dummyObserver2 = new Observer(dummyAgile, { key: 'dummyObserver2' });
  });

  it('should create CallbackSubscriptionContainer', () => {
    const dummyIntegration = () => {
      /* empty function */
    };

    const subscriptionContainer = new CallbackSubscriptionContainer(
      dummyIntegration,
      [dummyObserver1, dummyObserver2],
      { key: 'dummyKey', proxyKeyMap: { myState: { paths: [['hi']] } } }
    );

    expect(subscriptionContainer.callback).toBe(dummyIntegration);

    expect(subscriptionContainer.key).toBe('dummyKey');
    expect(subscriptionContainer.ready).toBeFalsy();
    expect(subscriptionContainer.subs.size).toBe(2);
    expect(subscriptionContainer.subs.has(dummyObserver1)).toBeTruthy();
    expect(subscriptionContainer.subs.has(dummyObserver2)).toBeTruthy();
    expect(subscriptionContainer.isObjectBased).toBeFalsy();
    expect(subscriptionContainer.observerKeysToUpdate).toStrictEqual([]);
    expect(subscriptionContainer.subsObject).toBeUndefined();
    expect(subscriptionContainer.proxyKeyMap).toStrictEqual({
      myState: { paths: [['hi']] },
    });
    expect(subscriptionContainer.proxyBased).toBeTruthy();
  });
});
