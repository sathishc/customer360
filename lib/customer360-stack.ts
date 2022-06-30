import { Stack, StackProps } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as cdk from 'aws-cdk-lib';
import { aws_ec2 as ec2 } from 'aws-cdk-lib';
import * as secretsManager from "aws-cdk-lib/aws-secretsmanager";
import * as cfn_inc from "aws-cdk-lib/cloudformation-include";


export class Customer360Stack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    const sourceBucket = "hhug-360view";
    const rdsPassword = "Tim3t0change";


    const defaultVpc = ec2.Vpc.fromLookup(this, 'DefaultVPC', { isDefault: true,});

    defaultVpc.addGatewayEndpoint("S3GatewayEndpoint",{
      service:ec2.GatewayVpcEndpointAwsService.S3,
    })

    // Add an interface endpoint
    defaultVpc.addInterfaceEndpoint('SecretsManagerEndpoint', {
      service: ec2.InterfaceVpcEndpointAwsService.SECRETS_MANAGER,
      // Uncomment the following to allow more fine-grained control over
      // who can access the endpoint via the '.connections' object.
      // open: false
    });

    //  create a keyPair
    const cfnKeyPair = new ec2.CfnKeyPair(this, 'MyCfnKeyPair', {
      keyName: 'c360-keypair',
    });
    
    const c360CfnTemplate = new cfn_inc.CfnInclude(this, 'includeTemplate', {
      templateFile: 'lib/cf-360view.json',
      parameters: {
        'InstanceKeyPairParameter': cfnKeyPair.keyName,
        'VPCID': defaultVpc.vpcId,
        'SubnetAz1': defaultVpc.publicSubnets[0].subnetId,
        'SubnetAz2': defaultVpc.publicSubnets[1].subnetId
      },
    });


  }
}
