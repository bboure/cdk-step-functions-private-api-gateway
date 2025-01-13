import {
  EndpointType,
  LambdaIntegration,
  RestApi,
} from 'aws-cdk-lib/aws-apigateway';
import {
  InterfaceVpcEndpoint,
  InterfaceVpcEndpointAwsService,
  Peer,
  Port,
  SecurityGroup,
  SubnetType,
  Vpc,
} from 'aws-cdk-lib/aws-ec2';
import {
  AnyPrincipal,
  Effect,
  PolicyDocument,
  PolicyStatement,
} from 'aws-cdk-lib/aws-iam';
import { Runtime } from 'aws-cdk-lib/aws-lambda';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import { Construct } from 'constructs';

interface PrivateApiProps {
  vpc: Vpc;
}

export class PrivateApi extends Construct {
  api: RestApi;
  vpcEndpoint: InterfaceVpcEndpoint;

  constructor(scope: Construct, id: string, props: PrivateApiProps) {
    super(scope, id);

    const { vpc } = props;

    this.vpcEndpoint = new InterfaceVpcEndpoint(this, 'Endpoint', {
      service: InterfaceVpcEndpointAwsService.APIGATEWAY,
      vpc: vpc,
      subnets: vpc.selectSubnets({
        subnetType: SubnetType.PRIVATE_ISOLATED,
      }),
      privateDnsEnabled: true,
    });

    const apiResourcePolicy = new PolicyDocument({
      statements: [
        new PolicyStatement({
          effect: Effect.DENY,
          actions: ['execute-api:Invoke'],
          principals: [new AnyPrincipal()],
          resources: ['execute-api:/*/*/*'],
          conditions: {
            StringNotEquals: {
              'aws:sourceVpc': vpc.vpcId,
            },
          },
        }),
        new PolicyStatement({
          effect: Effect.ALLOW,
          actions: ['execute-api:Invoke'],
          principals: [new AnyPrincipal()],
          resources: ['execute-api:/*/*/*'],
        }),
      ],
    });

    this.api = new RestApi(this, 'HelloWorld', {
      endpointConfiguration: {
        types: [EndpointType.PRIVATE],
        vpcEndpoints: [this.vpcEndpoint],
      },
      policy: apiResourcePolicy,
    });

    const hello = this.api.root.addResource('hello');

    const helloWorld = new NodejsFunction(this, 'HelloWorldHandler', {
      runtime: Runtime.NODEJS_22_X,
      entry: 'src/hello-world.ts',
    });

    hello.addMethod('GET', new LambdaIntegration(helloWorld));
  }
}
