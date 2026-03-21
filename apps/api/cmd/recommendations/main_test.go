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

// ============================================================
// 修正後の追加テスト (TC21-TC40)
// ============================================================

// TC21: buildUserVector — カスタム Target で正規化が正しい（修正2検証）
func TestBuildUserVector_CustomTarget(t *testing.T) {
	// Target が 1000 のとき、deficit 500 → 500/1000 = 0.5
	s := &model.NutritionSummary{
		Date:     "2026-03-21",
		Calories: model.NutrientStatus{Actual: 500, Target: 1000},
		Protein:  model.NutrientStatus{Actual: 20, Target: 40},
		Fat:      model.NutrientStatus{Actual: 10, Target: 30},
		Carbs:    model.NutrientStatus{Actual: 100, Target: 200},
	}
	vec := buildUserVector(s, nil)
	if !approxEqual(vec[0], 0.5) {
		t.Errorf("calories: expected 0.5, got %f", vec[0])
	}
	if !approxEqual(vec[1], 0.5) {
		t.Errorf("protein: expected 0.5, got %f", vec[1])
	}
}

// TC22: buildUserVector — Target が 0 の場合ゼロ除算しない
func TestBuildUserVector_ZeroTarget(t *testing.T) {
	s := &model.NutritionSummary{
		Date:     "2026-03-21",
		Calories: model.NutrientStatus{Actual: 100, Target: 0},
		Protein:  model.NutrientStatus{Actual: 5, Target: 0},
		Fat:      model.NutrientStatus{Actual: 3, Target: 0},
		Carbs:    model.NutrientStatus{Actual: 50, Target: 0},
	}
	vec := buildUserVector(s, nil)
	for i := 0; i < 4; i++ {
		if vec[i] != 0 {
			t.Errorf("dim[%d]: expected 0 (zero target), got %f", i, vec[i])
		}
	}
}

// TC23: buildUserVector — 半分食べた場合の正規化
func TestBuildUserVector_HalfEaten(t *testing.T) {
	s := makeSummary(1000, 2000, 32.5, 65, 27.5, 55, 150, 300)
	vec := buildUserVector(s, nil)
	// deficit = target - actual = target/2, ratio = 0.5
	if !approxEqual(vec[0], 0.5) {
		t.Errorf("calories: expected 0.5, got %f", vec[0])
	}
	if !approxEqual(vec[1], 0.5) {
		t.Errorf("protein: expected 0.5, got %f", vec[1])
	}
	if !approxEqual(vec[2], 0.5) {
		t.Errorf("fat: expected 0.5, got %f", vec[2])
	}
	if !approxEqual(vec[3], 0.5) {
		t.Errorf("carbs: expected 0.5, got %f", vec[3])
	}
}

// TC24: buildProductVector — 高カロリー商品の正規化
func TestBuildProductVector_HighCalorie(t *testing.T) {
	p := model.Product{
		Category:  model.CategoryBento,
		Nutrition: model.Nutrition{Calories: 1000, Protein: 32.5, Fat: 27.5, Carbs: 150},
	}
	vec := buildProductVector(p)
	// 1000/2000 = 0.5
	if !approxEqual(vec[0], 0.5) {
		t.Errorf("calories: expected 0.5, got %f", vec[0])
	}
}

// TC25: コサイン類似度 — カロリー不足時、カロリーのみの商品 vs 脂質のみの商品
func TestCosineSimIntegration_UserAndProduct(t *testing.T) {
	// ユーザー: カロリーだけ不足、他は十分
	s := makeSummary(0, 2000, 65, 65, 55, 55, 300, 300)
	userVec := buildUserVector(s, nil)
	// userVec[0] = 1.0 (カロリー不足), 他は0

	// カロリーが含まれる商品（方向一致）
	calProduct := model.Product{
		Nutrition: model.Nutrition{Calories: 800, Protein: 0, Fat: 0},
	}
	calVec := buildProductVector(calProduct)

	// カロリー0で脂質のみの商品（方向直交）
	fatProduct := model.Product{
		Nutrition: model.Nutrition{Calories: 0, Protein: 0, Fat: 50},
	}
	fatVec := buildProductVector(fatProduct)

	scoreCal := cosineSim(userVec[:nutritionDims], calVec[:nutritionDims])
	scoreFat := cosineSim(userVec[:nutritionDims], fatVec[:nutritionDims])

	if scoreCal <= scoreFat {
		t.Errorf("cal-matching product (%f) should score higher than fat-only (%f)", scoreCal, scoreFat)
	}
}

