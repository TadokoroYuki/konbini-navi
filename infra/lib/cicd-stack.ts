import * as cdk from "aws-cdk-lib";
import * as codepipeline from "aws-cdk-lib/aws-codepipeline";
import * as codepipeline_actions from "aws-cdk-lib/aws-codepipeline-actions";
import * as codebuild from "aws-cdk-lib/aws-codebuild";
import * as codeconnections from "aws-cdk-lib/aws-codeconnections";
import * as iam from "aws-cdk-lib/aws-iam";
import * as ecr from "aws-cdk-lib/aws-ecr";
import { Construct } from "constructs";

export interface CiCdStackProps extends cdk.StackProps {
  ecrRepository: ecr.IRepository;
}

export class CiCdStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: CiCdStackProps) {
    super(scope, id, props);

    const { ecrRepository } = props;

    // ----------------------------------------------------------------
    // CodeConnections（GitHub連携）
    // ----------------------------------------------------------------
    const codeConnection = new codeconnections.CfnConnection(
      this,
      "KonbiniNaviGitHubConnection",
      {
        connectionName: "konbini-navi-github",
        providerType: "GitHub",
      }
    );

    // ----------------------------------------------------------------
    // CodeBuild Project（Docker ビルド & 手動マニフェスト更新）
    // ----------------------------------------------------------------
    const buildProject = new codebuild.PipelineProject(
      this,
      "KonbiniNaviBuildProject",
      {
        projectName: "konbini-navi-build",
        environment: {
          buildImage: codebuild.LinuxBuildImage.STANDARD_7_0,
          privileged: true,
        },
        environmentVariables: {
          REPOSITORY_URI: {
            value: ecrRepository.repositoryUri,
          },
        },
        buildSpec: codebuild.BuildSpec.fromSourceFilename("apps/api/buildspec.yml"),
      }
    );

    // ECR push permission
    ecrRepository.grantPull(buildProject);
    buildProject.addToRolePolicy(
      new iam.PolicyStatement({
        actions: [
          "ecr:GetDownloadUrlForLayer",
          "ecr:BatchGetImage",
          "ecr:PutImage",
          "ecr:InitiateLayerUpload",
          "ecr:UploadLayerPart",
          "ecr:CompleteLayerUpload",
        ],
        resources: [ecrRepository.repositoryArn],
      })
    );

    // GitHub PAT from Secrets Manager
    buildProject.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ["secretsmanager:GetSecretValue"],
        resources: [
          `arn:aws:secretsmanager:${this.region}:${this.account}:secret:github-pat-*`,
        ],
      })
    );

    // ----------------------------------------------------------------
    // CodePipeline
    // ----------------------------------------------------------------
    const sourceOutput = new codepipeline.Artifact("SourceOutput");
    const buildOutput = new codepipeline.Artifact("BuildOutput");

    const pipeline = new codepipeline.Pipeline(this, "KonbiniNaviPipeline", {
      pipelineName: "konbini-navi-pipeline",
      crossAccountKeys: false,
    });

    // Source Stage (GitHub)
    pipeline.addStage({
      stageName: "Source",
      actions: [
        new codepipeline_actions.CodeStarConnectionsSourceAction({
          actionName: "GitHubSource",
          owner: "TadokoroYuki",
          repo: "konbini-navi",
          branch: "main",
          output: sourceOutput,
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
          input: sourceOutput,
          outputs: [buildOutput],
        }),
      ],
    });

    // ----------------------------------------------------------------
    // Outputs
    // ----------------------------------------------------------------
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
