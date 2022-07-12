import { Stack, StackProps } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as cdk from 'aws-cdk-lib';
import { aws_ec2 as ec2 } from 'aws-cdk-lib';
import * as secretsManager from "aws-cdk-lib/aws-secretsmanager";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as iam from "aws-cdk-lib/aws-iam";
import * as cfn_inc from "aws-cdk-lib/cloudformation-include";
import { aws_lakeformation as lakeformation } from 'aws-cdk-lib';


export class Customer360Stack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);


    // 1. EXECUTE THE CLOUDFORMATION TEMPLATE
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

    // 2. ======== RETRIVE AND REGISTER S3 buckets AS LAKEFORMATION LOCATIONS  ======//
    // retrieve the S3 buckets created - raw, stage, analytics
    const rawS3Bucket =  c360CfnTemplate.getResource("RawDataS3Bucket");
    const stageS3Bucket =  c360CfnTemplate.getResource("StageDataS3Bucket");
    const analyticsS3Bucket =  c360CfnTemplate.getResource("AnalyticsDataS3Bucket");

    // register those as Lakformation locations
    const rawBucketS3Arn = s3.Bucket.fromBucketName(this, "rawBucket",rawS3Bucket.ref).bucketArn
    new lakeformation.CfnResource(this, 'RawS3BucketResource', {
      resourceArn: rawBucketS3Arn,
      useServiceLinkedRole: true,
    });

    const stageBucketS3Arn = s3.Bucket.fromBucketName(this, "stageBucket",stageS3Bucket.ref).bucketArn
    new lakeformation.CfnResource(this, 'StageS3BucketResource', {
      resourceArn: stageBucketS3Arn,
      useServiceLinkedRole: true,
    });

    const analyticsBucketS3Arn = s3.Bucket.fromBucketName(this, "analyticsBucket",analyticsS3Bucket.ref).bucketArn
    new lakeformation.CfnResource(this, 'AnalyticsS3BucketResource', {
      resourceArn: analyticsBucketS3Arn,
      useServiceLinkedRole: true,
    });

    /*
    // 3. ======== SPECIFY DATA LOCATION PERMISSIONS  ======//
    // setup permissions for data location access
    // retrieve the Glue execution role
    const serviceRole = c360CfnTemplate.getResource("GlueExecutionRole");
    // provide permissions to the role to the data lake locations

    const glueExecutionRoleArn = iam.Role.fromRoleName(this, "glueExRoleArn", serviceRole.ref).roleArn
    new cdk.CfnOutput(this, 'glueExecRole', { value: glueExecutionRoleArn });


    // 4. ======== SPECIFY ACCESS TO S3 LOCATIONS USING PERMISSIONS  ======//
    // grant access to the s3 locations
    new lakeformation.CfnPermissions(this, `rawS3Bucket-locationgrant`, {
      dataLakePrincipal: {
        dataLakePrincipalIdentifier: glueExecutionRoleArn
      },
      resource: {
        dataLocationResource: {
          s3Resource: rawBucketS3Arn,
        },            
      },
      permissions: ["DATA_LOCATION_ACCESS"],
      permissionsWithGrantOption: []
    });

    new lakeformation.CfnPermissions(this, `stageS3Bucket-locationgrant`, {
      dataLakePrincipal: {
        dataLakePrincipalIdentifier: glueExecutionRoleArn
      },
      resource: {
        dataLocationResource: {
          s3Resource: stageBucketS3Arn,
        },            
      },
      permissions: ["DATA_LOCATION_ACCESS"],
      permissionsWithGrantOption: []
    });

    new lakeformation.CfnPermissions(this, `analyticsS3Bucket-locationgrant`, {
      dataLakePrincipal: {
        dataLakePrincipalIdentifier: glueExecutionRoleArn
      },
      resource: {
        dataLocationResource: {
          s3Resource: analyticsBucketS3Arn,
        },            
      },
      permissions: ["DATA_LOCATION_ACCESS"],
      permissionsWithGrantOption: []
    });
    */

    /*

    // 5. ======== SPECIFY TABLE / COLUMN LEVEL PERMISSIONS  ======//
    // provide access to create tables in the databases
    new lakeformation.CfnPermissions(this, `rawS3Bucket-databaseGrant`, {
      dataLakePrincipal: {
        dataLakePrincipalIdentifier: glueExecutionRoleArn
      },
      resource: {
        databaseResource: {
          name: 'c360view_raw',
        },            
      },
      permissions: ["CREATE_TABLE"],
      permissionsWithGrantOption: []
    });

    new lakeformation.CfnPermissions(this, `stageS3Bucket-databaseGrant`, {
      dataLakePrincipal: {
        dataLakePrincipalIdentifier: glueExecutionRoleArn
      },
      resource: {
        databaseResource: {
          name: 'c360view_stage',
        },            
      },
      permissions: ["CREATE_TABLE"],
      permissionsWithGrantOption: []
    });

    new lakeformation.CfnPermissions(this, `analyticsS3Bucket-databaseGrant`, {
      dataLakePrincipal: {
        dataLakePrincipalIdentifier: glueExecutionRoleArn
      },
      resource: {
        databaseResource: {
          name: 'c360view_analytics',
        },            
      },
      permissions: ["CREATE_TABLE"],
      permissionsWithGrantOption: []
    });

    
    // grant access to tables
    new lakeformation.CfnPermissions(this, `rawS3Bucket-tablegrant`, {
      dataLakePrincipal: {
        dataLakePrincipalIdentifier: glueExecutionRoleArn
      },
      resource: {
        tableResource: {
          databaseName: 'c360view_raw',
          tableWildcard: { },
        },            
      },
      permissions: ["ALTER","SELECT"],
      permissionsWithGrantOption: ["ALTER","SELECT"]
    });

    new lakeformation.CfnPermissions(this, `stageS3Bucket-tablegrant`, {
      dataLakePrincipal: {
        dataLakePrincipalIdentifier: glueExecutionRoleArn
      },
      resource: {
        tableResource: {
          databaseName: 'c360view_stage',
          tableWildcard: { },
        },            
      },
      permissions: ["ALTER","SELECT"],
      permissionsWithGrantOption: ["ALTER","SELECT"]
    });

    new lakeformation.CfnPermissions(this, `analyticsS3Bucket-tablegrant`, {
      dataLakePrincipal: {
        dataLakePrincipalIdentifier: glueExecutionRoleArn
      },
      resource: {
        tableResource: {
          databaseName: 'c360view_analytics',
          tableWildcard: { },
        },            
      },
      permissions: ["ALTER","SELECT"],
      permissionsWithGrantOption: ["ALTER","SELECT"]
    });
    */

  }
}