// TC26: 栄養不足ベクトルの方向と商品ベクトルが一致する場合スコアが高い
func TestScoring_DeficientNutrientMatchesProduct(t *testing.T) {
	// タンパク質だけ不足
	s := makeSummary(2000, 2000, 0, 65, 55, 55, 300, 300)
	userVec := buildUserVector(s, nil)

	// 高タンパク商品
	highProtein := model.Product{
		Category:  model.CategorySideDish,
		Nutrition: model.Nutrition{Protein: 30},
	}
	// 高炭水化物商品（タンパク質なし）
	highCarb := model.Product{
		Category:  model.CategoryBread,
		Nutrition: model.Nutrition{Carbs: 100},
	}

	hpVec := buildProductVector(highProtein)
	hcVec := buildProductVector(highCarb)

	scoreHP := cosineSim(userVec[:nutritionDims], hpVec[:nutritionDims])
	scoreHC := cosineSim(userVec[:nutritionDims], hcVec[:nutritionDims])

	if scoreHP <= scoreHC {
		t.Errorf("high-protein (%f) should beat high-carb (%f) when protein is deficient", scoreHP, scoreHC)
	}
}

// TC27: 味の好みベクトル — おにぎり好きにはおにぎりがマッチ
func TestScoring_TastePreferenceOnigiri(t *testing.T) {
	s := makeSummary(2000, 2000, 65, 65, 55, 55, 300, 300) // 栄養足りてる
	recs := []model.Record{
		makeRecord(model.CategoryOnigiri),
		makeRecord(model.CategoryOnigiri),
		makeRecord(model.CategoryOnigiri),
	}
	userVec := buildUserVector(s, recs)

	onigiri := model.Product{Category: model.CategoryOnigiri}
	bread := model.Product{Category: model.CategoryBread}

	oVec := buildProductVector(onigiri)
	bVec := buildProductVector(bread)

	scoreOnigiri := cosineSim(userVec[nutritionDims:], oVec[nutritionDims:])
	scoreBread := cosineSim(userVec[nutritionDims:], bVec[nutritionDims:])

	if scoreOnigiri <= scoreBread {
		t.Errorf("onigiri (%f) should be preferred over bread (%f)", scoreOnigiri, scoreBread)
	}
}

// TC28: 加重スコア — alpha*nutrition + beta*taste
func TestScoring_WeightedScore(t *testing.T) {
	// 栄養次元類似度を0.8、味次元類似度を0.5と仮定
	nutritionSim := 0.8
	tasteSim := 0.5
	expected := alphaWeight*nutritionSim + betaWeight*tasteSim
	got := 0.6*0.8 + 0.4*0.5
	if !approxEqual(expected, got) {
		t.Errorf("expected %f, got %f", expected, got)
	}
	if !approxEqual(expected, 0.68) {
		t.Errorf("expected 0.68, got %f", expected)
	}
}

// TC29: buildProductVector — 全カテゴリが正しい位置にマップされる
func TestBuildProductVector_AllCategories(t *testing.T) {
	for i, cat := range categories {
		p := model.Product{Category: cat}
		vec := buildProductVector(p)
		for j := 0; j < categoryDims; j++ {
			expected := 0.0
			if j == i {
				expected = 1.0
			}
			if !approxEqual(vec[nutritionDims+j], expected) {
				t.Errorf("category %s: dim[%d] expected %f, got %f", cat, j, expected, vec[nutritionDims+j])
			}
		}
	}
}

// TC30: buildUserVector — 全10カテゴリが均等に記録されている場合
func TestBuildUserVector_UniformCategories(t *testing.T) {
	s := makeSummary(1000, 2000, 30, 65, 25, 55, 150, 300)
	recs := make([]model.Record, 0, len(categories))
	for _, cat := range categories {
		recs = append(recs, makeRecord(cat))
	}
	vec := buildUserVector(s, recs)
	expected := 1.0 / float64(len(categories)) // 0.1
	for i := 0; i < categoryDims; i++ {
		if !approxEqual(vec[nutritionDims+i], expected) {
			t.Errorf("dim[%d]: expected %f, got %f", i, expected, vec[nutritionDims+i])
		}
	}
}

// TC31: cosineSim — 長さ1のベクトル
func TestCosineSim_UnitVectors(t *testing.T) {
	a := []float64{1}
	b := []float64{1}
	got := cosineSim(a, b)
	if !approxEqual(got, 1.0) {
		t.Errorf("expected 1.0, got %f", got)
	}
}

// TC32: cosineSim — 大きなベクトル（16次元）
func TestCosineSim_16Dimensions(t *testing.T) {
	a := make([]float64, 16)
	b := make([]float64, 16)
	for i := range a {
		a[i] = float64(i + 1)
		b[i] = float64(i + 1)
	}
	got := cosineSim(a, b)
	if !approxEqual(got, 1.0) {
		t.Errorf("expected 1.0 for identical 16d vectors, got %f", got)
	}
}

