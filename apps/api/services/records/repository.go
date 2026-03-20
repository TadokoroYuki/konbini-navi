package records

import (
	"context"
	"database/sql"
	"time"

	"github.com/TadokoroYuki/konbini-navi/apps/api/pkg/model"
)

type Repository struct {
	db            *sql.DB
	productClient *ProductClient
}

func NewRepository(db *sql.DB, productClient *ProductClient) *Repository {
	return &Repository{db: db, productClient: productClient}
}

func (r *Repository) ListByUserAndDate(ctx context.Context, userID string, date string) ([]model.Record, error) {
	var query string
	var args []interface{}

	if date != "" {
		query = "SELECT record_id, user_id, product_id, date, meal_type, created_at FROM records WHERE user_id = $1 AND date = $2 ORDER BY created_at DESC"
		args = []interface{}{userID, date}
	} else {
		query = "SELECT record_id, user_id, product_id, date, meal_type, created_at FROM records WHERE user_id = $1 ORDER BY created_at DESC"
		args = []interface{}{userID}
	}

	rows, err := r.db.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	records := make([]model.Record, 0)
	for rows.Next() {
		var rec model.Record
		var mealType sql.NullString
		var date time.Time
		var createdAt sql.NullTime
		err := rows.Scan(&rec.RecordID, &rec.UserID, &rec.ProductID, &date, &mealType, &createdAt)
		if err != nil {
			return nil, err
		}
		rec.Date = date.Format("2006-01-02")
		rec.MealType = model.MealType(mealType.String)
		if createdAt.Valid {
			rec.CreatedAt = createdAt.Time.UTC().Format(time.RFC3339)
		}

		// Fetch product details via gRPC
		product, err := r.productClient.GetByID(ctx, rec.ProductID)
		if err == nil && product != nil {
			rec.Product = product
		}

		records = append(records, rec)
	}

	return records, rows.Err()
}

func (r *Repository) Create(ctx context.Context, record *model.Record) error {
	query := "INSERT INTO records (record_id, user_id, product_id, date, meal_type, created_at) VALUES ($1, $2, $3, $4, $5, $6)"
	_, err := r.db.ExecContext(ctx, query, record.RecordID, record.UserID, record.ProductID, record.Date, record.MealType, record.CreatedAt)
	return err
}

func (r *Repository) Delete(ctx context.Context, userID string, recordID string) error {
	query := "DELETE FROM records WHERE user_id = $1 AND record_id = $2"
	_, err := r.db.ExecContext(ctx, query, userID, recordID)
	return err
}
