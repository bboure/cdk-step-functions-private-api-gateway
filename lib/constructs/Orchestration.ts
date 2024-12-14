import { SecretValue } from 'aws-cdk-lib';
import { RestApi } from 'aws-cdk-lib/aws-apigateway';
import { Vpc } from 'aws-cdk-lib/aws-ec2';
import {
  Authorization,
  CfnConnection,
  Connection,
} from 'aws-cdk-lib/aws-events';
import {
  StateMachine,
  DefinitionBody,
  TaskInput,
  Chain,
} from 'aws-cdk-lib/aws-stepfunctions';
import { HttpInvoke } from 'aws-cdk-lib/aws-stepfunctions-tasks';
import { CfnResourceConfiguration } from 'aws-cdk-lib/aws-vpclattice';
import { Construct } from 'constructs';

interface OrchestrationProps {
  vpc: Vpc;
  api: RestApi;
  resourceConfig: CfnResourceConfiguration;
}

export class Orchestration extends Construct {
  constructor(scope: Construct, id: string, props: OrchestrationProps) {
    super(scope, id);

    const { api, resourceConfig } = props;

    // Connection for orchestration
    const connection = new Connection(this, 'ApiConnection', {
      authorization: Authorization.apiKey(
        'x-api-key',
        SecretValue.unsafePlainText('demo'),
      ),
    });

    (connection.node.children[0] as CfnConnection).addPropertyOverride(
      'InvocationConnectivityParameters',
      {
        ResourceParameters: {
          ResourceConfigurationArn: resourceConfig.attrArn,
        },
      },
    );

    const http = new HttpInvoke(this, 'Http', {
      apiRoot: api.url,
      apiEndpoint: TaskInput.fromText(`hello`),
      method: TaskInput.fromText('GET'),
      connection: connection,
    });

    const chain = Chain.start(http);

    new StateMachine(this, 'StateMachine', {
      definitionBody: DefinitionBody.fromChainable(chain),
    });
  }
}
