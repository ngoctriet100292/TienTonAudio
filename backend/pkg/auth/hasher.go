// ============================================================================
// AUTH - PASSWORD HASHER
// ============================================================================
// Sử dụng bcrypt cost 12 (cân bằng giữa bảo mật và performance)
// Thời gian hash trung bình: 250-300ms — chấp nhận được cho login/register
// ============================================================================

package auth

import (
	"fmt"

	"golang.org/x/crypto/bcrypt"
)

const (
	// BcryptCost — cost factor cho bcrypt
	//   10: ~100ms   (tối thiểu)
	//   12: ~300ms   (khuyến nghị cho production)
	//   14: ~1.2s    (quá chậm cho UX)
	BcryptCost = 12
)

// HashPassword băm password với bcrypt
// Trả về chuỗi dạng $2a$12$...
func HashPassword(password string) (*string, error) {
	if len(password) < 8 {
		return nil, fmt.Errorf("password must be at least 8 characters")
	}
	if len(password) > 128 {
		return nil, fmt.Errorf("password must be at most 128 characters")
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(password), BcryptCost)
	if err != nil {
		return nil, fmt.Errorf("hash password: %w", err)
	}

	hashStr := string(hash)
	return &hashStr, nil
}

// VerifyPassword kiểm tra password khớp với hash
func VerifyPassword(password string, hash *string) bool {
	if hash == nil {
		return false
	}
	err := bcrypt.CompareHashAndPassword([]byte(*hash), []byte(password))
	return err == nil
}

// NeedsRehash kiểm tra hash có cần nâng cấp cost không
// (hữu ích khi tăng BcryptCost trong tương lai)
func NeedsRehash(hash *string) bool {
	if hash == nil {
		return true
	}
	cost, err := bcrypt.Cost([]byte(*hash))
	if err != nil {
		return true
	}
	return cost < BcryptCost
}