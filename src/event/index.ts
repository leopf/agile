import Agile from "../agile";
import {defineConfig} from "../utils";

export type EventPayload = { [key: string]: any };
export type EventCallbackFunction<PayloadType = EventPayload> = (payload?: PayloadType) => void;

export interface EventConfig {
    key?: string
    enabled?: boolean
    maxUses?: number
    delay?: number
}

export default class Event<PayloadType = EventPayload> {
    public agileInstance: () => Agile;

    public config: EventConfig;

    private callbacks: Set<EventCallbackFunction<PayloadType>> = new Set(); // Stores callback functions
    public uses: number = 0; // How often the event has been used
    private currentTimeout: any; // The current timeout (function)
    private queue: Array<PayloadType> = []; // Queue if something is currently in timeout

    // @ts-ignore
    public payload: PayloadType; // Only holds reference to the PayloadType so that it can be read external (never defined)

    constructor(agileInstance: Agile, config: EventConfig = {}) {
        this.agileInstance = () => agileInstance;

        // Assign defaults to config
        this.config = defineConfig<EventConfig>(config, {
            enabled: true
        });
    }


    //=========================================================================================================
    // On
    //=========================================================================================================
    /**
     * Register Callback Function
     */
    public on(callback: EventCallbackFunction<PayloadType>) {
        const cleanUpFunction = () => this.unsub(callback);

        if (this.config.maxUses && this.uses > this.config.maxUses) {
            // Disable Event
            this.disable();

            return cleanUpFunction;
        }

        // Add callback to Event Callbacks
        this.callbacks.add(callback);

        return cleanUpFunction;
    }


    //=========================================================================================================
    // Trigger
    //=========================================================================================================
    /**
     * Run all callback Functions
     */
    public trigger(payload?: PayloadType) {
        // If event is disabled, return
        if (!this.config.enabled) return this;

        if (this.config.delay)
            this.delayedTrigger(payload);
        else
            this.normalTrigger(payload);

        return this;
    }


    //=========================================================================================================
    // Disable
    //=========================================================================================================
    /**
     * Disables the Event
     */
    public disable() {
        this.config.enabled = false;
        return this;
    }

    //=========================================================================================================
    // Enable
    //=========================================================================================================
    /**
     * Enables the Event
     */
    public enable() {
        this.config.enabled = true;
        return this;
    }


    //=========================================================================================================
    // Reset
    //=========================================================================================================
    /**
     * Resets the Event
     */
    public reset() {
        // Enable event
        this.enable();

        // Reset Uses
        this.uses = 0;

        // Clear active timeout
        clearTimeout(this.currentTimeout);

        return this;
    }

    //=========================================================================================================
    // Unsub
    //=========================================================================================================
    /**
     * @internal
     * Unsubs a callback
     */
    private unsub(callback: EventCallbackFunction<PayloadType>) {
        this.callbacks.delete(callback);
    }


    //=========================================================================================================
    // Normal Trigger
    //=========================================================================================================
    /**
     * @internal
     * Call event instantly
     */
    private normalTrigger(payload?: PayloadType) {
        // Call callbacks
        this.callbacks.forEach(callback => callback(payload));

        // Increase uses
        this.uses++;
    }


    //=========================================================================================================
    // Delayed Trigger
    //=========================================================================================================
    /**
     * @internal
     * Call event after config.delay
     */
    private delayedTrigger(payload?: PayloadType) {
        // Check if a timeout is currently active if so add the payload to a queue
        if (this.currentTimeout !== undefined) {
            if (payload) this.queue.push(payload);
            return;
        }

        // Looper function which loops through the queue(payloads)
        const looper = (payload?: PayloadType) => {
            this.currentTimeout = setTimeout(() => {
                // Reset currentTimeout
                this.currentTimeout = undefined;

                // Call normalTrigger
                this.normalTrigger(payload);

                // If items are in queue, continue with them
                if (this.queue.length > 0)
                    looper(this.queue.shift())
            }, this.config.delay);
        }

        // Call looper with current Payload
        looper(payload);

        return;
    }

}
