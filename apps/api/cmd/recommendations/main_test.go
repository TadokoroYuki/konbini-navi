package main

import (
	"math"
	"testing"

	"github.com/TadokoroYuki/konbini-navi/apps/api/pkg/model"
)

const epsilon = 1e-9

func approxEqual(a, b float64) bool {
	return math.Abs(a-b) < epsilon
}

// ============================================================
// cosineSim テスト (TC01-TC07)
// ============================================================

// TC01: 同一ベクトル → 類似度 1.0
func TestCosineSim_IdenticalVectors(t *testing.T) {
	a := []float64{1, 2, 3}
	got := cosineSim(a, a)
	if !approxEqual(got, 1.0) {
		t.Errorf("expected 1.0, got %f", got)
	}
}

// TC02: 直交ベクトル → 類似度 0.0
func TestCosineSim_OrthogonalVectors(t *testing.T) {
	a := []float64{1, 0, 0}
	b := []float64{0, 1, 0}
	got := cosineSim(a, b)
	if !approxEqual(got, 0.0) {
		t.Errorf("expected 0.0, got %f", got)
	}
}

// TC03: 反対ベクトル → 類似度 -1.0
func TestCosineSim_OppositeVectors(t *testing.T) {
	a := []float64{1, 2, 3}
	b := []float64{-1, -2, -3}
	got := cosineSim(a, b)
	if !approxEqual(got, -1.0) {
		t.Errorf("expected -1.0, got %f", got)
	}
}

// TC04: ゼロベクトル同士 → 類似度 0.0 (ゼロ除算回避)
func TestCosineSim_BothZeroVectors(t *testing.T) {
	a := []float64{0, 0, 0}
	got := cosineSim(a, a)
	if !approxEqual(got, 0.0) {
		t.Errorf("expected 0.0, got %f", got)
	}
}

// TC05: 片方がゼロベクトル → 類似度 0.0
func TestCosineSim_OneZeroVector(t *testing.T) {
	a := []float64{1, 2, 3}
	b := []float64{0, 0, 0}
	got := cosineSim(a, b)
	if !approxEqual(got, 0.0) {
		t.Errorf("expected 0.0, got %f", got)
	}
}

// TC06: スカラー倍 → 類似度 1.0 (方向同じ)
func TestCosineSim_ScaledVector(t *testing.T) {
	a := []float64{1, 2, 3}
	b := []float64{10, 20, 30}
	got := cosineSim(a, b)
	if !approxEqual(got, 1.0) {
		t.Errorf("expected 1.0, got %f", got)
	}
}

// TC07: 既知の値で手計算と一致
func TestCosineSim_KnownValue(t *testing.T) {
	a := []float64{1, 0}
	b := []float64{1, 1}
	// cos(45°) = 1/√2 ≈ 0.7071
	expected := 1.0 / math.Sqrt(2)
	got := cosineSim(a, b)
	if !approxEqual(got, expected) {
		t.Errorf("expected %f, got %f", expected, got)
	}
}

// ============================================================
// buildProductVector テスト (TC08-TC12)
// ============================================================

// TC08: 栄養素が正しく正規化される
func TestBuildProductVector_NutritionNormalized(t *testing.T) {
	p := model.Product{
		Category:  model.CategoryOnigiri,
		Nutrition: model.Nutrition{Calories: 200, Protein: 6.5, Fat: 5.5, Carbs: 30, Fiber: 2, Salt: 0.8},
	}
	vec := buildProductVector(p)
	// calories: 200/2000=0.1, protein: 6.5/65=0.1, fat: 5.5/55=0.1, carbs: 30/300=0.1, fiber: 2/20=0.1, salt: 0.8/8=0.1
	for i := 0; i < nutritionDims; i++ {
		if !approxEqual(vec[i], 0.1) {
			t.Errorf("dim[%d]: expected 0.1, got %f", i, vec[i])
		}
	}
}

