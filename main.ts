import { App, Chart, Size } from 'cdk8s';
import { ChartProps } from 'cdk8s/lib/chart';
import { PersistentVolumeClaim, PersistentVolumeClaimProps, PersistentVolumeAccessMode } from 'cdk8s-plus-27';
import { Construct } from 'constructs';
// @ts-ignore
import {
  ParameterBuilder,
  PipelineBuilder,
  PipelineRunBuilder,
  TaskBuilder,
  TaskStepBuilder,
  TaskRunBuilder,
  WorkspaceBuilder,
  fromPipelineParam,
  ClusterRemoteResolver,
} from '../src';

class PipelineRunTest extends Chart {
  constructor(scope: Construct, id: string, props?: ChartProps) {
    super(scope, id, props);

    const pipelineParam = new ParameterBuilder('repo-url')
      .withDefaultValue('');

    const myTask = new TaskBuilder(this, 'clone-git')
      .specifyRunAfter([])
      .withName('fetch-source')
      .withWorkspace(new WorkspaceBuilder('output')
        .withBinding('shared-data')
        .withDescription('The files cloned by the task'))
      .withStringParam(new ParameterBuilder('url').withValue(fromPipelineParam(pipelineParam)))
      .withResult('status', 'Status of the task')
      .withStep(new TaskStepBuilder()
        .withName('step')
        .withImage('ubuntu')
        .fromScriptData('#!/usr/bin/env bash\necho $(params.url)'));
    const myTask2 = new TaskBuilder(this, 'task-two')
      .specifyRunAfter(['fetch-source'])
      .withStep(new TaskStepBuilder()
        .withName('echo')
        .withImage('ubuntu')
        .fromScriptData('#!/usr/bin/env bash\necho These logs print after'));

    const pvcProps : PersistentVolumeClaimProps = { metadata: { name: 'datapvc' }, accessModes: [PersistentVolumeAccessMode.READ_WRITE_ONCE], storage: Size.gibibytes(1) };
    new PersistentVolumeClaim(this, 'datapvc', pvcProps);

    const pipeline = new PipelineBuilder(this, 'clone-build-push')
      .withDescription('This pipeline closes a repository')
      .withTask(myTask)
      .withTask(myTask2)
      .withStringParam(pipelineParam);
    pipeline.buildPipeline({ includeDependencies: true });

    new PipelineRunBuilder(this, 'my-pipeline-run', pipeline)
      .withRunParam('repo-url', 'https://github.com/exmaple/my-repo')
      .withWorkspace('shared-data', 'datapvc', 'my-shared-data')
      .buildPipelineRun({ includeDependencies: true });
  }
}

class PipelineRunTestWithResolver extends Chart {
  constructor(scope: Construct, id: string, props?: ChartProps) {
    super(scope, id, props);

    const myWorkspace = new WorkspaceBuilder('output')
      .withDescription('The files cloned by the task')
      .withBinding('shared-data');

    const pipelineParam = new ParameterBuilder('repo-url')
      .withDefaultValue('');

    const urlParam = new ParameterBuilder('URL')
      .withValue(fromPipelineParam(pipelineParam));

    const resolver = new ClusterRemoteResolver('task', 'git-clone', 'openshift-pipelines');

    const myTask = new TaskBuilder(this, 'fetch-source')
      .referencingTask(resolver)
      .withWorkspace(myWorkspace)
      .withStringParam(urlParam);
    const myTask2 = new TaskBuilder(this, 'task-two')
      .specifyRunAfter(['fetch-source'])
      .withStep(new TaskStepBuilder()
        .withName('echo')
        .withImage('ubuntu')
        .fromScriptData('#!/usr/bin/env bash\necho These logs print after'));

    const pvcProps : PersistentVolumeClaimProps = { metadata: { name: 'datapvc' }, accessModes: [PersistentVolumeAccessMode.READ_WRITE_ONCE], storage: Size.gibibytes(1) };
    new PersistentVolumeClaim(this, 'datapvc', pvcProps);

    const pipeline = new PipelineBuilder(this, 'clone-build-push')
      .withDescription('This pipeline closes a repository, builds a Docker image, etc.')
      .withTask(myTask)
      .withTask(myTask2)
      .withStringParam(pipelineParam);
    pipeline.buildPipeline({ includeDependencies: true });

    new PipelineRunBuilder(this, 'my-pipeline-run', pipeline)
      .withRunParam('repo-url', 'https://github.com/cloud-native-toolkit/cdk8s-pipeline-tests')
      .withWorkspace('shared-data', 'datapvc', '')
      .buildPipelineRun({ includeDependencies: true });
  }
}

class TestTaskRunBuilder extends Chart {
  constructor(scope: Construct, id: string, props?: ChartProps) {
    super(scope, id, props);

    const myTask = new TaskBuilder(this, 'echo-input')
      .withWorkspace(new WorkspaceBuilder('output')
        .withDescription('The files cloned by the task'))
      .withStringParam(new ParameterBuilder('input'))
      .withStep(new TaskStepBuilder()
        .withName('step')
        .withImage('ubuntu')
        .fromScriptData('#!/usr/bin/env bash\necho $(params.input)'));
    myTask.buildTask();

    const pvcProps : PersistentVolumeClaimProps = { metadata: { name: 'datapvc' }, accessModes: [PersistentVolumeAccessMode.READ_WRITE_ONCE], storage: Size.gibibytes(1) };
    new PersistentVolumeClaim(this, 'datapvc', pvcProps);

    new TaskRunBuilder(this, 'echo-input-run', myTask)
      .withRunParam('input', 'Hello World!')
      .withWorkspace('output', 'datapvc', '')
      .withServiceAccount('default')
      .buildTaskRun({ includeDependencies: true });
  }
}

const app = new App();
// new PipelineRunTest(app, 'test-pipeline-run');
new PipelineRunTestWithResolver(app, 'pipeline-run-with-resolver');
// new TestTaskRunBuilder(app, 'test-task-run');
app.synth();
