package repository

import (
	"context"
	"database/sql"

	"github.com/TadokoroYuki/konbini-navi/apps/api/internal/model"
)

// PostgresRecordRepository implements RecordRepository using PostgreSQL.
type PostgresRecordRepository struct {
	db          *sql.DB
	productRepo ProductRepository
}

// NewPostgresRecordRepository creates a new PostgresRecordRepository.
func NewPostgresRecordRepository(db *sql.DB, productRepo ProductRepository) *PostgresRecordRepository {
	return &PostgresRecordRepository{
		db:          db,
		productRepo: productRepo,
	}
}

// ListByUserAndDate lists records for a user on a specific date.
// If date is empty, all records for the user are returned.
func (r *PostgresRecordRepository) ListByUserAndDate(ctx context.Context, userID string, date string) ([]model.Record, error) {
	var query string
	var args []interface{}

	if date != "" {
		query = "SELECT record_id, user_id, product_id, date FROM records WHERE user_id = $1 AND date = $2 ORDER BY created_at DESC"
		args = []interface{}{userID, date}
	} else {
		query = "SELECT record_id, user_id, product_id, date FROM records WHERE user_id = $1 ORDER BY created_at DESC"
		args = []interface{}{userID}
	}

	rows, err := r.db.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var records []model.Record
	for rows.Next() {
		var record model.Record
		err := rows.Scan(
			&record.RecordID,
			&record.UserID,
			&record.ProductID,
			&record.Date,
		)
		if err != nil {
			return nil, err
		}

		// Attach product details to each record
		product, err := r.productRepo.GetByID(ctx, record.ProductID)
		if err == nil && product != nil {
			record.Product = product
		}

		records = append(records, record)
	}

	return records, rows.Err()
}

// Create creates a new record.
func (r *PostgresRecordRepository) Create(ctx context.Context, record *model.Record) error {
	query := "INSERT INTO records (user_id, record_id, product_id, date) VALUES ($1, $2, $3, $4)"
	_, err := r.db.ExecContext(ctx, query, record.UserID, record.RecordID, record.ProductID, record.Date)
	return err
}

// Delete deletes a record.
func (r *PostgresRecordRepository) Delete(ctx context.Context, userID string, recordID string) error {
	query := "DELETE FROM records WHERE user_id = $1 AND record_id = $2"
	_, err := r.db.ExecContext(ctx, query, userID, recordID)
	return err
}
