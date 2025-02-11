import { copy, defineConfig, equal, generateId } from '@agile-ts/utils';
import {
  CreateObserverConfigInterface,
  CreateRuntimeJobConfigInterface,
  IngestConfigInterface,
  Observer,
  RuntimeJob,
} from '../../runtime';
import { Group } from './index';
import { DefaultItem } from '../collection';
import { logCodeManager } from '../../logCodeManager';

export class GroupObserver<
  DataType extends DefaultItem = DefaultItem
> extends Observer<DataType[]> {
  // Group the Observer belongs to
  public group: () => Group<DataType>;

  // Next vale (output) applied to the Group
  public nextGroupValue: DataType[];

  /**
   * A Group Observer manages the subscriptions to Subscription Containers (UI-Components)
   * and dependencies to other Observers (Agile Classes)
   * for a Group Class.
   *
   * @internal
   * @param group - Instance of Group the Observer belongs to.
   * @param config - Configuration object
   */
  constructor(
    group: Group<DataType>,
    config: CreateObserverConfigInterface = {}
  ) {
    super(
      group.agileInstance(),
      defineConfig(config, {
        value: copy(group._output),
      })
    );
    this.group = () => group;
    this.nextGroupValue = copy(group._output);
  }

  /**
   * Rebuilds the Group and passes the Group Observer
   * into the runtime wrapped into a Runtime-Job
   * where it is executed accordingly.
   *
   * During the execution the runtime applies the `nextGroupOutput` to the Group,
   * updates its dependents and re-renders the UI-Components it is subscribed to.
   *
   * @internal
   * @param config - Configuration object
   */
  public ingest(config: GroupIngestConfigInterface = {}): void {
    this.ingestOutput(this.group().nextGroupOutput, config);
  }

  /**
   * Passes the Group Observer into the runtime wrapped into a Runtime-Job
   * where it is executed accordingly.
   *
   * During the execution the runtime applies the specified `nextGroupOutput` to the Group,
   * updates its dependents and re-renders the UI-Components it is subscribed to.
   *
   * @internal
   * @param newGroupOutput - New Group Output to be applied to the Group.
   * @param config - Configuration object.
   */
  public ingestOutput(
    newGroupOutput: DataType[],
    config: GroupIngestConfigInterface = {}
  ): void {
    const group = this.group();
    config = defineConfig(config, {
      perform: true,
      force: false,
      key: logCodeManager.allowLogging
        ? `${this.key != null ? this.key + '_' : ''}${generateId()}_output`
        : undefined,
    });

    // Force overwriting the Group value if it is a placeholder.
    // After assigning a value to the Group, the Group is supposed to be no placeholder anymore.
    if (group.isPlaceholder) {
      config.force = true;
    }

    // Assign next Group output to Observer
    this.nextGroupValue = copy(newGroupOutput);

    // Check if current Group output and to assign Group output are equal
    if (equal(group._output, this.nextGroupValue) && !config.force) return;

    // Create Runtime-Job
    const job = new RuntimeJob(this, config);

    // Pass created Job into the Runtime
    this.agileInstance().runtime.ingest(job, {
      perform: config.perform,
    });
  }

  /**
   * Method executed by the Runtime to perform the Runtime-Job,
   * previously ingested via the `ingest()` or `ingestItems()` method.
   *
   * Thereby the previously defined `nextGroupOutput` is assigned to the Group.
   *
   * @internal
   * @param job - Runtime-Job to be performed.
   */
  public perform(job: RuntimeJob) {
    const observer = job.observer as GroupObserver;
    const group = observer.group();

    // Assign new Group output
    group._output = copy(observer.nextGroupValue);
    group.nextGroupOutput = copy(observer.nextGroupValue);

    // Assign new public output to the Observer (output used by the Integrations)
    observer.previousValue = Object.freeze(copy(observer.value)) as any;
    observer.value = copy(group._output); // Object.freeze(copy(group._output)); // Not freezing because of 'useProxy' hook
  }
}

export interface GroupIngestConfigInterface
  extends CreateRuntimeJobConfigInterface,
    IngestConfigInterface {}
