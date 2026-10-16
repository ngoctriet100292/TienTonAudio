package handler

import (
	"context"
	"net/http"

	"github.com/IREAKING/tientonaudio/backend/internal/domain"
	"github.com/IREAKING/tientonaudio/backend/pkg/utils"
	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
)

type achievement struct {
	Key      string `json:"key"`
	Name     string `json:"name"`
	Progress int64  `json:"progress"`
	Target   int64  `json:"target"`
	Reward   int64  `json:"reward_exp"`
	Period   string `json:"period"`
	Claimed  bool   `json:"claimed"`
}

func achievements(ctx context.Context, q interface {
	QueryRow(context.Context, string, ...any) pgx.Row
}, user uuid.UUID) ([]achievement, error) {
	var minutes, days, today int64
	var day string
	err := q.QueryRow(ctx, `SELECT COALESCE(SUM(minutes),0),COUNT(DISTINCT (occurred_at AT TIME ZONE 'Asia/Ho_Chi_Minh')::date),COALESCE(SUM(minutes)FILTER(WHERE (occurred_at AT TIME ZONE 'Asia/Ho_Chi_Minh')::date=(CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Ho_Chi_Minh')::date),0),(CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Ho_Chi_Minh')::date::text FROM listening_reward_events WHERE user_id=$1`, user).Scan(&minutes, &days, &today, &day)
	if err != nil {
		return nil, err
	}
	items := []achievement{{Key: "daily-listening", Name: "Nghe 15 phút hôm nay", Progress: today, Target: 15, Reward: 15, Period: day}, {Key: "first-hour", Name: "Một giờ tiên lộ", Progress: minutes, Target: 60, Reward: 50, Period: "lifetime"}, {Key: "ten-hours", Name: "Mười giờ đồng hành", Progress: minutes, Target: 600, Reward: 200, Period: "lifetime"}, {Key: "seven-days", Name: "Bảy ngày tu luyện", Progress: days, Target: 7, Reward: 300, Period: "lifetime"}}
	for i := range items {
		if err = q.QueryRow(ctx, `SELECT EXISTS(SELECT 1 FROM achievement_claims WHERE user_id=$1 AND achievement_key=$2 AND period=$3)`, user, items[i].Key, items[i].Period).Scan(&items[i].Claimed); err != nil {
			return nil, err
		}
	}
	return items, nil
}
func (h *PlatformHandler) Achievements(w http.ResponseWriter, r *http.Request) {
	user, _ := platformUser(r)
	if r.Method == http.MethodGet {
		items, err := achievements(r.Context(), h.pool, user)
		if err != nil {
			platformError(w)
			return
		}
		utils.JSON(w, 200, items)
		return
	}
	tx, err := h.begin(r.Context())
	if err != nil {
		platformError(w)
		return
	}
	defer tx.Rollback(context.Background())
	var exp int64
	if err = tx.QueryRow(r.Context(), `SELECT COALESCE(cultivation_exp,0) FROM users WHERE id=$1 AND deleted_at IS NULL FOR UPDATE`, user).Scan(&exp); err != nil {
		utils.ErrorResponse(w, 401, "Tài khoản không khả dụng")
		return
	}
	items, err := achievements(r.Context(), tx, user)
	if err != nil {
		platformError(w)
		return
	}
	for _, item := range items {
		if item.Key != chi.URLParam(r, "key") {
			continue
		}
		if item.Claimed {
			utils.ErrorResponse(w, 409, "Phần thưởng đã nhận")
			return
		}
		if item.Progress < item.Target {
			utils.ErrorResponse(w, 400, "Chưa đạt điều kiện nhận thưởng")
			return
		}
		if _, err = tx.Exec(r.Context(), `INSERT INTO achievement_claims(user_id,achievement_key,period,reward_exp)VALUES($1,$2,$3,$4)`, user, item.Key, item.Period, item.Reward); err != nil {
			platformError(w)
			return
		}
		realm, _, _, _, _, _ := domain.CalculateCultivationRealm(exp + item.Reward)
		if _, err = tx.Exec(r.Context(), `UPDATE users SET cultivation_exp=COALESCE(cultivation_exp,0)+$2,cultivation_realm=$3,updated_at=CURRENT_TIMESTAMP WHERE id=$1`, user, item.Reward, realm); err != nil {
			platformError(w)
			return
		}
		if tx.Commit(r.Context()) != nil {
			platformError(w)
			return
		}
		utils.JSON(w, 200, map[string]int64{"reward_exp": item.Reward})
		return
	}
	utils.ErrorResponse(w, 404, "Không tìm thấy thành tựu")
}
