#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { StepFunctionsPrivateApiStack } from '../lib/step-functions-private-api-stack';

const app = new cdk.App();
new StepFunctionsPrivateApiStack(app, 'StepFunctionsPrivateApiStack', {});
