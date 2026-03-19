import * as cdk from "aws-cdk-lib";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as apigateway from "aws-cdk-lib/aws-apigateway";
import { Construct } from "constructs";
import * as path from "path";

export class KonbiniNaviStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // ----------------------------------------------------------------
    // DynamoDB Tables
    // ----------------------------------------------------------------

    const productsTable = new dynamodb.Table(this, "ProductsTable", {
      tableName: "konbini-products",
      partitionKey: { name: "productId", type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    productsTable.addGlobalSecondaryIndex({
      indexName: "brand-category-index",
      partitionKey: { name: "brand", type: dynamodb.AttributeType.STRING },
      sortKey: { name: "category", type: dynamodb.AttributeType.STRING },
      projectionType: dynamodb.ProjectionType.ALL,
    });

    const recordsTable = new dynamodb.Table(this, "RecordsTable", {
      tableName: "konbini-records",
      partitionKey: { name: "userId", type: dynamodb.AttributeType.STRING },
      sortKey: { name: "SK", type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    recordsTable.addGlobalSecondaryIndex({
      indexName: "userId-date-index",
      partitionKey: { name: "userId", type: dynamodb.AttributeType.STRING },
      sortKey: { name: "date", type: dynamodb.AttributeType.STRING },
      projectionType: dynamodb.ProjectionType.ALL,
    });

    // ----------------------------------------------------------------
    // Lambda Function
    // ----------------------------------------------------------------

    const apiFn = new lambda.Function(this, "ApiFunction", {
      runtime: lambda.Runtime.PROVIDED_AL2023,
      handler: "bootstrap",
      code: lambda.Code.fromAsset(
        path.join(__dirname, "../../apps/api/bin/bootstrap")
      ),
      environment: {
        PRODUCTS_TABLE: productsTable.tableName,
        RECORDS_TABLE: recordsTable.tableName,
      },
      memorySize: 256,
      timeout: cdk.Duration.seconds(30),
    });

    productsTable.grantReadWriteData(apiFn);
    recordsTable.grantReadWriteData(apiFn);

    // ----------------------------------------------------------------
    // API Gateway
    // ----------------------------------------------------------------

    const api = new apigateway.RestApi(this, "KonbiniNaviApi", {
      restApiName: "Konbini Navi API",
      deployOptions: {
        stageName: "v1",
      },
      defaultCorsPreflightOptions: {
        allowOrigins: apigateway.Cors.ALL_ORIGINS,
        allowMethods: apigateway.Cors.ALL_METHODS,
        allowHeaders: [
          "Content-Type",
          "X-Amz-Date",
          "Authorization",
          "X-Api-Key",
          "X-Device-Id",
        ],
      },
    });

    const proxyResource = api.root.addResource("{proxy+}");
    proxyResource.addMethod(
      "ANY",
      new apigateway.LambdaIntegration(apiFn, {
        proxy: true,
      })
    );

    // Root resource also needs Lambda integration
    api.root.addMethod(
      "ANY",
      new apigateway.LambdaIntegration(apiFn, {
        proxy: true,
      })
    );

    // ----------------------------------------------------------------
    // Outputs
    // ----------------------------------------------------------------

    new cdk.CfnOutput(this, "ApiUrl", {
      value: api.url,
      description: "API Gateway URL",
    });

    new cdk.CfnOutput(this, "ProductsTableName", {
      value: productsTable.tableName,
    });

    new cdk.CfnOutput(this, "RecordsTableName", {
      value: recordsTable.tableName,
    });
  }
}
