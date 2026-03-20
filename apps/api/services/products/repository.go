package products

import (
	"context"
	"database/sql"
	"fmt"
	"strings"

	"github.com/TadokoroYuki/konbini-navi/apps/api/pkg/model"
)

type Repository struct {
	db *sql.DB
}

func NewRepository(db *sql.DB) *Repository {
	return &Repository{db: db}
}

func (r *Repository) Search(ctx context.Context, query string, brand string, category string, limit int) ([]model.Product, error) {
	if limit <= 0 {
		limit = 20
	}

	var conditions []string
	var args []interface{}
	idx := 1

	if query != "" {
		conditions = append(conditions, fmt.Sprintf("name ILIKE $%d", idx))
		args = append(args, "%"+query+"%")
		idx++
	}
	if brand != "" {
		conditions = append(conditions, fmt.Sprintf("brand = $%d", idx))
		args = append(args, brand)
		idx++
	}
	if category != "" {
		conditions = append(conditions, fmt.Sprintf("category = $%d", idx))
		args = append(args, category)
		idx++
	}

	q := "SELECT product_id, name, brand, category, price, calories, protein, fat, carbs, fiber, salt, image_url, description FROM products"
	if len(conditions) > 0 {
		q += " WHERE " + strings.Join(conditions, " AND ")
	}
	q += fmt.Sprintf(" LIMIT $%d", idx)
	args = append(args, limit)

	rows, err := r.db.QueryContext(ctx, q, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	products := make([]model.Product, 0)
	for rows.Next() {
		var p model.Product
		var calories, protein, fat, carbs, fiber, salt sql.NullFloat64
		var price sql.NullInt64
		var imageURL, description sql.NullString

		err := rows.Scan(
			&p.ProductID, &p.Name, &p.Brand, &p.Category,
			&price, &calories, &protein, &fat, &carbs, &fiber, &salt,
			&imageURL, &description,
		)
		if err != nil {
			return nil, err
		}

		p.Price = int(price.Int64)
		p.Nutrition = model.Nutrition{
			Calories: calories.Float64,
			Protein:  protein.Float64,
			Fat:      fat.Float64,
			Carbs:    carbs.Float64,
			Fiber:    fiber.Float64,
			Salt:     salt.Float64,
		}
		p.ImageURL = imageURL.String
		p.Description = description.String
		products = append(products, p)
	}

	return products, rows.Err()
}

func (r *Repository) GetByID(ctx context.Context, productID string) (*model.Product, error) {
	row := r.db.QueryRowContext(ctx,
		"SELECT product_id, name, brand, category, price, calories, protein, fat, carbs, fiber, salt, image_url, description FROM products WHERE product_id = $1",
		productID,
	)

	var p model.Product
	var calories, protein, fat, carbs, fiber, salt sql.NullFloat64
	var price sql.NullInt64
	var imageURL, description sql.NullString

	err := row.Scan(
		&p.ProductID, &p.Name, &p.Brand, &p.Category,
		&price, &calories, &protein, &fat, &carbs, &fiber, &salt,
		&imageURL, &description,
	)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}

	p.Price = int(price.Int64)
	p.Nutrition = model.Nutrition{
		Calories: calories.Float64,
		Protein:  protein.Float64,
		Fat:      fat.Float64,
		Carbs:    carbs.Float64,
		Fiber:    fiber.Float64,
		Salt:     salt.Float64,
	}
	p.ImageURL = imageURL.String
	p.Description = description.String

	return &p, nil
}
