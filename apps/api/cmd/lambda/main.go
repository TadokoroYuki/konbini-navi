package main

import (
	"context"
	"log"
	"net/http"
	"os"
	"strings"

	"github.com/aws/aws-lambda-go/events"
	"github.com/aws/aws-lambda-go/lambda"
	"github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/service/dynamodb"

	"github.com/TadokoroYuki/konbini-navi/apps/api/internal/handler"
	"github.com/TadokoroYuki/konbini-navi/apps/api/internal/repository"
	"github.com/TadokoroYuki/konbini-navi/apps/api/internal/service"
)

func main() {
	// Initialize DynamoDB client
	var dynamoClient *dynamodb.Client

	cfg, err := config.LoadDefaultConfig(context.Background())
	if err != nil {
		log.Printf("WARNING: Failed to load AWS config: %v", err)
		log.Println("Starting without DynamoDB connection")
	} else {
		dynamoClient = dynamodb.NewFromConfig(cfg)
	}

	// Initialize repositories
	productRepo := repository.NewDynamoProductRepository(dynamoClient)
	recordRepo := repository.NewDynamoRecordRepository(dynamoClient, productRepo)

	// Initialize services
	calculator := service.NewNutritionCalculator(recordRepo, productRepo)
	engine := service.NewRecommendationEngine(calculator, productRepo)

	// Initialize handlers
	productHandler := handler.NewProductHandler(productRepo)
	recordHandler := handler.NewRecordHandler(recordRepo, productRepo)
	nutritionHandler := handler.NewNutritionHandler(calculator)
	recommendHandler := handler.NewRecommendHandler(engine)

	// Set up router
	router := handler.NewRouter(productHandler, recordHandler, nutritionHandler, recommendHandler)

	// Determine runtime mode
	if os.Getenv("AWS_LAMBDA_FUNCTION_NAME") != "" {
		// Lambda mode
		lambda.Start(lambdaHandler(router))
	} else {
		// Local HTTP server mode
		addr := ":8080"
		log.Printf("Starting local server on %s", addr)
		if err := http.ListenAndServe(addr, router); err != nil {
			log.Fatalf("Failed to start server: %v", err)
		}
	}
}

// lambdaHandler converts an HTTP handler to a Lambda handler.
func lambdaHandler(httpHandler http.Handler) func(ctx context.Context, req events.APIGatewayProxyRequest) (events.APIGatewayProxyResponse, error) {
	return func(ctx context.Context, req events.APIGatewayProxyRequest) (events.APIGatewayProxyResponse, error) {
		// Convert API Gateway request to http.Request
		httpReq, err := http.NewRequestWithContext(ctx, req.HTTPMethod, req.Path, nil)
		if err != nil {
			return events.APIGatewayProxyResponse{StatusCode: 500}, err
		}

		// Set query parameters
		q := httpReq.URL.Query()
		for k, v := range req.QueryStringParameters {
			q.Set(k, v)
		}
		httpReq.URL.RawQuery = q.Encode()

		// Set headers
		for k, v := range req.Headers {
			httpReq.Header.Set(k, v)
		}

		// Set body
		if req.Body != "" {
			httpReq.Body = http.NoBody
			httpReq, _ = http.NewRequestWithContext(ctx, req.HTTPMethod, httpReq.URL.String(), strings.NewReader(req.Body))
			for k, v := range req.Headers {
				httpReq.Header.Set(k, v)
			}
		}

		// Record response
		recorder := &responseRecorder{
			headers:    http.Header{},
			statusCode: http.StatusOK,
		}

		httpHandler.ServeHTTP(recorder, httpReq)

		// Build response headers
		respHeaders := map[string]string{}
		for k, vals := range recorder.headers {
			if len(vals) > 0 {
				respHeaders[k] = vals[0]
			}
		}

		return events.APIGatewayProxyResponse{
			StatusCode: recorder.statusCode,
			Headers:    respHeaders,
			Body:       recorder.body.String(),
		}, nil
	}
}

// responseRecorder captures HTTP response for Lambda conversion.
type responseRecorder struct {
	headers    http.Header
	body       strings.Builder
	statusCode int
}

func (r *responseRecorder) Header() http.Header {
	return r.headers
}

func (r *responseRecorder) Write(b []byte) (int, error) {
	return r.body.Write(b)
}

func (r *responseRecorder) WriteHeader(statusCode int) {
	r.statusCode = statusCode
}
