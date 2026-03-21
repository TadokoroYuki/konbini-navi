package model

// UserProfile holds user attributes for personalized nutrition targets.
type UserProfile struct {
	UserID        string  `json:"userId"`
	Gender        string  `json:"gender,omitempty"`
	Age           int     `json:"age,omitempty"`
	HeightCm      float64 `json:"heightCm,omitempty"`
	WeightKg      float64 `json:"weightKg,omitempty"`
	ActivityLevel string  `json:"activityLevel,omitempty"`
	TargetCalories float64 `json:"targetCalories,omitempty"`
	TargetProtein  float64 `json:"targetProtein,omitempty"`
	TargetFat      float64 `json:"targetFat,omitempty"`
	TargetCarbs    float64 `json:"targetCarbs,omitempty"`
}

// NutritionTarget returns the user's nutrition target, falling back to defaults.
func (p *UserProfile) NutritionTarget() Nutrition {
	target := DefaultNutritionTarget
	if p.TargetCalories > 0 {
		target.Calories = p.TargetCalories
	}
	if p.TargetProtein > 0 {
		target.Protein = p.TargetProtein
	}
	if p.TargetFat > 0 {
		target.Fat = p.TargetFat
	}
	if p.TargetCarbs > 0 {
		target.Carbs = p.TargetCarbs
	}
	return target
}
