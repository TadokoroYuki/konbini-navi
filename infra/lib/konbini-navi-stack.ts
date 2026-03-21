import * as cdk from "aws-cdk-lib";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as ecr from "aws-cdk-lib/aws-ecr";
import * as cognito from "aws-cdk-lib/aws-cognito";
import * as lambda from "aws-cdk-lib/aws-lambda";
import { Construct } from "constructs";

export class KonbiniNaviStack extends cdk.Stack {
  public readonly ecrRepository: ecr.Repository;

  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // ----------------------------------------------------------------
    // VPC（パブリック/プライベートサブネット）
    // ----------------------------------------------------------------
    const vpc = new ec2.Vpc(this, "KonbiniNaviVpc", {
      cidr: "10.0.0.0/16",
      maxAzs: 2,
      natGateways: 1,
      subnetConfiguration: [
        {
          cidrMask: 24,
          name: "PublicSubnet",
          subnetType: ec2.SubnetType.PUBLIC,
        },
        {
          cidrMask: 24,
          name: "PrivateSubnet",
          subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
        },
      ],
    });

    // ----------------------------------------------------------------
    // ECR Repository
    // ----------------------------------------------------------------
    this.ecrRepository = new ecr.Repository(this, "KonbiniNaviRepo", {
      repositoryName: "konbini-navi-api",
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      imageScanOnPush: true,
      imageTagMutability: ecr.TagMutability.MUTABLE,
    });


    // ----------------------------------------------------------------
    // Cognito Pre Sign-Up Lambda (auto-confirm)
    // ----------------------------------------------------------------
    const autoConfirmFn = new lambda.Function(this, "AutoConfirmFunction", {
      runtime: lambda.Runtime.NODEJS_22_X,
      handler: "index.handler",
      code: lambda.Code.fromInline(`
        exports.handler = async (event) => {
          event.response.autoConfirmUser = true;
          if (event.request.userAttributes.email) {
            event.response.autoVerifyEmail = true;
          }
          return event;
        };
      `),
      timeout: cdk.Duration.seconds(5),
    });

    // ----------------------------------------------------------------
    // Cognito User Pool
    // ----------------------------------------------------------------
    const userPool = new cognito.UserPool(this, "KonbiniNaviUserPool", {
      userPoolName: "konbini-navi-users",
      selfSignUpEnabled: true,
      signInAliases: { email: true },
      autoVerify: { email: true },
      passwordPolicy: {
        minLength: 8,
        requireLowercase: false,
        requireUppercase: false,
        requireDigits: false,
        requireSymbols: false,
      },
      standardAttributes: {
        email: { required: true, mutable: true },
        fullname: { required: false, mutable: true },
      },
      accountRecovery: cognito.AccountRecovery.EMAIL_ONLY,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      lambdaTriggers: {
        preSignUp: autoConfirmFn,
      },
    });

    const userPoolClient = userPool.addClient("KonbiniNaviWebClient", {
      userPoolClientName: "konbini-navi-web",
      authFlows: {
        userPassword: true,
        userSrp: true,
      },
      preventUserExistenceErrors: true,
    });

    // Cognito Domain for ALB authentication
    const userPoolDomain = userPool.addDomain("KonbiniNaviDomain", {
      cognitoDomain: {
        domainPrefix: "konbini-navi",
      },
    });

    // ----------------------------------------------------------------
    // Outputs
    // ----------------------------------------------------------------
    new cdk.CfnOutput(this, "VpcId", {
      value: vpc.vpcId,
      description: "VPC ID",
    });

    new cdk.CfnOutput(this, "ECRRepositoryUri", {
      value: this.ecrRepository.repositoryUri,
      description: "ECR Repository URI",
    });

    new cdk.CfnOutput(this, "ECRRepositoryName", {
      value: this.ecrRepository.repositoryName,
      description: "ECR Repository Name",
    });

    new cdk.CfnOutput(this, "CognitoUserPoolId", {
      value: userPool.userPoolId,
      description: "Cognito User Pool ID",
      exportName: "KonbiniNaviUserPoolId",
    });

    new cdk.CfnOutput(this, "CognitoUserPoolArn", {
      value: userPool.userPoolArn,
      description: "Cognito User Pool ARN",
      exportName: "KonbiniNaviUserPoolArn",
    });

    new cdk.CfnOutput(this, "CognitoUserPoolClientId", {
      value: userPoolClient.userPoolClientId,
      description: "Cognito User Pool Client ID",
      exportName: "KonbiniNaviUserPoolClientId",
    });

    new cdk.CfnOutput(this, "CognitoRegion", {
      value: this.region,
      description: "AWS Region",
      exportName: "KonbiniNaviRegion",
    });
  }
}
