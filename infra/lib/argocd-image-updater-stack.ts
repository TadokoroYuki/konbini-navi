import * as cdk from "aws-cdk-lib";
import * as iam from "aws-cdk-lib/aws-iam";
import * as eks from "aws-cdk-lib/aws-eks";
import { Construct } from "constructs";

export interface ArgoCDImageUpdaterStackProps extends cdk.StackProps {
  eksClusterName: string;
  eksOidcProviderArn: string;
}

export class ArgoCDImageUpdaterStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: ArgoCDImageUpdaterStackProps) {
    super(scope, id, props);

    const { eksClusterName, eksOidcProviderArn } = props;

    // Extract OIDC Provider from ARN
    const oidcProvider = eksOidcProviderArn.split('/')[1];

    // ----------------------------------------------------------------
    // IAM Role for ArgoCD Image Updater (IRSA)
    // ----------------------------------------------------------------
    const imageUpdaterRole = new iam.Role(this, "ArgoCDImageUpdaterRole", {
      roleName: "argocd-image-updater-role",
      assumedBy: new iam.FederatedPrincipal(
        eksOidcProviderArn,
        {
          StringEquals: {
            [`${oidcProvider}:sub`]: "system:serviceaccount:argocd:argocd-image-updater",
            [`${oidcProvider}:aud`]: "sts.amazonaws.com",
          },
        },
        "sts:AssumeRoleWithWebIdentity"
      ),
      description: "IAM Role for ArgoCD Image Updater to access ECR",
    });

    // Grant ECR read-only access
    imageUpdaterRole.addManagedPolicy(
      iam.ManagedPolicy.fromAwsManagedPolicyName("AmazonEC2ContainerRegistryReadOnly")
    );

    // ----------------------------------------------------------------
    // Outputs
    // ----------------------------------------------------------------
    new cdk.CfnOutput(this, "ImageUpdaterRoleArn", {
      value: imageUpdaterRole.roleArn,
      description: "ARN of the IAM Role for ArgoCD Image Updater",
      exportName: "ArgoCDImageUpdaterRoleArn",
    });

    new cdk.CfnOutput(this, "ServiceAccountAnnotation", {
      value: `eks.amazonaws.com/role-arn: ${imageUpdaterRole.roleArn}`,
      description: "Annotation to add to argocd-image-updater ServiceAccount",
    });
  }
}
