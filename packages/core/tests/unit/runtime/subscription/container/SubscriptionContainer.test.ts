import { Agile, Observer, SubscriptionContainer } from '../../../../../src';
import * as Utils from '@agile-ts/utils';
import { LogMock } from '../../../../helper/logMock';

describe('SubscriptionContainer Tests', () => {
  let dummyAgile: Agile;
  let dummyObserver1: Observer;
  let dummyObserver2: Observer;

  beforeEach(() => {
    jest.clearAllMocks();
    LogMock.mockLogs();

    dummyAgile = new Agile();
    dummyObserver1 = new Observer(dummyAgile, { key: 'dummyObserver1' });
    dummyObserver2 = new Observer(dummyAgile, { key: 'dummyObserver2' });
  });

  it('should create SubscriptionContainer (default config)', () => {
    jest.spyOn(Utils, 'generateId').mockReturnValue('generatedId');

    const subscriptionContainer = new SubscriptionContainer();

    expect(subscriptionContainer.key).toBe('generatedId');
    expect(subscriptionContainer.ready).toBeFalsy();
    expect(subscriptionContainer.subscribers.size).toBe(0);
    expect(subscriptionContainer.isObjectBased).toBeFalsy();
    expect(subscriptionContainer.updatedSubscribers).toStrictEqual([]);
    expect(subscriptionContainer.subscriberKeysWeakMap).toBeUndefined();
    expect(subscriptionContainer.proxyKeyMap).toStrictEqual({});
    expect(subscriptionContainer.isProxyBased).toBeFalsy();
  });

  it('should create SubscriptionContainer (specific config)', () => {
    const subscriptionContainer = new SubscriptionContainer(
      [dummyObserver1, dummyObserver2],
      { key: 'dummyKey', proxyKeyMap: { myState: { paths: [['a', 'b']] } } }
    );

    expect(subscriptionContainer.key).toBe('dummyKey');
    expect(subscriptionContainer.ready).toBeFalsy();
    expect(subscriptionContainer.subscribers.size).toBe(2);
    expect(subscriptionContainer.subscribers.has(dummyObserver1)).toBeTruthy();
    expect(subscriptionContainer.subscribers.has(dummyObserver2)).toBeTruthy();
    expect(subscriptionContainer.isObjectBased).toBeFalsy();
    expect(subscriptionContainer.updatedSubscribers).toStrictEqual([]);
    expect(subscriptionContainer.subscriberKeysWeakMap).toBeUndefined();
    expect(subscriptionContainer.proxyKeyMap).toStrictEqual({
      myState: { paths: [['a', 'b']] },
    });
    expect(subscriptionContainer.isProxyBased).toBeTruthy();
  });
});
