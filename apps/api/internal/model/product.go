package model

// Brand represents a convenience store brand.
type Brand string

const (
	BrandSevenEleven Brand = "seven_eleven"
	BrandFamilyMart  Brand = "family_mart"
	BrandLawson      Brand = "lawson"
)

// Category represents a product category.
type Category string

const (
	CategoryOnigiri  Category = "onigiri"
	CategoryBento    Category = "bento"
	CategorySandwich Category = "sandwich"
	CategorySalad    Category = "salad"
	CategorySoup     Category = "soup"
	CategoryNoodle   Category = "noodle"
	CategoryBread    Category = "bread"
	CategorySweets   Category = "sweets"
	CategoryDrink    Category = "drink"
	CategorySideDish Category = "side_dish"
)

// Nutrition holds nutritional information for a product.
type Nutrition struct {
	Calories float64 `json:"calories" dynamodbav:"calories"`
	Protein  float64 `json:"protein" dynamodbav:"protein"`
	Fat      float64 `json:"fat" dynamodbav:"fat"`
	Carbs    float64 `json:"carbs" dynamodbav:"carbs"`
	Fiber    float64 `json:"fiber,omitempty" dynamodbav:"fiber,omitempty"`
	Salt     float64 `json:"salt,omitempty" dynamodbav:"salt,omitempty"`
}

// Product represents a convenience store product.
type Product struct {
	ProductID   string    `json:"productId" dynamodbav:"productId"`
	Name        string    `json:"name" dynamodbav:"name"`
	Brand       Brand     `json:"brand" dynamodbav:"brand"`
	Category    Category  `json:"category" dynamodbav:"category"`
	Price       int       `json:"price" dynamodbav:"price"`
	Nutrition   Nutrition `json:"nutrition" dynamodbav:"nutrition"`
	ImageURL    string    `json:"imageUrl" dynamodbav:"imageUrl"`
	Description string    `json:"description,omitempty" dynamodbav:"description,omitempty"`
}
