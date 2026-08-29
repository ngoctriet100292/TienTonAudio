package utils

import (
	"net/http"
	"strconv"
)

type PaginationParams struct {
	Page  int32 `json:"page"`
	Limit int32 `json:"limit"`
}

func (p PaginationParams) Offset() int32 {
	if p.Page <= 1 {
		return 0
	}
	return (p.Page - 1) * p.Limit
}

// ParsePagination extracts page and limit from URL query parameters
func ParsePagination(r *http.Request) PaginationParams {
	pageStr := r.URL.Query().Get("page")
	limitStr := r.URL.Query().Get("limit")

	page, err := strconv.Atoi(pageStr)
	if err != nil || page < 1 {
		page = 1
	}

	limit, err := strconv.Atoi(limitStr)
	if err != nil || limit < 1 {
		limit = 20
	} else if limit > 100 {
		limit = 100
	}

	return PaginationParams{
		Page:  int32(page),
		Limit: int32(limit),
	}
}
