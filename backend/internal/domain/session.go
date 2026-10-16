package domain

import "errors"

var ErrInvalidSession = errors.New("Phiên đăng nhập đã hết hạn; vui lòng đăng nhập lại")
