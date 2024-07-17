# cdk8s-pipeline-tests

The repository contains manifests for a [cdk8s-pipelines](https://github.com/cloud-native-toolkit/cdk8s-pipelines) testing harness and the tests themselves.

On an OpenShift cluster, an ArgoCD application synced to the `cicd` branch contains
* Build Task
* Testing Pipeline
* EventListener, TriggerTemplate and Route for github webhooks to this and the cdk8s-pipelines repositories
* Cluster RoleBinding

In the `test` branch, the main.ts file contains unit tests for the cdk8s-pipelines library. Commits to this branch will deploy these tests, using the `develop` version of the library.