// TC33: buildUserVector — fiber/salt次元は常に0
func TestBuildUserVector_FiberSaltAlwaysZero(t *testing.T) {
	s := makeSummary(0, 2000, 0, 65, 0, 55, 0, 300)
	vec := buildUserVector(s, nil)
	// fiber = vec[4], salt = vec[5]
	if vec[4] != 0 {
		t.Errorf("fiber dim should be 0, got %f", vec[4])
	}
	if vec[5] != 0 {
		t.Errorf("salt dim should be 0, got %f", vec[5])
	}
}

// TC34: buildProductVector — fiber/saltが正しく正規化される
func TestBuildProductVector_FiberSalt(t *testing.T) {
	p := model.Product{
		Category:  model.CategorySalad,
		Nutrition: model.Nutrition{Fiber: 10, Salt: 4},
	}
	vec := buildProductVector(p)
	// fiber: 10/20 = 0.5, salt: 4/8 = 0.5
	if !approxEqual(vec[4], 0.5) {
		t.Errorf("fiber: expected 0.5, got %f", vec[4])
	}
	if !approxEqual(vec[5], 0.5) {
		t.Errorf("salt: expected 0.5, got %f", vec[5])
	}
}

// TC35: ゼロスコアの商品はフィルタされる（score <= 0）
func TestScoring_ZeroScoreFiltered(t *testing.T) {
	// 全栄養素が目標達成済み + 記録なし → ユーザーベクトルが全て0
	s := makeSummary(2000, 2000, 65, 65, 55, 55, 300, 300)
	userVec := buildUserVector(s, nil)

	p := model.Product{
		Category:  model.CategoryOnigiri,
		Nutrition: model.Nutrition{Calories: 200},
	}
	pVec := buildProductVector(p)

	score := alphaWeight*cosineSim(userVec[:nutritionDims], pVec[:nutritionDims]) +
		betaWeight*cosineSim(userVec[nutritionDims:], pVec[nutritionDims:])

	if score > 0 {
		t.Errorf("score should be 0 when user has no needs, got %f", score)
	}
}

// TC36: 複数不足栄養素がある場合、バランスよく補う商品がスコア高
func TestScoring_BalancedProductScoresHigher(t *testing.T) {
	// 全栄養素が不足
	s := makeSummary(0, 2000, 0, 65, 0, 55, 0, 300)
	userVec := buildUserVector(s, nil)

	// バランス型: 全栄養素をまんべんなく含む
	balanced := model.Product{
		Nutrition: model.Nutrition{Calories: 500, Protein: 20, Fat: 15, Carbs: 80},
	}
	// 偏り型: カロリーだけ高い
	biased := model.Product{
		Nutrition: model.Nutrition{Calories: 1000},
	}

	balVec := buildProductVector(balanced)
	biasVec := buildProductVector(biased)

	scoreBalanced := cosineSim(userVec[:nutritionDims], balVec[:nutritionDims])
	scoreBiased := cosineSim(userVec[:nutritionDims], biasVec[:nutritionDims])

	if scoreBalanced <= scoreBiased {
		t.Errorf("balanced product (%f) should score >= biased (%f)", scoreBalanced, scoreBiased)
	}
}

// TC37: alphaWeight + betaWeight = 1.0
func TestWeights_SumToOne(t *testing.T) {
	sum := alphaWeight + betaWeight
	if !approxEqual(sum, 1.0) {
		t.Errorf("alpha + beta should be 1.0, got %f", sum)
	}
}

// TC38: totalDims = nutritionDims + categoryDims
func TestDimensions_Consistent(t *testing.T) {
	if totalDims != nutritionDims+categoryDims {
		t.Errorf("totalDims (%d) != nutritionDims (%d) + categoryDims (%d)", totalDims, nutritionDims, categoryDims)
	}
}

// TC39: categories スライスの長さ = categoryDims
func TestCategories_Length(t *testing.T) {
	if len(categories) != categoryDims {
		t.Errorf("categories length (%d) != categoryDims (%d)", len(categories), categoryDims)
	}
}

// TC40: buildUserVector — 味の好み total は Product nil を含むレコード全体でカウントされる
func TestBuildUserVector_NilProductCountedInTotal(t *testing.T) {
	s := makeSummary(1000, 2000, 30, 65, 25, 55, 150, 300)
	recs := []model.Record{
		{Product: nil},                      // nil → catCount に入らないが total には含まれる
		makeRecord(model.CategoryOnigiri),   // catCount["onigiri"] = 1
	}
	vec := buildUserVector(s, recs)
	// total = 2 (len(recs)), onigiri count = 1 → freq = 1/2 = 0.5
	if !approxEqual(vec[nutritionDims+0], 0.5) {
		t.Errorf("onigiri: expected 0.5, got %f", vec[nutritionDims+0])
	}
}
