package handler

import (
	"encoding/json"
	"fmt"
	"net/http"
	"strconv"

	"github.com/IREAKING/tientonaudio/backend/pkg/utils"
)

// Count and page share a PostgreSQL statement snapshot, including empty pages.
func (h *PlatformHandler) page(w http.ResponseWriter, r *http.Request, query string, args ...any) {
	page, limit := 1, 20
	var err error
	if v := r.URL.Query().Get("page"); v != "" {
		page, err = strconv.Atoi(v)
	}
	if err == nil {
		if v := r.URL.Query().Get("limit"); v != "" {
			limit, err = strconv.Atoi(v)
		}
	}
	if err != nil || page < 1 || page > 10000000 || limit < 1 || limit > 100 {
		utils.ErrorResponse(w, 400, "Trang phải từ 1; mỗi trang có 1–100 mục")
		return
	}
	offset := len(args) + 1
	args = append(args, page, limit)
	sql := fmt.Sprintf(`WITH results AS MATERIALIZED (%s), total AS (SELECT count(*) AS n FROM results), bounds AS (
 SELECT n,LEAST($%d::bigint,GREATEST(1,(n+$%d::bigint-1)/$%d::bigint)) AS page FROM total)
 SELECT jsonb_build_object('items',COALESCE((SELECT jsonb_agg(to_jsonb(items)) FROM(SELECT * FROM results LIMIT $%d OFFSET(SELECT(page-1)*$%d FROM bounds))items),'[]'::jsonb),
 'total',n,'page',page,'limit',$%d::int,'total_pages',GREATEST(1,(n+$%d::bigint-1)/$%d::bigint))FROM bounds`, query, offset, offset+1, offset+1, offset+1, offset+1, offset+1, offset+1, offset+1)
	var data json.RawMessage
	if err = h.pool.QueryRow(r.Context(), sql, args...).Scan(&data); err != nil {
		platformError(w)
		return
	}
	w.Header().Set("Cache-Control", "private, no-store")
	utils.JSON(w, 200, data)
}
