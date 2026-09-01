package utils

import (
	"regexp"
	"strings"
	"unicode"

	"golang.org/x/text/runes"
	"golang.org/x/text/transform"
	"golang.org/x/text/unicode/norm"
)

var nonAlphanumericRegex = regexp.MustCompile(`[^a-z0-9]+`)

// ToSlug chuyển chuỗi có dấu tiếng Việt thành slug URL thân thiện
func ToSlug(s string) string {
	// Bỏ dấu tiếng Việt
	t := transform.Chain(norm.NFD, runes.Remove(runes.In(unicode.Mn)), norm.NFC)
	result, _, _ := transform.String(t, s)

	// Xử lý đ/Đ
	result = strings.ReplaceAll(result, "đ", "d")
	result = strings.ReplaceAll(result, "Đ", "d")

	// Lowercase
	result = strings.ToLower(result)

	// Thay thế ký tự không phải chữ/số thành dấu gạch nối
	result = nonAlphanumericRegex.ReplaceAllString(result, "-")

	// Bỏ dấu gạch nối ở đầu và cuối
	return strings.Trim(result, "-")
}
