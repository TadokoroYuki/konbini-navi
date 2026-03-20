import * as cdk from "aws-cdk-lib";
import * as apigatewayv2 from "aws-cdk-lib/aws-apigatewayv2";
import * as apigatewayv2_integrations from "aws-cdk-lib/aws-apigatewayv2-integrations";
import { Construct } from "constructs";

export interface ApiGatewayStackProps extends cdk.StackProps {
  albDnsName: string;
}

export class ApiGatewayStack extends cdk.Stack {
  public readonly apiUrl: string;

  constructor(scope: Construct, id: string, props: ApiGatewayStackProps) {
    super(scope, id, props);

    const { albDnsName } = props;

    // ----------------------------------------------------------------
    // HTTP API (API Gateway v2)
    // ----------------------------------------------------------------
    const httpApi = new apigatewayv2.HttpApi(this, "KonbiniNaviApi", {
      apiName: "konbini-navi-api",
      description: "Konbini Navi REST API with microservices routing",
      corsPreflight: {
        allowOrigins: ["*"],
        allowMethods: [
          apigatewayv2.CorsHttpMethod.GET,
          apigatewayv2.CorsHttpMethod.POST,
          apigatewayv2.CorsHttpMethod.PUT,
          apigatewayv2.CorsHttpMethod.DELETE,
          apigatewayv2.CorsHttpMethod.PATCH,
        ],
        allowHeaders: ["*"],
      },
    });

    // HTTP統合 - ALBへのプロキシ
    const albIntegration = new apigatewayv2_integrations.HttpUrlIntegration(
      "AlbIntegration",
      `http://${albDnsName}`,
      {
        method: apigatewayv2.HttpMethod.ANY,
      }
    );

    // ----------------------------------------------------------------
    // Routes - パスベースルーティング
    // ----------------------------------------------------------------

    // Products service
    httpApi.addRoutes({
      path: "/v1/products",
      methods: [apigatewayv2.HttpMethod.GET],
      integration: albIntegration,
    });

    httpApi.addRoutes({
      path: "/v1/products/{productId}",
      methods: [apigatewayv2.HttpMethod.GET],
      integration: albIntegration,
    });

    // Records service
    httpApi.addRoutes({
      path: "/v1/users/{userId}/records",
      methods: [apigatewayv2.HttpMethod.GET, apigatewayv2.HttpMethod.POST],
      integration: albIntegration,
    });

    httpApi.addRoutes({
      path: "/v1/users/{userId}/records/{recordId}",
      methods: [
        apigatewayv2.HttpMethod.GET,
        apigatewayv2.HttpMethod.PUT,
        apigatewayv2.HttpMethod.DELETE,
      ],
      integration: albIntegration,
    });

    // Nutrition service
    httpApi.addRoutes({
      path: "/v1/users/{userId}/nutrition",
      methods: [apigatewayv2.HttpMethod.GET],
      integration: albIntegration,
    });

    // Recommendations service
    httpApi.addRoutes({
      path: "/v1/users/{userId}/recommendations",
      methods: [apigatewayv2.HttpMethod.GET],
      integration: albIntegration,
    });

    // Health check
    httpApi.addRoutes({
      path: "/health",
      methods: [apigatewayv2.HttpMethod.GET],
      integration: albIntegration,
    });

    this.apiUrl = httpApi.url!;

    // ----------------------------------------------------------------
    // Outputs
    // ----------------------------------------------------------------
    new cdk.CfnOutput(this, "ApiGatewayUrl", {
      value: this.apiUrl,
      description: "API Gateway endpoint URL",
    });

    new cdk.CfnOutput(this, "ApiGatewayId", {
      value: httpApi.apiId,
      description: "API Gateway ID",
    });
  }
}