// TC09: カテゴリ one-hot が正しい位置に 1.0
func TestBuildProductVector_CategoryOneHot(t *testing.T) {
	p := model.Product{Category: model.CategorySalad}
	vec := buildProductVector(p)
	// salad は categories[3] → vec[nutritionDims+3]
	for i := 0; i < categoryDims; i++ {
		expected := 0.0
		if i == 3 { // salad
			expected = 1.0
		}
		if !approxEqual(vec[nutritionDims+i], expected) {
			t.Errorf("category dim[%d]: expected %f, got %f", i, expected, vec[nutritionDims+i])
		}
	}
}

// TC10: 栄養素ゼロの商品 → 栄養次元は全て0
func TestBuildProductVector_ZeroNutrition(t *testing.T) {
	p := model.Product{Category: model.CategoryDrink, Nutrition: model.Nutrition{}}
	vec := buildProductVector(p)
	for i := 0; i < nutritionDims; i++ {
		if vec[i] != 0 {
			t.Errorf("dim[%d]: expected 0, got %f", i, vec[i])
		}
	}
}

// TC11: ベクトルの長さが totalDims (16)
func TestBuildProductVector_Length(t *testing.T) {
	p := model.Product{Category: model.CategoryBento}
	vec := buildProductVector(p)
	if len(vec) != totalDims {
		t.Errorf("expected length %d, got %d", totalDims, len(vec))
	}
}

// TC12: 未知カテゴリ → カテゴリ次元は全て0
func TestBuildProductVector_UnknownCategory(t *testing.T) {
	p := model.Product{Category: model.Category("unknown")}
	vec := buildProductVector(p)
	for i := 0; i < categoryDims; i++ {
		if vec[nutritionDims+i] != 0 {
			t.Errorf("category dim[%d] should be 0 for unknown category, got %f", i, vec[nutritionDims+i])
		}
	}
}

// ============================================================
// buildUserVector テスト (TC13-TC20)
// ============================================================

func makeSummary(calActual, calTarget, proActual, proTarget, fatActual, fatTarget, carbActual, carbTarget float64) *model.NutritionSummary {
	return &model.NutritionSummary{
		Date:     "2026-03-21",
		Calories: model.NutrientStatus{Actual: calActual, Target: calTarget},
		Protein:  model.NutrientStatus{Actual: proActual, Target: proTarget},
		Fat:      model.NutrientStatus{Actual: fatActual, Target: fatTarget},
		Carbs:    model.NutrientStatus{Actual: carbActual, Target: carbTarget},
	}
}

func makeRecord(category model.Category) model.Record {
	p := &model.Product{Category: category}
	return model.Record{Product: p}
}

// TC13: 全栄養素が目標到達済み → 栄養次元は全て0
func TestBuildUserVector_AllNutrientsMet(t *testing.T) {
	s := makeSummary(2000, 2000, 65, 65, 55, 55, 300, 300)
	vec := buildUserVector(s, nil)
	for i := 0; i < nutritionDims; i++ {
		if vec[i] != 0 {
			t.Errorf("dim[%d]: expected 0, got %f", i, vec[i])
		}
	}
}

// TC14: 全栄養素が超過 → 栄養次元は全て0 (max(0, ...)でクランプ)
func TestBuildUserVector_AllNutrientsExceeded(t *testing.T) {
	s := makeSummary(3000, 2000, 100, 65, 80, 55, 500, 300)
	vec := buildUserVector(s, nil)
	for i := 0; i < nutritionDims; i++ {
		if vec[i] != 0 {
			t.Errorf("dim[%d]: expected 0 (clamped), got %f", i, vec[i])
		}
	}
}

