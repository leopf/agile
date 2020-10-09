import {
    State,
    Agile,
    defineConfig,
    Observer
} from '../internal';

export class Computed<ComputedValueType = any> extends State<ComputedValueType> {
    public agileInstance: () => Agile;

    public computeFunction: () => ComputedValueType;
    public deps: Array<Observer> = [];
    public hardCodedDeps: Array<Observer> = [];

    constructor(agileInstance: Agile, computeFunction: () => ComputedValueType, deps: Array<Observer> = []) {
        super(agileInstance, computeFunction());
        this.agileInstance = () => agileInstance;
        this.computeFunction = computeFunction;
        this.hardCodedDeps = deps;

        // Recompute for setting initial state value and adding missing dependencies
        this.recompute();
    }

    public set value(value: ComputedValueType) {
        console.error('Agile: Can not mutate Computed value, please use recompute()');
    }

    public get value(): ComputedValueType {
        // Note can't use 'super.value' because of 'https://github.com/Microsoft/TypeScript/issues/338'

        // Add state to foundState (for auto tracking used states in computed functions)
        if (this.agileInstance().runtime.trackObserver)
            this.agileInstance().runtime.foundObservers.add(this.observer);

        return this._value;
    }


    //=========================================================================================================
    // Recompute
    //=========================================================================================================
    /**
     * Will call the computeFunction and update the dependencies
     */
    public recompute(options?: { background?: boolean, sideEffects?: boolean }) {
        // Assign defaults to config
        options = defineConfig(options, {
            background: false,
            sideEffects: true
        });

        // Set State to nextState
        this.ingest(options);
    }


    //=========================================================================================================
    // Updates Compute Function
    //=========================================================================================================
    /**
     * Updates the Compute Function
     */
    public updateComputeFunction(computeFunction: () => ComputedValueType, deps: Array<State> = [], options?: { background?: boolean, sideEffects?: boolean }) {
        this.computeFunction = computeFunction;
        this.hardCodedDeps = deps.map(state => state.observer);

        // Recompute for setting initial state value and adding missing dependencies
        this.recompute(options);
    }


    //=========================================================================================================
    // Compute Values
    //=========================================================================================================
    /**
     * @internal
     * Will add auto tracked dependencies to this and calls the computeFunction
     */
    public computeValue(): ComputedValueType {
        // Set tracking state to true which will than track all states which for instance call state.value
        this.agileInstance().runtime.trackObserver = true;

        // Call computeFunction
        const computedValue = this.computeFunction();

        // Get tracked states and set trackSate to false
        let foundObservers = this.agileInstance().runtime.getTrackedObservers();

        // Handle foundStates dependencies
        const newDeps: Array<Observer> = [];
        foundObservers.forEach(observer => {
            if(!observer) return;

            // Add the state to newDeps
            newDeps.push(observer);

            // Add this as dependency of the state
            observer.dep.depend(this.observer);
        });

        // Handle hardCoded dependencies
        this.hardCodedDeps.forEach(observer => {
            // Add this as dependency of the state
            observer.dep.depend(this.observer);
        });

        // Set deps
        this.deps = [...this.hardCodedDeps, ...newDeps];

        return computedValue;
    }


    //=========================================================================================================
    // Overwriting some functions which can't be used in computed
    //=========================================================================================================

    public patch() {
        console.error('Agile: can not use patch method on Computed since the value is dynamic!');
        return this;
    }

    public persist(key?: string): this {
        console.error('Agile: Computed state can not be persisted since the value is dynamic!', key);
        return this;
    }
}
