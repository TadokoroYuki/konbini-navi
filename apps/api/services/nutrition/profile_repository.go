package nutrition

import (
	"context"
	"database/sql"
	"time"

	"github.com/TadokoroYuki/konbini-navi/apps/api/pkg/model"
)

type ProfileRepository struct {
	db *sql.DB
}

func NewProfileRepository(db *sql.DB) *ProfileRepository {
	return &ProfileRepository{db: db}
}

func (r *ProfileRepository) GetByUserID(ctx context.Context, userID string) (*model.UserProfile, error) {
	query := `SELECT user_id, gender, age, height_cm, weight_kg, activity_level,
		target_calories, target_protein, target_fat, target_carbs
		FROM user_profiles WHERE user_id = $1`

	var p model.UserProfile
	var gender, activityLevel sql.NullString
	var age sql.NullInt64
	var heightCm, weightKg, targetCalories, targetProtein, targetFat, targetCarbs sql.NullFloat64

	err := r.db.QueryRowContext(ctx, query, userID).Scan(
		&p.UserID, &gender, &age, &heightCm, &weightKg, &activityLevel,
		&targetCalories, &targetProtein, &targetFat, &targetCarbs,
	)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}

	if gender.Valid {
		p.Gender = gender.String
	}
	if age.Valid {
		p.Age = int(age.Int64)
	}
	if heightCm.Valid {
		p.HeightCm = heightCm.Float64
	}
	if weightKg.Valid {
		p.WeightKg = weightKg.Float64
	}
	if activityLevel.Valid {
		p.ActivityLevel = activityLevel.String
	}
	if targetCalories.Valid {
		p.TargetCalories = targetCalories.Float64
	}
	if targetProtein.Valid {
		p.TargetProtein = targetProtein.Float64
	}
	if targetFat.Valid {
		p.TargetFat = targetFat.Float64
	}
	if targetCarbs.Valid {
		p.TargetCarbs = targetCarbs.Float64
	}

	return &p, nil
}

func (r *ProfileRepository) Upsert(ctx context.Context, p *model.UserProfile) error {
	query := `INSERT INTO user_profiles (user_id, gender, age, height_cm, weight_kg, activity_level,
		target_calories, target_protein, target_fat, target_carbs, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
		ON CONFLICT (user_id) DO UPDATE SET
		gender = EXCLUDED.gender, age = EXCLUDED.age,
		height_cm = EXCLUDED.height_cm, weight_kg = EXCLUDED.weight_kg,
		activity_level = EXCLUDED.activity_level,
		target_calories = EXCLUDED.target_calories, target_protein = EXCLUDED.target_protein,
		target_fat = EXCLUDED.target_fat, target_carbs = EXCLUDED.target_carbs,
		updated_at = EXCLUDED.updated_at`

	now := time.Now().UTC()
	_, err := r.db.ExecContext(ctx, query,
		p.UserID, nullStr(p.Gender), nullInt(p.Age), nullFloat(p.HeightCm), nullFloat(p.WeightKg),
		nullStr(p.ActivityLevel),
		nullFloat(p.TargetCalories), nullFloat(p.TargetProtein), nullFloat(p.TargetFat), nullFloat(p.TargetCarbs),
		now,
	)
	return err
}

func nullStr(s string) interface{} {
	if s == "" {
		return nil
	}
	return s
}

func nullInt(n int) interface{} {
	if n == 0 {
		return nil
	}
	return n
}

func nullFloat(f float64) interface{} {
	if f == 0 {
		return nil
	}
	return f
}
