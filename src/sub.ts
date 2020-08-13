import {State} from "./state";
import Agile from "./agile";


//=========================================================================================================
// Subscription Container
//=========================================================================================================

export type SubscriptionContainer = ComponentContainer | CallbackContainer;


//=========================================================================================================
// Component Container
//=========================================================================================================

export class ComponentContainer {
    public component: any;

    public passProps: boolean = false;
    public mappedPropStates?: { [key: string]: State };
    public propKeysChanged: Array<string> = [];  // Used to preserve local keys to update before update is performed, cleared every update

    // General
    public ready: boolean = false;
    public subs: Set<State> = new Set<State>([]);

    constructor(component: any, subs?: Set<State>) {
        this.component = component
        if (subs)
            this.subs = subs;
    }
}


//=========================================================================================================
// Callback Container
//=========================================================================================================

export class CallbackContainer extends ComponentContainer {
    public callback: Function;

    constructor(callback: Function, subs?: Set<State>) {
        super(null, subs);

        this.callback = callback;
    }
}


//=========================================================================================================
// Controller
//=========================================================================================================

export default class SubController {
    // Component based Subscription
    public components: Set<ComponentContainer> = new Set();

    // Callback based Subscription
    public callbacks: Set<CallbackContainer> = new Set();


    //=========================================================================================================
    // Subscribe with Subs Object
    //=========================================================================================================
    /**
     * Subscribe to Agile with a returned array of props this props can than passed trough the component (See react-integration)
     */
    public subscribeWithSubsObject(subscriptionInstance: any, subs: { [key: string]: State } = {}, agileInstance: Agile): { subscriptionContainer: SubscriptionContainer, props: { [key: string]: State['value'] } } {
        // Register Component
        const subscriptionContainer = this.registerComponent(subscriptionInstance, agileInstance);

        const props: { [key: string]: State } = {};
        subscriptionContainer.passProps = true;
        subscriptionContainer.mappedPropStates = {...subs};

        // Go through subs
        let localKeys = Object.keys(subs);
        localKeys.forEach(key => {
            const state = subs[key];

            // Add State to SubscriptionContainer Subs
            subscriptionContainer.subs.add(state);

            // Add SubscriptionContainer to State Dependencies Subs
            state.dep.subs.add(subscriptionContainer);

            // Add state to prop
            props[key] = state.value;
        });

        return {
            subscriptionContainer: subscriptionContainer,
            props: props
        };
    }


    //=========================================================================================================
    // Subscribe with Subs Array
    //=========================================================================================================
    /**
     * Subscribe to Agile States
     * @param integrationInstance - Either a CallbackContainer or a bound component instance
     * @param subs - An Array of States
     */
    public subscribeWithSubsArray(subscriptionInstance: any, subs: Array<State> = [], agileInstance: Agile): SubscriptionContainer {
        // Register Component
        const subscriptionContainer = this.registerComponent(subscriptionInstance, agileInstance, subs);

        // Add subs to State Subs
        subs.forEach(state => {
            // Add State to SubscriptionContainer Subs
            subscriptionContainer.subs.add(state);

            // Add SubscriptionContainer to State Dependencies Subs
            state.dep.subs.add(subscriptionContainer);
        });

        return subscriptionContainer;
    }


    //=========================================================================================================
    // Unsubscribe
    //=========================================================================================================
    /**
     * Unsubscribe a component or callback
     * @param subscriptionInstance - Either a CallbackContainer or a bound component instance
     */
    public unsubscribe(subscriptionInstance: any) {
        const unsub = (subscriptionContainer: CallbackContainer | ComponentContainer) => {
            subscriptionContainer.ready = false;

            // Remove component container from subs dep
            subscriptionContainer.subs.forEach(state => {
                state.dep.subs.delete(subscriptionInstance);
            });
        };

        if (subscriptionInstance instanceof CallbackContainer)
            unsub(subscriptionInstance);
        else if (subscriptionInstance.componentContainer)
            unsub(subscriptionInstance.componentContainer);
    }


    //=========================================================================================================
    // Register Component
    //=========================================================================================================
    /**
     * Register the Component and create and return a component container
     */
    public registerComponent(integrationInstance: any, agileInstance: Agile, subs: Array<State> = []): SubscriptionContainer {
        // - Callback based Subscription
        if (typeof integrationInstance === 'function') {
            // Create CallbackContainer
            let callbackContainer = new CallbackContainer(integrationInstance as Function, new Set(subs));

            // Add to callbacks
            this.callbacks.add(callbackContainer);

            callbackContainer.ready = true;

            return callbackContainer;
        }

        // - Component based Subscription
        // Create Component Container
        let componentContainer = new ComponentContainer(integrationInstance, new Set(subs));

        // Instantiate the componentContainer in a Component (for instance see react.integration AgileHOC)
        integrationInstance.componentContainer = componentContainer;

        // Add to components
        this.components.add(componentContainer);

        if (!agileInstance.config.waitForMount)
            componentContainer.ready = true;

        return componentContainer;
    }


    //=========================================================================================================
    // Mount
    //=========================================================================================================
    /**
     * Mounts currently only useful in Component based Subscription
     */
    public mount(integrationInstance: any) {
        if (!integrationInstance.componentContainer) return;

        // Set Ready to true
        integrationInstance.componentContainer.ready = true;
    }
}
