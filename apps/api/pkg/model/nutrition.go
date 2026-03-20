package model

// NutritionStatus represents how a nutrient compares to target.
type NutritionStatus string

const (
	StatusDeficient NutritionStatus = "deficient"
	StatusAdequate  NutritionStatus = "adequate"
	StatusExcessive NutritionStatus = "excessive"
)

// NutrientStatus holds the status of a single nutrient.
type NutrientStatus struct {
	Actual float64         `json:"actual"`
	Target float64         `json:"target"`
	Ratio  float64         `json:"ratio"`
	Status NutritionStatus `json:"status"`
}

// NutritionSummary holds the daily nutrition summary.
type NutritionSummary struct {
	Date     string         `json:"date"`
	Calories NutrientStatus `json:"calories"`
	Protein  NutrientStatus `json:"protein"`
	Fat      NutrientStatus `json:"fat"`
	Carbs    NutrientStatus `json:"carbs"`
}

// Recommendation represents a product recommendation.
type Recommendation struct {
	Product            Product  `json:"product"`
	Reason             string   `json:"reason"`
	DeficientNutrients []string `json:"deficientNutrients"`
}

// DefaultNutritionTarget is the default daily nutrition target.
var DefaultNutritionTarget = Nutrition{
	Calories: 2000,
	Protein:  65,
	Fat:      55,
	Carbs:    300,
}
