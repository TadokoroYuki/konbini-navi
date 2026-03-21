package nutrition

import (
	"context"
	"math"

	"github.com/TadokoroYuki/konbini-navi/apps/api/pkg/model"
)

type Calculator struct {
	recordClient *RecordClient
	profileRepo  *ProfileRepository
}

func NewCalculator(recordClient *RecordClient, profileRepo *ProfileRepository) *Calculator {
	return &Calculator{recordClient: recordClient, profileRepo: profileRepo}
}

func (c *Calculator) Calculate(ctx context.Context, userID string, date string) (*model.NutritionSummary, error) {
	records, err := c.recordClient.ListByUserAndDate(ctx, userID, date)
	if err != nil {
		return nil, err
	}

	var totalCalories, totalProtein, totalFat, totalCarbs float64
	for _, rec := range records {
		if rec.Product == nil {
			continue
		}
		totalCalories += rec.Product.Nutrition.Calories
		totalProtein += rec.Product.Nutrition.Protein
		totalFat += rec.Product.Nutrition.Fat
		totalCarbs += rec.Product.Nutrition.Carbs
	}

	target := model.DefaultNutritionTarget
	if c.profileRepo != nil {
		profile, err := c.profileRepo.GetByUserID(ctx, userID)
		if err == nil && profile != nil {
			target = profile.NutritionTarget()
		}
	}

	summary := &model.NutritionSummary{
		Date:     date,
		Calories: buildNutrientStatus(totalCalories, target.Calories),
		Protein:  buildNutrientStatus(totalProtein, target.Protein),
		Fat:      buildNutrientStatus(totalFat, target.Fat),
		Carbs:    buildNutrientStatus(totalCarbs, target.Carbs),
	}

	return summary, nil
}

func buildNutrientStatus(actual, target float64) model.NutrientStatus {
	ratio := 0.0
	if target > 0 {
		ratio = math.Round(actual/target*100) / 100
	}

	var status model.NutritionStatus
	switch {
	case ratio < 0.7:
		status = model.StatusDeficient
	case ratio > 1.2:
		status = model.StatusExcessive
	default:
		status = model.StatusAdequate
	}

	return model.NutrientStatus{
		Actual: actual,
		Target: target,
		Ratio:  ratio,
		Status: status,
	}
}
