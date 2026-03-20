import * as cdk from "aws-cdk-lib";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as ecr from "aws-cdk-lib/aws-ecr";
import * as codepipeline from "aws-cdk-lib/aws-codepipeline";
import * as codepipeline_actions from "aws-cdk-lib/aws-codepipeline-actions";
import * as codebuild from "aws-cdk-lib/aws-codebuild";
import * as codeconnections from "aws-cdk-lib/aws-codeconnections";
import * as iam from "aws-cdk-lib/aws-iam";
import { Construct } from "constructs";

export class KonbiniNaviStack extends cdk.Stack {
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
    const ecrRepo = new ecr.Repository(this, "KonbiniNaviRepo", {
      repositoryName: "konbini-navi-api",
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      imageScanOnPush: true,
      imageTagMutability: ecr.TagMutability.MUTABLE,
    });

    // ----------------------------------------------------------------
    // CodeConnections（GitHub連携）
    // ----------------------------------------------------------------
    const codeConnection = new codeconnections.CfnConnection(
      this,
      "GitHubConnection",
      {
        connectionName: "konbini-navi-github",
        providerType: "GitHub",
      }
    );

    // ----------------------------------------------------------------
    // CodeBuild Project（Goビルド→ECRプッシュ）
    // ----------------------------------------------------------------
    const buildProject = new codebuild.PipelineProject(
      this,
      "KonbiniNaviBuild",
      {
        buildSpec: codebuild.BuildSpec.fromObject({
          version: "0.2",
          phases: {
            pre_build: {
              commands: [
                "echo Logging in to Amazon ECR...",
                "aws ecr get-login-password --region $AWS_DEFAULT_REGION | docker login --username AWS --password-stdin $AWS_ACCOUNT_ID.dkr.ecr.$AWS_DEFAULT_REGION.amazonaws.com",
                "REPOSITORY_URI=$AWS_ACCOUNT_ID.dkr.ecr.$AWS_DEFAULT_REGION.amazonaws.com/konbini-navi-api",
                "COMMIT_HASH=$(echo $CODEBUILD_RESOLVED_SOURCE_VERSION | cut -c 1-7)",
                "IMAGE_TAG=${COMMIT_HASH:=latest}",
              ],
            },
            build: {
              commands: [
                "echo Build started on `date`",
                "echo Building the Docker image...",
                "cd apps/api",
                "docker build -t $REPOSITORY_URI:latest .",
                "docker tag $REPOSITORY_URI:latest $REPOSITORY_URI:$IMAGE_TAG",
              ],
            },
            post_build: {
              commands: [
                "echo Build completed on `date`",
                "echo Pushing the Docker images...",
                "docker push $REPOSITORY_URI:latest",
                "docker push $REPOSITORY_URI:$IMAGE_TAG",
                "echo Writing image definitions file...",
                'printf \'[{"name":"konbini-navi-api","imageUri":"%s"}]\' $REPOSITORY_URI:$IMAGE_TAG > imagedefinitions.json',
              ],
            },
          },
          artifacts: {
            files: ["imagedefinitions.json"],
          },
        }),
        environment: {
          buildImage: codebuild.LinuxBuildImage.STANDARD_7_0,
          privileged: true,
        },
      }
    );

    // CodeBuildにECRプッシュ権限を付与
    ecrRepo.grantPullPush(buildProject);

    // ----------------------------------------------------------------
    // CodePipeline
    // ----------------------------------------------------------------
    const sourceArtifact = new codepipeline.Artifact("SourceArtifact");
    const buildArtifact = new codepipeline.Artifact("BuildArtifact");

    const pipeline = new codepipeline.Pipeline(this, "KonbiniNaviPipeline", {
      pipelineName: "konbini-navi-pipeline",
      crossAccountKeys: false,
    });

    // Source Stage
    pipeline.addStage({
      stageName: "Source",
      actions: [
        new codepipeline_actions.CodeStarConnectionsSourceAction({
          actionName: "GitHub",
          owner: "warisuno", // GitHubユーザー名に変更してください
          repo: "konbini-navi", // リポジトリ名に変更してください
          branch: "main",
          output: sourceArtifact,
          connectionArn: codeConnection.attrConnectionArn,
        }),
      ],
    });

    // Build Stage
    pipeline.addStage({
      stageName: "Build",
      actions: [
        new codepipeline_actions.CodeBuildAction({
          actionName: "Build",
          project: buildProject,
          input: sourceArtifact,
          outputs: [buildArtifact],
        }),
      ],
    });

    // ----------------------------------------------------------------
    // Outputs
    // ----------------------------------------------------------------
    new cdk.CfnOutput(this, "VpcId", {
      value: vpc.vpcId,
      description: "VPC ID",
    });

    new cdk.CfnOutput(this, "ECRRepositoryUri", {
      value: ecrRepo.repositoryUri,
      description: "ECR Repository URI",
    });

    new cdk.CfnOutput(this, "ECRRepositoryName", {
      value: ecrRepo.repositoryName,
      description: "ECR Repository Name",
    });

    new cdk.CfnOutput(this, "CodeConnectionArn", {
      value: codeConnection.attrConnectionArn,
      description: "CodeConnections ARN（GitHub連携用）",
    });

    new cdk.CfnOutput(this, "CodePipelineUrl", {
      value: `https://console.aws.amazon.com/codesuite/codepipeline/pipelines/${pipeline.pipelineName}/view`,
      description: "CodePipeline Console URL",
    });
  }
}
