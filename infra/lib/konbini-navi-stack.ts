import * as cdk from "aws-cdk-lib";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as ecr from "aws-cdk-lib/aws-ecr";
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
  }
}
