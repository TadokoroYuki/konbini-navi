package records

import (
	recordpb "github.com/TadokoroYuki/konbini-navi/apps/api/gen/record"
	"github.com/TadokoroYuki/konbini-navi/apps/api/pkg/model"
	"github.com/TadokoroYuki/konbini-navi/apps/api/services/products"
)

func FromProtoRecord(pb *recordpb.Record) model.Record {
	rec := model.Record{
		RecordID:  pb.GetRecordId(),
		UserID:    pb.GetUserId(),
		ProductID: pb.GetProductId(),
		Date:      pb.GetDate(),
		MealType:  model.MealType(pb.GetMealType()),
		CreatedAt: pb.GetCreatedAt(),
	}
	if pb.GetProduct() != nil {
		p := products.FromProtoProduct(pb.GetProduct())
		rec.Product = &p
	}
	return rec
}
