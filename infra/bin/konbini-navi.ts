#!/usr/bin/env node
import * as cdk from "aws-cdk-lib";
import { KonbiniNaviStack } from "../lib/konbini-navi-stack";
import { CiCdStack } from "../lib/cicd-stack";
import { ArgoCDImageUpdaterStack } from "../lib/argocd-image-updater-stack";

const app = new cdk.App();

const baseStack = new KonbiniNaviStack(app, "KonbiniNaviStack", {
  env: {
    region: "ap-northeast-1",
  },
});

new CiCdStack(app, "KonbiniNaviCiCdStack", {
  ecrRepository: baseStack.ecrRepository,
  env: {
    region: "ap-northeast-1",
  },
});

// ArgoCD Image Updater IRSA
new ArgoCDImageUpdaterStack(app, "ArgoCDImageUpdaterStack", {
  eksClusterName: "konbini-navi-cluster",
  eksOidcProviderArn: "arn:aws:iam::974857491219:oidc-provider/oidc.eks.ap-northeast-1.amazonaws.com/id/4ACACE12D082994A9CD9949F8ADD628D",
  env: {
    region: "ap-northeast-1",
  },
});

app.synth();
