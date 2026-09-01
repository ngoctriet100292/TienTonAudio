package utils

import (
	"regexp"
	"strconv"
	"strings"

	"github.com/IREAKING/tientonaudio/backend/internal/domain"
)

// Regex matches patterns like "01:23:45", "1:23:45", "23:45", "0:45"
var timeRegex = regexp.MustCompile(`(?:(?:(\d{1,2}):)?(\d{1,2}):(\d{2}))`)

// ParseYouTubeTimestamps phân tích văn bản mốc thời gian dạng YouTube thành danh sách TimelineMarker
// Hỗ trợ:
// "00:00 Mở đầu"
// "15:30 Bí cảnh kỳ ngộ"
// "01:15:20 Đột phá Luyện Khí"
// "Chương 4: Đại chiến (03:40:00)"
func ParseYouTubeTimestamps(raw string) []domain.TimelineMarker {
	lines := strings.Split(raw, "\n")
	var markers []domain.TimelineMarker

	for _, line := range lines {
		line = strings.TrimSpace(line)
		if line == "" {
			continue
		}

		match := timeRegex.FindStringSubmatch(line)
		if len(match) < 4 {
			continue
		}

		// match[0]: full time string, e.g. "01:15:20" or "15:20"
		// match[1]: hours (optional)
		// match[2]: minutes
		// match[3]: seconds

		var hours, minutes, seconds int

		if match[1] != "" {
			hours, _ = strconv.Atoi(match[1])
		}
		minutes, _ = strconv.Atoi(match[2])
		seconds, _ = strconv.Atoi(match[3])

		totalSeconds := int32(hours*3600 + minutes*60 + seconds)

		// Lấy tiêu đề bằng cách bỏ chuỗi thời gian và các ký tự ngăn cách như "-", ":", "—"
		title := strings.Replace(line, match[0], "", 1)
		title = strings.Trim(title, " ()[]-–—:.")
		if title == "" {
			title = "Phân đoạn " + match[0]
		}

		markers = append(markers, domain.TimelineMarker{
			Title:        title,
			StartSeconds: totalSeconds,
		})
	}

	return markers
}
