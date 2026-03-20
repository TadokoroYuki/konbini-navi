package nutrition

import (
	"context"

	nutritionpb "github.com/TadokoroYuki/konbini-navi/apps/api/gen/nutrition"
	"github.com/TadokoroYuki/konbini-navi/apps/api/pkg/model"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
)

type GRPCServer struct {
	nutritionpb.UnimplementedNutritionServiceServer
	calculator *Calculator
}

func NewGRPCServer(calculator *Calculator) *GRPCServer {
	return &GRPCServer{calculator: calculator}
}

func (s *GRPCServer) GetNutrition(ctx context.Context, req *nutritionpb.GetNutritionRequest) (*nutritionpb.NutritionSummary, error) {
	summary, err := s.calculator.Calculate(ctx, req.GetUserId(), req.GetDate())
	if err != nil {
		return nil, status.Errorf(codes.Internal, "failed to calculate nutrition: %v", err)
	}

	return &nutritionpb.NutritionSummary{
		Date:     summary.Date,
		Calories: toProtoNutrientStatus(summary.Calories),
		Protein:  toProtoNutrientStatus(summary.Protein),
		Fat:      toProtoNutrientStatus(summary.Fat),
		Carbs:    toProtoNutrientStatus(summary.Carbs),
	}, nil
}

func toProtoNutrientStatus(ns model.NutrientStatus) *nutritionpb.NutrientStatus {
	return &nutritionpb.NutrientStatus{
		Actual: ns.Actual,
		Target: ns.Target,
		Ratio:  ns.Ratio,
		Status: string(ns.Status),
	}
}
