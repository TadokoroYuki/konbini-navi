package repository

import (
	"context"

	"github.com/TadokoroYuki/konbini-navi/apps/api/internal/model"
)

// ProductRepository defines the interface for product data access.
type ProductRepository interface {
	Search(ctx context.Context, query string, brand string, category string, limit int) ([]model.Product, error)
	GetByID(ctx context.Context, productId string) (*model.Product, error)
}

// RecordRepository defines the interface for record data access.
type RecordRepository interface {
	ListByUserAndDate(ctx context.Context, userId string, date string) ([]model.Record, error)
	Create(ctx context.Context, record *model.Record) error
	Delete(ctx context.Context, userId string, recordId string) error
}
