#!/usr/bin/env node
import * as cdk from "aws-cdk-lib";
import { KonbiniNaviStack } from "../lib/konbini-navi-stack";

const app = new cdk.App();

new KonbiniNaviStack(app, "KonbiniNaviStack", {
  env: {
    region: "ap-northeast-1",
  },
});

app.synth();
