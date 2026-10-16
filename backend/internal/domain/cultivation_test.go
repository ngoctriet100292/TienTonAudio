package domain

import (
	"math"
	"testing"
)

func TestExpandedCultivationBoundaries(t *testing.T) {
	counts := map[string]int{}
	for i, r := range GetCultivationRealms() {
		counts[r.Tier]++
		name, level, next, progress, _, _ := CalculateCultivationRealm(r.MinExp)
		if name != r.Name || level != i+1 || next != r.MaxExp {
			t.Fatalf("boundary %s: %s %d %d", r.Name, name, level, next)
		}
		if r.MaxExp != -1 {
			if progress != 0 {
				t.Fatalf("new level %s must start at 0%%", r.Name)
			}
			name, _, _, progress, _, _ = CalculateCultivationRealm(r.MaxExp - 1)
			if name != r.Name || progress < 0 || progress >= 100 {
				t.Fatalf("before threshold %s: %s %.3f", r.Name, name, progress)
			}
		}
	}
	if counts["vo-dao"] != 9 || counts["tu-tien"] != 12 || counts["tien-gioi"] != 13 {
		t.Fatalf("tier counts: %v", counts)
	}
	for _, name := range []string{"Tiên Quân", "Tiên Vương", "Tiên Tôn", "Chuẩn Tiên Đế", "Tiên Đế"} {
		found := false
		for _, r := range GetCultivationRealms() {
			if r.Name == name {
				found = true
				if r.Tier != "tien-gioi" {
					t.Fatalf("%s must belong to Tiên Giới", name)
				}
			}
		}
		if !found {
			t.Fatalf("missing realm %s", name)
		}
	}
	for _, exp := range []int64{20000000, math.MaxInt64} {
		name, level, next, progress, _, _ := CalculateCultivationRealm(exp)
		if name != "Tiên Đế" || level != 34 || next != -1 || progress != 100 {
			t.Fatalf("final level at %d: %s %d %d %f", exp, name, level, next, progress)
		}
	}
}
