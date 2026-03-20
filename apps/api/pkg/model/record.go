package model

// MealType represents the type of meal.
type MealType string

const (
	MealTypeBreakfast MealType = "breakfast"
	MealTypeLunch     MealType = "lunch"
	MealTypeDinner    MealType = "dinner"
	MealTypeSnack     MealType = "snack"
)

// Record represents a food consumption record.
type Record struct {
	RecordID  string   `json:"recordId"`
	UserID    string   `json:"userId"`
	ProductID string   `json:"productId"`
	Product   *Product `json:"product,omitempty"`
	Date      string   `json:"date"`
	MealType  MealType `json:"mealType"`
	CreatedAt string   `json:"createdAt"`
}

// CreateRecordRequest is the request body for creating a record.
type CreateRecordRequest struct {
	ProductID string   `json:"productId"`
	Date      string   `json:"date"`
	MealType  MealType `json:"mealType"`
}
