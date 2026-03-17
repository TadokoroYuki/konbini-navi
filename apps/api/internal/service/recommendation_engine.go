package service

import (
	"context"
	"fmt"
	"strings"

	"github.com/TadokoroYuki/konbini-navi/apps/api/internal/model"
	"github.com/TadokoroYuki/konbini-navi/apps/api/internal/repository"
)

// RecommendationEngine provides product recommendations based on nutrition deficits.
type RecommendationEngine struct {
	calculator  *NutritionCalculator
	productRepo repository.ProductRepository
}

// NewRecommendationEngine creates a new RecommendationEngine.
func NewRecommendationEngine(calculator *NutritionCalculator, productRepo repository.ProductRepository) *RecommendationEngine {
	return &RecommendationEngine{
		calculator:  calculator,
		productRepo: productRepo,
	}
}

// Recommend returns product recommendations for a user on a given date.
func (e *RecommendationEngine) Recommend(ctx context.Context, userId string, date string) ([]model.Recommendation, error) {
	summary, err := e.calculator.Calculate(ctx, userId, date)
	if err != nil {
		return nil, err
	}

	// Find deficient nutrients
	deficients := findDeficientNutrients(summary)
	if len(deficients) == 0 {
		return []model.Recommendation{}, nil
	}

	// Search for products that could help with deficiencies
	// For MVP, search across all products and score them
	products, err := e.productRepo.Search(ctx, "", "", "", 50)
	if err != nil {
		return nil, err
	}

	type scoredProduct struct {
		product  model.Product
		score    float64
		nutrients []string
	}

	var scored []scoredProduct
	for _, p := range products {
		var score float64
		var helpsWith []string

		for _, nutrient := range deficients {
			switch nutrient {
			case "calories":
				if p.Nutrition.Calories > 300 {
					score += p.Nutrition.Calories / model.DefaultNutritionTarget.Calories
					helpsWith = append(helpsWith, "カロリー")
				}
			case "protein":
				if p.Nutrition.Protein > 10 {
					score += p.Nutrition.Protein / model.DefaultNutritionTarget.Protein
					helpsWith = append(helpsWith, "タンパク質")
				}
			case "fat":
				if p.Nutrition.Fat > 5 {
					score += p.Nutrition.Fat / model.DefaultNutritionTarget.Fat
					helpsWith = append(helpsWith, "脂質")
				}
			case "carbs":
				if p.Nutrition.Carbs > 30 {
					score += p.Nutrition.Carbs / model.DefaultNutritionTarget.Carbs
					helpsWith = append(helpsWith, "炭水化物")
				}
			}
		}

		if score > 0 {
			scored = append(scored, scoredProduct{
				product:   p,
				score:     score,
				nutrients: helpsWith,
			})
		}
	}

	// Sort by score descending (simple selection sort for small lists)
	for i := 0; i < len(scored); i++ {
		maxIdx := i
		for j := i + 1; j < len(scored); j++ {
			if scored[j].score > scored[maxIdx].score {
				maxIdx = j
			}
		}
		scored[i], scored[maxIdx] = scored[maxIdx], scored[i]
	}

	// Take top 5
	limit := 5
	if len(scored) < limit {
		limit = len(scored)
	}

	recommendations := make([]model.Recommendation, 0, limit)
	for i := 0; i < limit; i++ {
		s := scored[i]
		reason := fmt.Sprintf("%sが不足しています。%sで効率的に補えます。",
			strings.Join(s.nutrients, "、"), s.product.Name)
		recommendations = append(recommendations, model.Recommendation{
			Product:            s.product,
			Reason:             reason,
			DeficientNutrients: s.nutrients,
		})
	}

	return recommendations, nil
}

func findDeficientNutrients(summary *model.NutritionSummary) []string {
	var deficients []string
	if summary.Calories.Status == model.StatusDeficient {
		deficients = append(deficients, "calories")
	}
	if summary.Protein.Status == model.StatusDeficient {
		deficients = append(deficients, "protein")
	}
	if summary.Fat.Status == model.StatusDeficient {
		deficients = append(deficients, "fat")
	}
	if summary.Carbs.Status == model.StatusDeficient {
		deficients = append(deficients, "carbs")
	}
	return deficients
}
