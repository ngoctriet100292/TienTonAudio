package domain

// CultivationRealmInfo chứa thông tin chi tiết từng cảnh giới
type CultivationRealmInfo struct {
	Level       int    `json:"level"`
	Name        string `json:"name"`
	MinExp      int64  `json:"min_exp"`
	MaxExp      int64  `json:"max_exp"` // -1 cho cảnh giới tối cao
	Description string `json:"description"`
	Color       string `json:"color"`
}

// CultivationRealms - 17 Cảnh Giới Tu Tiên chính thống của Tiên Tôn Audio
var CultivationRealms = []CultivationRealmInfo{
	{Level: 1, Name: "Luyện Khí", MinExp: 0, MaxExp: 60, Description: "Sơ nhập tiên đạo, cảm ứng thiên địa linh khí", Color: "#94A3B8"},
	{Level: 2, Name: "Trúc Cơ", MinExp: 60, MaxExp: 300, Description: "Đúc thành tiên cơ, linh lực ngưng tụ hóa dịch", Color: "#38BDF8"},
	{Level: 3, Name: "Nguyên Anh", MinExp: 300, MaxExp: 1000, Description: "Ngưng kết anh nhi, thần thức ngự không xuất khiếu", Color: "#4ADE80"},
	{Level: 4, Name: "Hoá Thần", MinExp: 1000, MaxExp: 3000, Description: "Thần niệm thông thiên, sơ bộ chưởng khống thiên địa quy tắc", Color: "#A78BFA"},
	{Level: 5, Name: "Luyện Hư", MinExp: 3000, MaxExp: 7000, Description: "Hóa hư vi thực, vạn pháp bất xâm, xuyên toa hư không", Color: "#F472B6"},
	{Level: 6, Name: "Hợp Đạo", MinExp: 7000, MaxExp: 15000, Description: "Thiên nhân hợp nhất, đạo tâm viên mãn dung hợp đại đạo", Color: "#FB923C"},
	{Level: 7, Name: "Đại Thừa", MinExp: 15000, MaxExp: 30000, Description: "Đỉnh phong phàm giới, chờ đợi thiên kiếp phi thăng", Color: "#FBBF24"},
	{Level: 8, Name: "Nhân Tiên", MinExp: 30000, MaxExp: 55000, Description: "Phi thăng Tiên Giới, thoát thai hoán cốt thành tiên", Color: "#2DD4BF"},
	{Level: 9, Name: "Địa Tiên", MinExp: 55000, MaxExp: 90000, Description: "Lĩnh ngộ tiên tắc đại địa, thọ cùng trời đất", Color: "#34D399"},
	{Level: 10, Name: "Thiên Tiên", MinExp: 90000, MaxExp: 140000, Description: "Ngự khí cửu thiên, tiên linh quán đỉnh vạn pháp câu thông", Color: "#60A5FA"},
	{Level: 11, Name: "Kim Tiên", MinExp: 140000, MaxExp: 210000, Description: "Bất hủ kim thân, trải qua vạn kiếp mà linh hồn bất diệt", Color: "#F59E0B"},
	{Level: 12, Name: "Thái Ất Kim Tiên", MinExp: 210000, MaxExp: 300000, Description: "Tam hoa tụ đỉnh, ngũ khí triều nguyên, chạm đến bản nguyên", Color: "#EC4899"},
	{Level: 13, Name: "Đại La Kim Tiên", MinExp: 300000, MaxExp: 450000, Description: "Siêu thoát sinh tử luân hồi, chư thiên vạn giới cúi đầu", Color: "#8B5CF6"},
	{Level: 14, Name: "Tiên Quân", MinExp: 450000, MaxExp: 700000, Description: "Thống ngự một phương tiên vực, vạn tiên phục tùng", Color: "#EF4444"},
	{Level: 15, Name: "Tiên Vương", MinExp: 700000, MaxExp: 1200000, Description: "Tiên giới bá chủ một cõi, hiệu lệnh cửu thiên thập địa", Color: "#D97706"},
	{Level: 16, Name: "Tiên Tôn", MinExp: 1200000, MaxExp: 2000000, Description: "Tiên Tôn chí cao vô thượng, tung hoành vũ trụ tinh không", Color: "#FFD166"},
	{Level: 17, Name: "Tiên Đế", MinExp: 2000000, MaxExp: -1, Description: "Chúa tể vạn giới luân hồi, duy ngã độc tôn vĩnh hằng", Color: "#FFB703"},
}

// CalculateCultivationRealm tính toán cảnh giới từ điểm tu vi (EXP)
func CalculateCultivationRealm(exp int64) (name string, level int, nextExp int64, progressPct float64, color string, desc string) {
	if exp < 0 {
		exp = 0
	}
	for _, r := range CultivationRealms {
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
	last := CultivationRealms[len(CultivationRealms)-1]
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
