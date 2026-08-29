package utils

import (
	"net/http/httptest"
	"testing"
)

func TestParsePagination(t *testing.T) {
	req := httptest.NewRequest("GET", "/api/v1/stories?page=2&limit=15", nil)
	p := ParsePagination(req)

	if p.Page != 2 {
		t.Errorf("expected page 2, got %d", p.Page)
	}

	if p.Limit != 15 {
		t.Errorf("expected limit 15, got %d", p.Limit)
	}

	if p.Offset() != 15 {
		t.Errorf("expected offset 15, got %d", p.Offset())
	}
}
