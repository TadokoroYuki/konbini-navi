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
	RecordID  string   `json:"recordId" dynamodbav:"recordId"`
	UserID    string   `json:"userId" dynamodbav:"userId"`
	ProductID string   `json:"productId" dynamodbav:"productId"`
	Product   *Product `json:"product,omitempty" dynamodbav:"-"`
	Date      string   `json:"date" dynamodbav:"date"`
	MealType  MealType `json:"mealType" dynamodbav:"mealType"`
	CreatedAt string   `json:"createdAt" dynamodbav:"createdAt"`
	SK        string   `json:"-" dynamodbav:"SK"`
}

// CreateRecordRequest is the request body for creating a record.
type CreateRecordRequest struct {
	ProductID string   `json:"productId"`
	Date      string   `json:"date"`
	MealType  MealType `json:"mealType"`
}
