package recommendations

import (
	"context"
	"fmt"
	"strings"

	"github.com/TadokoroYuki/konbini-navi/apps/api/pkg/model"
)

type Engine struct {
	nutritionClient *NutritionClient
	productClient   *ProductClient
}

func NewEngine(nutritionClient *NutritionClient, productClient *ProductClient) *Engine {
	return &Engine{
		nutritionClient: nutritionClient,
		productClient:   productClient,
	}
}

func (e *Engine) Recommend(ctx context.Context, userID string, date string) ([]model.Recommendation, error) {
	summary, err := e.nutritionClient.GetNutrition(ctx, userID, date)
	if err != nil {
		return nil, err
	}

	deficients := findDeficientNutrients(summary)
	if len(deficients) == 0 {
		return []model.Recommendation{}, nil
	}

	allProducts, err := e.productClient.SearchProducts(ctx, "", "", "", 50)
	if err != nil {
		return nil, err
	}

	type scoredProduct struct {
		product   model.Product
		score     float64
		nutrients []string
	}

	var scored []scoredProduct
	for _, p := range allProducts {
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

	// Sort by score descending
	for i := 0; i < len(scored); i++ {
		maxIdx := i
		for j := i + 1; j < len(scored); j++ {
			if scored[j].score > scored[maxIdx].score {
				maxIdx = j
			}
		}
		scored[i], scored[maxIdx] = scored[maxIdx], scored[i]
	}

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
