import { defineConfig, Observer, SubscriptionContainer } from '../internal';

export class RuntimeJob<ObserverType extends Observer = Observer> {
  public config: RuntimeJobConfigInterface;

  // Key/Name identifier of the Runtime Job
  public _key?: RuntimeJobKey;
  // Observer the Job represents
  public observer: ObserverType;
  // Whether the Subscription Containers (UI-Components) of the Observer should be updated (re-rendered)
  public rerender: boolean;
  // Subscription Containers (UI-Components) of the Observer that have to be updated (re-rendered)
  public subscriptionContainersToUpdate = new Set<SubscriptionContainer>();
  // How often not ready Subscription Containers of the Observer have been tried to update
  public timesTriedToUpdateCount = 0;

  // Whether the Job has been performed by the runtime
  public performed = false;

  /**
   * A Runtime Job is sent to the Runtime on behalf of the Observer it represents.
   *
   * In the Runtime, the Observer is performed via its `perform()` method
   * and the Subscription Containers (UI-Components)
   * to which it is subscribed are updated (re-rendered) accordingly.
   *
   * @internal
   * @param observer - Observer to be represented by the Runtime Job.
   * @param config - Configuration object
   */
  constructor(
    observer: ObserverType,
    config: CreateRuntimeJobConfigInterface = {}
  ) {
    config = defineConfig(config, {
      background: false,
      sideEffects: {
        enabled: true,
        exclude: [],
      },
      force: false,
      maxTriesToUpdate: 3,
      any: {},
    });

    this.config = {
      background: config.background,
      force: config.force,
      sideEffects: config.sideEffects,
      maxTriesToUpdate: config.maxTriesToUpdate,
      any: config.any,
    };
    this.observer = observer;
    this.rerender =
      !config.background &&
      this.observer.agileInstance().integrations.hasIntegration();
    this._key = config.key;
    this.subscriptionContainersToUpdate = new Set(observer.subscribedTo);
  }

  /**
   * Updates the key/name identifier of the Runtime Job.
   *
   * @public
   * @param value - New key/name identifier.
   */
  public set key(value: RuntimeJobKey | undefined) {
    this._key = value;
  }

  /**
   * Returns the key/name identifier of the Runtime Job.
   *
   * @public
   */
  public get key(): RuntimeJobKey | undefined {
    return this._key;
  }
}

export type RuntimeJobKey = string | number;

export interface CreateRuntimeJobConfigInterface
  extends RuntimeJobConfigInterface {
  /**
   * Key/Name identifier of the Runtime Job.
   * @default undefined
   */
  key?: RuntimeJobKey;
}

export interface RuntimeJobConfigInterface {
  /**
   * Whether to perform the Runtime Job in background.
   * So that the Subscription Containers (UI-Components) aren't notified
   * of these changes and thus doesn't update (re-render).
   * @default false
   */
  background?: boolean;
  /**
   * Configuration of the execution of defined side effects.
   * @default {enabled: true, exclude: []}
   */
  sideEffects?: SideEffectConfigInterface;
  /**
   * Whether the Runtime Job should be forced through the runtime
   * although it might be useless from the current viewpoint of the runtime.
   * @default false
   */
  force?: boolean;
  /**
   * How often the Runtime should try to update not ready Subscription Containers
   * subscribed by the Observer which the Job represents.
   *
   * When `null` the Runtime tries to update the not ready Subscription Containers
   * until they are ready (infinite).
   * @default 3
   */
  maxTriesToUpdate?: number | null;
  /**
   * Anything unrelated that might be required by a side effect.
   */
  any?: any;
}

export interface SideEffectConfigInterface {
  /**
   * Whether to execute the defined side effects.
   * @default true
   */
  enabled?: boolean;
  /**
   * Side effect key identifier that won't be executed.
   * @default []
   */
  exclude?: string[];
}
