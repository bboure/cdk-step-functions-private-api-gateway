import { Construct } from 'constructs';
import { PrivateApi } from './constructs/PrivateApi';
import { Peer, Port, SecurityGroup, Vpc } from 'aws-cdk-lib/aws-ec2';
import { Orchestration } from './constructs/Orchestration';
import { Fn, Stack, StackProps } from 'aws-cdk-lib';
import {
  CfnResourceConfiguration,
  CfnResourceGateway,
} from 'aws-cdk-lib/aws-vpclattice';

export class StepFunctionsPrivateApiStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    const vpc = new Vpc(this, 'Vpc', {
      maxAzs: 1,
      natGateways: 0,
    });

    // Private API
    const api = new PrivateApi(this, 'PrivateApi', {
      vpc: vpc,
    });

    const rgSecurityGroup = new SecurityGroup(this, 'ResourceGatewaySG', {
      vpc: vpc,
    });
    rgSecurityGroup.addIngressRule(
      Peer.ipv4(vpc.vpcCidrBlock),
      Port.tcp(443),
      'Allow HTTPS traffic from Resource Gateway',
    );

    // Resource Gateway
    const resourceGateway = new CfnResourceGateway(this, 'ResourceGateway', {
      name: 'private-api-access',
      ipAddressType: 'IPV4',
      vpcIdentifier: vpc.vpcId,
      subnetIds: vpc.isolatedSubnets.map((subnet) => subnet.subnetId),
      securityGroupIds: [rgSecurityGroup.securityGroupId],
    });

    // Resource Configuration
    const resourceConfig = new CfnResourceConfiguration(
      this,
      'ResourceConfig',
      {
        name: 'sf-private-api',
        portRanges: ['443'],
        resourceGatewayId: resourceGateway.ref,
        resourceConfigurationType: 'SINGLE',
      },
    );

    resourceConfig.addPropertyOverride(
      'ResourceConfigurationDefinition.DnsResource',
      {
        DomainName: Fn.select(
          1,
          Fn.split(':', Fn.select(0, api.vpcEndpoint.vpcEndpointDnsEntries)),
        ),
        IpAddressType: 'IPV4',
      },
    );

    new Orchestration(this, 'Orchestration', {
      api: api.api,
      vpc: vpc,
      resourceConfig: resourceConfig,
    });
  }
}
