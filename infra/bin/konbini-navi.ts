#!/usr/bin/env node
import * as cdk from "aws-cdk-lib";
import { KonbiniNaviStack } from "../lib/konbini-navi-stack";
import { CiCdStack } from "../lib/cicd-stack";

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

app.synth();
