import {
  defineConfig,
  generateId,
  isValidObject,
  Observer,
} from '../../../internal';

export class SubscriptionContainer {
  /**
   * Key/Name identifier of the Subscription Container.
   */
  public key?: SubscriptionContainerKeyType;
  /**
   * Whether the Subscription Container
   * and the Component the Subscription Container represents are ready.
   *
   * When both are ready, the Subscription Container is allowed
   * to trigger rerender on the Component.
   */
  public ready = false;
  /**
   * Unique identifier of the Component the Subscription Container represents.
   */
  public componentId?: ComponentIdType;

  /**
   * Observers that have subscribed the Subscription Container.
   *
   * The subscribed Observers use the Subscription Container
   * as an interface to the Component it represents.
   * Through the Subscription Container, they can easily trigger rerender
   * on the Component, for example, when their value changes.
   *
   * [Learn more..](https://agile-ts.org/docs/core/integration#-subscriptions)
   */
  public subscribers: Set<Observer>;
  /**
   * Temporary stores the subscribed Observers,
   * that were performed by the runtime
   * and are currently running through the update Subscription Container (rerender) process.
   */
  public updatedSubscribers: Array<Observer> = [];

  /**
   * Whether the Subscription Container is object based.
   *
   * An Observer is object based when the subscribed Observers
   * have been provided in an Observer key map.
   * ```
   * {
   *   state1: Observer,
   *   state2: Observer
   * }
   * ```
   * Thus each Observer has its 'external' unique key stored in the 'subscribersWeakMap'.
   *
   * Often Component based Subscriptions are object based,
   * because each Observer requires a unique identifier
   * to be properly represented in the 'updatedData' object sent to the Integration 'updateMethod()'.
   */
  public isObjectBased = false;
  /**
   * Weak map for storing 'external' key identifiers for subscribed Observers.
   *
   * https://stackoverflow.com/questions/29413222/what-are-the-actual-uses-of-es6-weakmap
   */
  public subscriberKeysWeakMap: WeakMap<Observer, string>;

  /**
   * Weak Map for storing selector functions for subscribed Observers.
   *
   * A selector function allows partial subscription to an Observer value.
   * Only when the selected Observer value part changes,
   * the Subscription Container rerender the Component.
   *
   * https://stackoverflow.com/questions/29413222/what-are-the-actual-uses-of-es6-weakmap
   */
  public selectorsWeakMap: SelectorWeakMapType;

  /**
   * A Subscription Container represents a UI-Component in AgileTs
   * that can be subscribed by multiple Observer Instances.
   *
   * These Observers use the Subscription Container as an interface
   * to trigger a rerender on the UI-Component it represents,
   * for example, when their value has changed.
   *
   * @internal
   * @param subs - Observers to be subscribed to the Subscription Container.
   * @param config - Configuration object
   */
  constructor(
    subs: Array<Observer> = [],
    config: SubscriptionContainerConfigInterface = {}
  ) {
    config = defineConfig(config, {
      proxyWeakMap: new WeakMap(),
      selectorWeakMap: new WeakMap(),
      key: generateId(),
    });

    this.subscribers = new Set(subs);
    this.key = config.key;
    this.componentId = config?.componentId;
    this.subscriberKeysWeakMap = new WeakMap();

    // Create a selector function for each specified proxy path
    // that selects the property at the path end
    const selectorWeakMap: SelectorWeakMapType = config.selectorWeakMap as any;
    this.assignProxySelectors(
      selectorWeakMap,
      config.proxyWeakMap as any,
      subs
    );
    this.selectorsWeakMap = selectorWeakMap;
  }

  /**
   * Assigns to the specified `selectorWeakMap` selector functions
   * created based on the paths of the specified Proxy WeakMap.
   *
   * @param selectorWeakMap - Selector WeakMap the created proxy selector functions are added to.
   * @param proxyWeakMap - Proxy Weak Map containing proxy paths for specified Observers in `subs`.
   * @param subs - Observers whose values are to be selected based on the specified `proxyWeakMap`.
   */
  public assignProxySelectors(
    selectorWeakMap: SelectorWeakMapType,
    proxyWeakMap: ProxyWeakMapType,
    subs: Array<Observer>
  ): void {
    for (const observer of subs) {
      const paths = proxyWeakMap.get(observer)?.paths;
      if (paths != null) {
        const selectors: SelectorMethodType[] = [];
        for (const path of paths) {
          selectors.push((value) => {
            let _value = value;
            for (const branch of path) {
              if (!isValidObject(_value, true)) break;
              _value = _value[branch];
            }
            return _value;
          });
        }
        selectorWeakMap.set(observer, { selectors });
      }
    }
  }
}

export type SubscriptionContainerKeyType = string | number;

export interface SubscriptionContainerConfigInterface {
  /**
   * Key/Name identifier of the Subscription Container
   * @default undefined
   */
  key?: SubscriptionContainerKeyType;
  /**
   * Key/Name identifier of the Component to be represented by the Subscription Container.
   * @default undefined
   */
  componentId?: ComponentIdType;
  /**
   * A Weak Map with a set of paths to certain properties
   * in a Observer value for Observers.
   *
   * These paths are then selected via selector functions
   * which allow the partly subscription to an Observer value.
   * Only if the selected Observer value part changes,
   * the Subscription Container rerender the Component.
   *
   * For example:
   * ```
   * WeakMap: {
   *   Observer1: {paths: [['data', 'name']]},
   *   Observer2: {paths: [['car', 'speed']]}
   * }
   * ```
   * Now the Subscription Container will only trigger a rerender on the Component
   * if 'data.name' in Observer1 or 'car.speed' in Observer2 changes.
   * If, for instance, 'data.age' in Observer1 mutates it won't trigger a rerender,
   * since 'data.age' isn't represented in the Proxy Weak Map.
   *
   * These particular paths were tracked via the ProxyTree.
   * https://github.com/agile-ts/agile/tree/master/packages/proxytree
   *
   * @default new WeakMap()
   */
  proxyWeakMap?: ProxyWeakMapType;
  /**
   * A Weak Map with a set of selector functions for Observers.
   *
   * A selector functions allows the partly subscription to an Observer value.
   * Only if the selected Observer value part changes,
   * the Subscription Container rerender the Component.
   *
   * @default new WeakMap()
   */
  selectorWeakMap?: SelectorWeakMapType;
}

export type ProxyWeakMapType = WeakMap<Observer, { paths: string[][] }>;

export type SelectorWeakMapType<T = any> = WeakMap<
  Observer,
  { selectors: SelectorMethodType<T>[] }
>;
export type SelectorMethodType<T = any> = (value: T) => any;

export type ComponentIdType = string | number;
