package nutrition

import (
	"testing"

	"github.com/TadokoroYuki/konbini-navi/apps/api/pkg/model"
)

func TestBuildNutrientStatus_Deficient(t *testing.T) {
	// ratio < 0.7 → deficient
	status := buildNutrientStatus(100, 200)
	if status.Status != model.StatusDeficient {
		t.Errorf("expected deficient, got %s", status.Status)
	}
	if status.Actual != 100 {
		t.Errorf("expected actual=100, got %f", status.Actual)
	}
	if status.Target != 200 {
		t.Errorf("expected target=200, got %f", status.Target)
	}
	if status.Ratio != 0.5 {
		t.Errorf("expected ratio=0.5, got %f", status.Ratio)
	}
}

func TestBuildNutrientStatus_Adequate(t *testing.T) {
	// 0.7 <= ratio <= 1.2 → adequate
	tests := []struct {
		name   string
		actual float64
		target float64
		ratio  float64
	}{
		{"exact match", 200, 200, 1.0},
		{"lower bound", 140, 200, 0.7},
		{"upper bound", 240, 200, 1.2},
		{"mid range", 180, 200, 0.9},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			status := buildNutrientStatus(tt.actual, tt.target)
			if status.Status != model.StatusAdequate {
				t.Errorf("expected adequate, got %s (ratio=%f)", status.Status, status.Ratio)
			}
			if status.Ratio != tt.ratio {
				t.Errorf("expected ratio=%f, got %f", tt.ratio, status.Ratio)
			}
		})
	}
}

func TestBuildNutrientStatus_Excessive(t *testing.T) {
	// ratio > 1.2 → excessive
	status := buildNutrientStatus(300, 200)
	if status.Status != model.StatusExcessive {
		t.Errorf("expected excessive, got %s", status.Status)
	}
	if status.Ratio != 1.5 {
		t.Errorf("expected ratio=1.5, got %f", status.Ratio)
	}
}

func TestBuildNutrientStatus_ZeroTarget(t *testing.T) {
	// target=0 → ratio=0 → deficient
	status := buildNutrientStatus(100, 0)
	if status.Ratio != 0 {
		t.Errorf("expected ratio=0, got %f", status.Ratio)
	}
	if status.Status != model.StatusDeficient {
		t.Errorf("expected deficient, got %s", status.Status)
	}
}

func TestBuildNutrientStatus_ZeroActual(t *testing.T) {
	status := buildNutrientStatus(0, 200)
	if status.Status != model.StatusDeficient {
		t.Errorf("expected deficient, got %s", status.Status)
	}
	if status.Ratio != 0 {
		t.Errorf("expected ratio=0, got %f", status.Ratio)
	}
}

func TestBuildNutrientStatus_BothZero(t *testing.T) {
	status := buildNutrientStatus(0, 0)
	if status.Ratio != 0 {
		t.Errorf("expected ratio=0, got %f", status.Ratio)
	}
	if status.Status != model.StatusDeficient {
		t.Errorf("expected deficient, got %s", status.Status)
	}
}

func TestBuildNutrientStatus_BoundaryValues(t *testing.T) {
	// Test boundary: ratio exactly 0.69 → deficient
	status := buildNutrientStatus(69, 100)
	if status.Status != model.StatusDeficient {
		t.Errorf("ratio=0.69: expected deficient, got %s", status.Status)
	}

	// Test boundary: ratio exactly 1.21 → excessive
	status = buildNutrientStatus(121, 100)
	if status.Status != model.StatusExcessive {
		t.Errorf("ratio=1.21: expected excessive, got %s", status.Status)
	}
}