// TC15: 何も食べていない → 栄養不足が最大
func TestBuildUserVector_NothingEaten(t *testing.T) {
	s := makeSummary(0, 2000, 0, 65, 0, 55, 0, 300)
	vec := buildUserVector(s, nil)
	// calories deficit = 2000/2000 = 1.0
	if !approxEqual(vec[0], 1.0) {
		t.Errorf("calories: expected 1.0, got %f", vec[0])
	}
	// protein deficit = 65/65 = 1.0
	if !approxEqual(vec[1], 1.0) {
		t.Errorf("protein: expected 1.0, got %f", vec[1])
	}
}

// TC16: 記録なし → 味の好み次元は全て0
func TestBuildUserVector_NoRecords_TasteZero(t *testing.T) {
	s := makeSummary(1000, 2000, 30, 65, 25, 55, 150, 300)
	vec := buildUserVector(s, nil)
	for i := 0; i < categoryDims; i++ {
		if vec[nutritionDims+i] != 0 {
			t.Errorf("taste dim[%d]: expected 0, got %f", i, vec[nutritionDims+i])
		}
	}
}

// TC17: 1カテゴリだけの記録 → そのカテゴリが1.0
func TestBuildUserVector_SingleCategory(t *testing.T) {
	s := makeSummary(1000, 2000, 30, 65, 25, 55, 150, 300)
	recs := []model.Record{
		makeRecord(model.CategoryOnigiri),
		makeRecord(model.CategoryOnigiri),
		makeRecord(model.CategoryOnigiri),
	}
	vec := buildUserVector(s, recs)
	// onigiri = categories[0] → freq = 3/3 = 1.0
	if !approxEqual(vec[nutritionDims+0], 1.0) {
		t.Errorf("onigiri: expected 1.0, got %f", vec[nutritionDims+0])
	}
	for i := 1; i < categoryDims; i++ {
		if vec[nutritionDims+i] != 0 {
			t.Errorf("taste dim[%d]: expected 0, got %f", i, vec[nutritionDims+i])
		}
	}
}

// TC18: 複数カテゴリの記録 → 頻度が正しく分配される
func TestBuildUserVector_MultipleCategories(t *testing.T) {
	s := makeSummary(1000, 2000, 30, 65, 25, 55, 150, 300)
	recs := []model.Record{
		makeRecord(model.CategoryOnigiri),  // 0
		makeRecord(model.CategoryOnigiri),  // 0
		makeRecord(model.CategorySalad),    // 3
		makeRecord(model.CategorySandwich), // 2
	}
	vec := buildUserVector(s, recs)
	// onigiri: 2/4=0.5, sandwich: 1/4=0.25, salad: 1/4=0.25
	if !approxEqual(vec[nutritionDims+0], 0.5) {
		t.Errorf("onigiri: expected 0.5, got %f", vec[nutritionDims+0])
	}
	if !approxEqual(vec[nutritionDims+2], 0.25) {
		t.Errorf("sandwich: expected 0.25, got %f", vec[nutritionDims+2])
	}
	if !approxEqual(vec[nutritionDims+3], 0.25) {
		t.Errorf("salad: expected 0.25, got %f", vec[nutritionDims+3])
	}
}

// TC19: Product が nil の記録は味の好みに影響しない
func TestBuildUserVector_NilProduct(t *testing.T) {
	s := makeSummary(1000, 2000, 30, 65, 25, 55, 150, 300)
	recs := []model.Record{
		{Product: nil},
		makeRecord(model.CategoryBento),
	}
	vec := buildUserVector(s, recs)
	// bento = categories[1], count=1, total=2 → 0.5
	if !approxEqual(vec[nutritionDims+1], 0.5) {
		t.Errorf("bento: expected 0.5, got %f", vec[nutritionDims+1])
	}
}

// TC20: ベクトルの長さが totalDims (16)
func TestBuildUserVector_Length(t *testing.T) {
	s := makeSummary(0, 2000, 0, 65, 0, 55, 0, 300)
	vec := buildUserVector(s, nil)
	if len(vec) != totalDims {
		t.Errorf("expected length %d, got %d", totalDims, len(vec))
	}
}
