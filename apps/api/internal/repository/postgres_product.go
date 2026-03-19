package repository

import (
	"context"
	"database/sql"
	"fmt"
	"strings"

	"github.com/TadokoroYuki/konbini-navi/apps/api/internal/model"
)

// PostgresProductRepository implements ProductRepository using PostgreSQL.
type PostgresProductRepository struct {
	db *sql.DB
}

// NewPostgresProductRepository creates a new PostgresProductRepository.
func NewPostgresProductRepository(db *sql.DB) *PostgresProductRepository {
	return &PostgresProductRepository{db: db}
}

// Search searches for products by query, brand, and category.
func (r *PostgresProductRepository) Search(ctx context.Context, query string, brand string, category string, limit int) ([]model.Product, error) {
	if limit <= 0 {
		limit = 20
	}

	// Build WHERE clauses dynamically
	var whereConditions []string
	var args []interface{}
	argIndex := 1

	if query != "" {
		whereConditions = append(whereConditions, fmt.Sprintf("name ILIKE $%d", argIndex))
		args = append(args, "%"+query+"%")
		argIndex++
	}

	if brand != "" {
		whereConditions = append(whereConditions, fmt.Sprintf("brand = $%d", argIndex))
		args = append(args, brand)
		argIndex++
	}

	if category != "" {
		whereConditions = append(whereConditions, fmt.Sprintf("category = $%d", argIndex))
		args = append(args, category)
		argIndex++
	}

	sqlQuery := "SELECT product_id, name, brand, category, calories, protein, fat, carbs FROM products"
	if len(whereConditions) > 0 {
		sqlQuery += " WHERE " + strings.Join(whereConditions, " AND ")
	}
	sqlQuery += fmt.Sprintf(" LIMIT $%d", argIndex)
	args = append(args, limit)

	rows, err := r.db.QueryContext(ctx, sqlQuery, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var products []model.Product
	for rows.Next() {
		var product model.Product
		var calories, protein, fat, carbs sql.NullFloat64

		err := rows.Scan(
			&product.ProductID,
			&product.Name,
			&product.Brand,
			&product.Category,
			&calories,
			&protein,
			&fat,
			&carbs,
		)
		if err != nil {
			return nil, err
		}

		// Initialize Nutrition struct
		if calories.Valid || protein.Valid || fat.Valid || carbs.Valid {
			product.Nutrition = model.Nutrition{
				Calories: calories.Float64,
				Protein:  protein.Float64,
				Fat:      fat.Float64,
				Carbs:    carbs.Float64,
			}
		}

		products = append(products, product)
	}

	return products, rows.Err()
}

// GetByID retrieves a product by its ID.
func (r *PostgresProductRepository) GetByID(ctx context.Context, productID string) (*model.Product, error) {
	row := r.db.QueryRowContext(ctx,
		"SELECT product_id, name, brand, category, calories, protein, fat, carbs FROM products WHERE product_id = $1",
		productID,
	)

	var product model.Product
	var calories, protein, fat, carbs sql.NullFloat64

	err := row.Scan(
		&product.ProductID,
		&product.Name,
		&product.Brand,
		&product.Category,
		&calories,
		&protein,
		&fat,
		&carbs,
	)

	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}

	// Initialize Nutrition struct
	if calories.Valid || protein.Valid || fat.Valid || carbs.Valid {
		product.Nutrition = model.Nutrition{
			Calories: calories.Float64,
			Protein:  protein.Float64,
			Fat:      fat.Float64,
			Carbs:    carbs.Float64,
		}
	}

	return &product, nil
}
