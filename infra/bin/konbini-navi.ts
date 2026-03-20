#!/usr/bin/env node
import * as cdk from "aws-cdk-lib";
import { KonbiniNaviStack } from "../lib/konbini-navi-stack";
import { CiCdStack } from "../lib/cicd-stack";
import { ApiGatewayStack } from "../lib/api-gateway-stack";

const app = new cdk.App();

// ALB DNS name from K8s Ingress (to be updated after first deployment)
const albDnsName = app.node.tryGetContext("albDnsName") ||
  "k8s-default-konbinin-f1fd285043-503907802.ap-northeast-1.elb.amazonaws.com";

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

new ApiGatewayStack(app, "KonbiniNaviApiGatewayStack", {
  albDnsName,
  env: {
    region: "ap-northeast-1",
  },
});

app.synth();
