package handler

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"math"
	"net/http"
	"regexp"
	"strconv"
	"strings"

	"github.com/IREAKING/tientonaudio/backend/internal/domain"
	"github.com/IREAKING/tientonaudio/backend/internal/repository"
	"github.com/IREAKING/tientonaudio/backend/pkg/utils"
	"github.com/go-chi/chi/v5"
)

func realmVersion(realms []domain.CultivationRealmInfo) string {
	data, _ := json.Marshal(realms)
	sum := sha256.Sum256(data)
	return hex.EncodeToString(sum[:])
}
func (h *PlatformHandler) AdminRealms(w http.ResponseWriter, r *http.Request) {
	user, admin := platformUser(r)
	if !admin {
		utils.ErrorResponse(w, 403, "Chỉ quản trị viên được phép thao tác")
		return
	}
	if r.Method == http.MethodGet {
		realms, err := repository.LoadCultivationRealms(r.Context(), h.pool)
		if err != nil {
			platformError(w)
			return
		}
		utils.JSON(w, 200, map[string]any{"realms": realms, "version": realmVersion(realms)})
		return
	}
	var body struct {
		Realms  []domain.CultivationRealmInfo `json:"realms"`
		Version string                        `json:"version"`
	}
	if !platformBody(w, r, &body) {
		return
	}
	if len(body.Realms) < 1 || len(body.Realms) > 200 {
		utils.ErrorResponse(w, 400, "Danh sách phải có 1–200 cảnh giới")
		return
	}
	color := regexp.MustCompile(`^#[0-9a-fA-F]{6}$`)
	for i := range body.Realms {
		item := &body.Realms[i]
		item.Name = strings.TrimSpace(item.Name)
		if item.Level != i+1 || len([]rune(item.Name)) < 1 || len([]rune(item.Name)) > 50 || !color.MatchString(item.Color) || item.TierName == "" || len(item.Description) > 8000 {
			utils.ErrorResponse(w, 400, "Tên, thứ tự, màu hoặc mô tả cảnh giới không hợp lệ")
			return
		}
		item.MaxExp = -1
		if i+1 < len(body.Realms) {
			item.MaxExp = body.Realms[i+1].MinExp
		}
	}
	if err := domain.ValidateCultivationRealms(body.Realms); err != nil {
		utils.ErrorResponse(w, 400, "Ngưỡng EXP phải bắt đầu từ 0 và tăng dần theo cấp")
		return
	}
	tx, err := h.begin(r.Context())
	if err != nil {
		platformError(w)
		return
	}
	defer tx.Rollback(context.Background())
	if _, err = tx.Exec(r.Context(), `SELECT pg_advisory_xact_lock(461107)`); err != nil {
		platformError(w)
		return
	}
	current, err := repository.LoadCultivationRealms(r.Context(), tx)
	if err != nil {
		platformError(w)
		return
	}
	if body.Version == "" || body.Version != realmVersion(current) {
		utils.ErrorResponse(w, 409, "Danh sách đã thay đổi; hãy tải lại trước khi lưu")
		return
	}
	if _, err = tx.Exec(r.Context(), `DELETE FROM cultivation_realms`); err != nil {
		platformError(w)
		return
	}
	for _, item := range body.Realms {
		if _, err = tx.Exec(r.Context(), `INSERT INTO cultivation_realms(level,name,tier,tier_name,min_exp,description,ability,privilege,color)VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)`, item.Level, item.Name, item.Tier, item.TierName, item.MinExp, item.Description, item.Ability, item.Privilege, item.Color); err != nil {
			utils.ErrorResponse(w, 400, "Tên hoặc EXP bị trùng; chưa có thay đổi nào được lưu")
			return
		}
	}
	if _, err = tx.Exec(r.Context(), `UPDATE users SET cultivation_realm=(SELECT name FROM cultivation_realms WHERE min_exp<=GREATEST(COALESCE(users.cultivation_exp,0),0) ORDER BY min_exp DESC LIMIT 1)`); err != nil {
		platformError(w)
		return
	}
	if _, err = tx.Exec(r.Context(), `INSERT INTO admin_change_log(admin_id,action)VALUES($1,'Cập nhật catalogue cảnh giới')`, user); err != nil {
		platformError(w)
		return
	}
	if tx.Commit(r.Context()) != nil {
		platformError(w)
		return
	}
	_ = domain.SetCultivationRealms(body.Realms)
	utils.JSON(w, 200, map[string]any{"realms": body.Realms, "version": realmVersion(body.Realms)})
}
func (h *PlatformHandler) AdminPlans(w http.ResponseWriter, r *http.Request) {
	user, admin := platformUser(r)
	if !admin {
		utils.ErrorResponse(w, 403, "Chỉ quản trị viên được phép thao tác")
		return
	}
	if r.Method == http.MethodGet {
		h.rows(w, r, `SELECT id,name,price,duration_days,description,is_active FROM subscription_plans ORDER BY id`)
		return
	}
	var body struct {
		Name         string  `json:"name"`
		Price        float64 `json:"price"`
		DurationDays int     `json:"duration_days"`
		Description  string  `json:"description"`
		IsActive     bool    `json:"is_active"`
	}
	if !platformBody(w, r, &body) {
		return
	}
	body.Name = strings.TrimSpace(body.Name)
	if len([]rune(body.Name)) < 1 || len([]rune(body.Name)) > 50 || math.IsNaN(body.Price) || math.IsInf(body.Price, 0) || body.Price < 1 || math.Trunc(body.Price) != body.Price || body.Price > 9999999999 || body.DurationDays < 1 || body.DurationDays > 3650 || len([]rune(body.Description)) > 4000 {
		utils.ErrorResponse(w, 400, "Tên, giá VND, thời hạn hoặc mô tả không hợp lệ")
		return
	}
	tx, err := h.begin(r.Context())
	if err != nil {
		platformError(w)
		return
	}
	defer tx.Rollback(context.Background())
	var id int
	if r.Method == http.MethodPost {
		err = tx.QueryRow(r.Context(), `INSERT INTO subscription_plans(name,price,duration_days,description,is_active)VALUES($1,$2,$3,$4,$5)RETURNING id`, body.Name, body.Price, body.DurationDays, body.Description, body.IsActive).Scan(&id)
	} else {
		id, err = strconv.Atoi(chi.URLParam(r, "id"))
		if err != nil {
			utils.ErrorResponse(w, 400, "Gói không hợp lệ")
			return
		}
		var found int
		err = tx.QueryRow(r.Context(), `UPDATE subscription_plans SET name=$2,price=$3,duration_days=$4,description=$5,is_active=$6 WHERE id=$1 RETURNING id`, id, body.Name, body.Price, body.DurationDays, body.Description, body.IsActive).Scan(&found)
	}
	if err != nil {
		utils.ErrorResponse(w, 400, "Không lưu được gói hội viên")
		return
	}
	if _, err = tx.Exec(r.Context(), `INSERT INTO admin_change_log(admin_id,action)VALUES($1,$2)`, user, "Cập nhật gói hội viên "+strconv.Itoa(id)); err != nil {
		platformError(w)
		return
	}
	if tx.Commit(r.Context()) != nil {
		platformError(w)
		return
	}
	utils.JSON(w, 200, map[string]int{"id": id})
}
