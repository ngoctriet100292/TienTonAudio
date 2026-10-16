package domain

import (
	_ "embed"
	"encoding/json"
	"fmt"
	"sync/atomic"
)

// CultivationRealmInfo chứa thông tin chi tiết từng cảnh giới
type CultivationRealmInfo struct {
	Tier        string `json:"tier"`
	TierName    string `json:"tier_name"`
	Ability     string `json:"ability"`
	Privilege   string `json:"privilege"`
	Level       int    `json:"level"`
	Name        string `json:"name"`
	MinExp      int64  `json:"min_exp"`
	MaxExp      int64  `json:"max_exp"` // -1 cho cảnh giới tối cao
	Description string `json:"description"`
	Color       string `json:"color"`
}

//go:embed cultivation_realms.json
var cultivationRealmData []byte

// The seed is used by unit tests. Production replaces it from PostgreSQL before serving.
var cultivationCatalogue atomic.Pointer[[]CultivationRealmInfo]

func init() { _ = SetCultivationRealms(loadCultivationRealms()) }

// GetCultivationRealms returns an independent snapshot safe for concurrent callers.
func GetCultivationRealms() []CultivationRealmInfo {
	return append([]CultivationRealmInfo(nil), (*cultivationCatalogue.Load())...)
}

func SetCultivationRealms(realms []CultivationRealmInfo) error {
	if err := ValidateCultivationRealms(realms); err != nil {
		return err
	}
	snapshot := append([]CultivationRealmInfo(nil), realms...)
	cultivationCatalogue.Store(&snapshot)
	return nil
}

func ValidateCultivationRealms(realms []CultivationRealmInfo) error {
	if len(realms) == 0 || realms[0].MinExp != 0 {
		return fmt.Errorf("cultivation must begin at zero EXP")
	}
	for i, realm := range realms {
		if realm.Name == "" || realm.Level != i+1 || (realm.Tier != "vo-dao" && realm.Tier != "tu-tien" && realm.Tier != "tien-gioi") || (i > 0 && realm.MinExp != realms[i-1].MaxExp) || (i < len(realms)-1 && realm.MaxExp <= realm.MinExp) || (i == len(realms)-1 && realm.MaxExp != -1) {
			return fmt.Errorf("invalid cultivation realm at level %d", realm.Level)
		}
	}
	return nil
}

func loadCultivationRealms() []CultivationRealmInfo {
	var realms []CultivationRealmInfo
	if err := json.Unmarshal(cultivationRealmData, &realms); err != nil {
		panic("invalid cultivation realm data: " + err.Error())
	}
	if err := ValidateCultivationRealms(realms); err != nil {
		panic(err)
	}
	return realms
}

// CalculateCultivationRealm tính toán cảnh giới từ điểm tu vi (EXP)
func CalculateCultivationRealm(exp int64) (name string, level int, nextExp int64, progressPct float64, color string, desc string) {
	if exp < 0 {
		exp = 0
	}
	realms := *cultivationCatalogue.Load()
	for _, r := range realms {
		if r.MaxExp == -1 || exp < r.MaxExp {
			progress := 100.0
			if r.MaxExp > r.MinExp {
				progress = float64(exp-r.MinExp) / float64(r.MaxExp-r.MinExp) * 100.0
				if progress > 100 {
					progress = 100
				}
				if progress < 0 {
					progress = 0
				}
			}
			return r.Name, r.Level, r.MaxExp, progress, r.Color, r.Description
		}
	}
	last := realms[len(realms)-1]
	return last.Name, last.Level, -1, 100.0, last.Color, last.Description
}

// UserCultivationResp phản hồi thông tin tu vi chi tiết của người dùng
type UserCultivationResp struct {
	CurrentRealm  string                 `json:"current_realm"`
	Level         int                    `json:"level"`
	CurrentExp    int64                  `json:"current_exp"`
	NextRealmExp  int64                  `json:"next_realm_exp"`
	ProgressPct   float64                `json:"progress_pct"`
	ExpMultiplier float64                `json:"exp_multiplier"`
	VipStatus     string                 `json:"vip_status"`
	Color         string                 `json:"color"`
	Description   string                 `json:"description"`
	AllRealms     []CultivationRealmInfo `json:"all_realms"`
}
