package products

import (
	productpb "github.com/TadokoroYuki/konbini-navi/apps/api/gen/product"
	"github.com/TadokoroYuki/konbini-navi/apps/api/pkg/model"
)

func toProtoProduct(p *model.Product) *productpb.Product {
	return &productpb.Product{
		ProductId:   p.ProductID,
		Name:        p.Name,
		Brand:       string(p.Brand),
		Category:    string(p.Category),
		Price:       int32(p.Price),
		ImageUrl:    p.ImageURL,
		Description: p.Description,
		Nutrition: &productpb.Nutrition{
			Calories: p.Nutrition.Calories,
			Protein:  p.Nutrition.Protein,
			Fat:      p.Nutrition.Fat,
			Carbs:    p.Nutrition.Carbs,
			Fiber:    p.Nutrition.Fiber,
			Salt:     p.Nutrition.Salt,
		},
	}
}

func FromProtoProduct(pb *productpb.Product) model.Product {
	p := model.Product{
		ProductID:   pb.GetProductId(),
		Name:        pb.GetName(),
		Brand:       model.Brand(pb.GetBrand()),
		Category:    model.Category(pb.GetCategory()),
		Price:       int(pb.GetPrice()),
		ImageURL:    pb.GetImageUrl(),
		Description: pb.GetDescription(),
	}
	if n := pb.GetNutrition(); n != nil {
		p.Nutrition = model.Nutrition{
			Calories: n.GetCalories(),
			Protein:  n.GetProtein(),
			Fat:      n.GetFat(),
			Carbs:    n.GetCarbs(),
			Fiber:    n.GetFiber(),
			Salt:     n.GetSalt(),
		}
	}
	return p
}
