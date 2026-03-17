package service

import (
	"context"
	"math"

	"github.com/TadokoroYuki/konbini-navi/apps/api/internal/model"
	"github.com/TadokoroYuki/konbini-navi/apps/api/internal/repository"
)

// NutritionCalculator calculates daily nutrition from records.
type NutritionCalculator struct {
	recordRepo  repository.RecordRepository
	productRepo repository.ProductRepository
}

// NewNutritionCalculator creates a new NutritionCalculator.
func NewNutritionCalculator(recordRepo repository.RecordRepository, productRepo repository.ProductRepository) *NutritionCalculator {
	return &NutritionCalculator{
		recordRepo:  recordRepo,
		productRepo: productRepo,
	}
}

// Calculate computes the nutrition summary for a user on a given date.
func (c *NutritionCalculator) Calculate(ctx context.Context, userId string, date string) (*model.NutritionSummary, error) {
	records, err := c.recordRepo.ListByUserAndDate(ctx, userId, date)
	if err != nil {
		return nil, err
	}

	// Sum up nutrition from all records
	var totalCalories, totalProtein, totalFat, totalCarbs float64
	for _, record := range records {
		if record.Product == nil {
			// Try to fetch the product if not already attached
			product, err := c.productRepo.GetByID(ctx, record.ProductID)
			if err != nil || product == nil {
				continue
			}
			record.Product = product
		}
		totalCalories += record.Product.Nutrition.Calories
		totalProtein += record.Product.Nutrition.Protein
		totalFat += record.Product.Nutrition.Fat
		totalCarbs += record.Product.Nutrition.Carbs
	}

	target := model.DefaultNutritionTarget

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
