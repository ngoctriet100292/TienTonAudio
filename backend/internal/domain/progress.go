package domain

import "errors"

var (
	ErrInvalidListeningProgress = errors.New("tiến độ nghe không hợp lệ")
	ErrProgressChapterNotFound  = errors.New("không tìm thấy chương")
	ErrProgressPremiumRequired  = errors.New("chương này yêu cầu hội viên VIP")
)
