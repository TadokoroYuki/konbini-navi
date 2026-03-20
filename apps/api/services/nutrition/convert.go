package nutrition

import (
	nutritionpb "github.com/TadokoroYuki/konbini-navi/apps/api/gen/nutrition"
	"github.com/TadokoroYuki/konbini-navi/apps/api/pkg/model"
)

func FromProtoNutritionSummary(pb *nutritionpb.NutritionSummary) model.NutritionSummary {
	return model.NutritionSummary{
		Date:     pb.GetDate(),
		Calories: fromProtoNutrientStatus(pb.GetCalories()),
		Protein:  fromProtoNutrientStatus(pb.GetProtein()),
		Fat:      fromProtoNutrientStatus(pb.GetFat()),
		Carbs:    fromProtoNutrientStatus(pb.GetCarbs()),
	}
}

func fromProtoNutrientStatus(pb *nutritionpb.NutrientStatus) model.NutrientStatus {
	if pb == nil {
		return model.NutrientStatus{}
	}
	return model.NutrientStatus{
		Actual: pb.GetActual(),
		Target: pb.GetTarget(),
		Ratio:  pb.GetRatio(),
		Status: model.NutritionStatus(pb.GetStatus()),
	}
}
