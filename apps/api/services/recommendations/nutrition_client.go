package recommendations

import (
	"context"

	nutritionpb "github.com/TadokoroYuki/konbini-navi/apps/api/gen/nutrition"
	"github.com/TadokoroYuki/konbini-navi/apps/api/pkg/model"
	"github.com/TadokoroYuki/konbini-navi/apps/api/services/nutrition"
	"google.golang.org/grpc"
	"google.golang.org/grpc/credentials/insecure"
)

type NutritionClient struct {
	client nutritionpb.NutritionServiceClient
}

func NewNutritionClient(addr string) (*NutritionClient, error) {
	conn, err := grpc.NewClient(addr, grpc.WithTransportCredentials(insecure.NewCredentials()))
	if err != nil {
		return nil, err
	}
	return &NutritionClient{client: nutritionpb.NewNutritionServiceClient(conn)}, nil
}

func (c *NutritionClient) GetNutrition(ctx context.Context, userID string, date string) (*model.NutritionSummary, error) {
	resp, err := c.client.GetNutrition(ctx, &nutritionpb.GetNutritionRequest{
		UserId: userID,
		Date:   date,
	})
	if err != nil {
		return nil, err
	}
	summary := nutrition.FromProtoNutritionSummary(resp)
	return &summary, nil
}
