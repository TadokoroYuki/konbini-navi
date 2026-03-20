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
	Calories float64 `json:"calories"`
	Protein  float64 `json:"protein"`
	Fat      float64 `json:"fat"`
	Carbs    float64 `json:"carbs"`
	Fiber    float64 `json:"fiber,omitempty"`
	Salt     float64 `json:"salt,omitempty"`
}

// Product represents a convenience store product.
type Product struct {
	ProductID   string    `json:"productId"`
	Name        string    `json:"name"`
	Brand       Brand     `json:"brand"`
	Category    Category  `json:"category"`
	Price       int       `json:"price"`
	Nutrition   Nutrition `json:"nutrition"`
	ImageURL    string    `json:"imageUrl"`
	Description string    `json:"description,omitempty"`
}
