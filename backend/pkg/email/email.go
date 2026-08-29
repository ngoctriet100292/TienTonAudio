package email

import (
	"fmt"
	"log/slog"
	"net/smtp"
	"strings"
)

type Config struct {
	Host        string
	Port        int
	Username    string
	Password    string
	FromEmail   string
	AppBaseURL  string
}

type EmailService interface {
	SendVerificationEmail(toEmail, username, token string) error
	SendPasswordResetEmail(toEmail, username, token string) error
}

type emailService struct {
	cfg Config
}

func NewEmailService(cfg Config) EmailService {
	return &emailService{cfg: cfg}
}

func (s *emailService) SendVerificationEmail(toEmail, username, token string) error {
	baseURL := s.cfg.AppBaseURL
	if baseURL == "" {
		baseURL = "http://localhost:8080"
	}
	baseURL = strings.TrimRight(baseURL, "/")

	verifyURL := fmt.Sprintf("%s/api/v1/auth/verify-email?token=%s", baseURL, token)

	subject := "Xác thực tài khoản TienTonAudio"
	body := fmt.Sprintf(
		"Xin chào %s,\n\n"+
			"Cảm ơn bạn đã đăng ký tài khoản tại TienTonAudio.\n"+
			"Vui lòng truy cập đường dẫn sau hoặc gửi mã token để kích hoạt tài khoản của bạn:\n\n"+
			"Link xác thực: %s\n\n"+
			"Token xác thực: %s\n\n"+
			"Mã xác thực có hiệu lực trong 24 giờ.\n\n"+
			"Trân trọng,\nĐội ngũ TienTonAudio",
		username, verifyURL, token,
	)

	return s.sendMail(toEmail, subject, body, "Verification email", token, verifyURL)
}

func (s *emailService) SendPasswordResetEmail(toEmail, username, token string) error {
	baseURL := s.cfg.AppBaseURL
	if baseURL == "" {
		baseURL = "http://localhost:8080"
	}
	baseURL = strings.TrimRight(baseURL, "/")

	resetURL := fmt.Sprintf("%s/reset-password?token=%s", baseURL, token)

	subject := "Yêu cầu đặt lại mật khẩu TienTonAudio"
	body := fmt.Sprintf(
		"Xin chào %s,\n\n"+
			"Chúng tôi nhận được yêu cầu đặt lại mật khẩu cho tài khoản của bạn tại TienTonAudio.\n"+
			"Vui lòng sử dụng mã token dưới đây hoặc truy cập đường dẫn để thiết lập mật khẩu mới:\n\n"+
			"Link đặt lại mật khẩu: %s\n\n"+
			"Token đặt lại: %s\n\n"+
			"Mã token có hiệu lực trong 15 phút. Nếu bạn không yêu cầu, vui lòng bỏ qua email này.\n\n"+
			"Trân trọng,\nĐội ngũ TienTonAudio",
		username, resetURL, token,
	)

	return s.sendMail(toEmail, subject, body, "Password reset email", token, resetURL)
}

func (s *emailService) sendMail(toEmail, subject, body, tag, token, actionURL string) error {
	// Nếu không cấu hình SMTP host, dùng mock logger (rất tiện lợi cho môi trường dev & test)
	if s.cfg.Host == "" || s.cfg.Port == 0 {
		slog.Info(fmt.Sprintf("📧 [EMAIL SERVICE - DEV MOCK] %s queued", tag),
			"to", toEmail,
			"action_url", actionURL,
			"token", token,
		)
		return nil
	}

	// Gửi qua SMTP
	from := s.cfg.FromEmail
	if from == "" {
		from = s.cfg.Username
	}

	msg := fmt.Sprintf("From: %s\r\nTo: %s\r\nSubject: %s\r\nContent-Type: text/plain; charset=UTF-8\r\n\r\n%s",
		from, toEmail, subject, body,
	)

	addr := fmt.Sprintf("%s:%d", s.cfg.Host, s.cfg.Port)
	var auth smtp.Auth
	if s.cfg.Username != "" && s.cfg.Password != "" {
		auth = smtp.PlainAuth("", s.cfg.Username, s.cfg.Password, s.cfg.Host)
	}

	if err := smtp.SendMail(addr, auth, from, []string{toEmail}, []byte(msg)); err != nil {
		slog.Error(fmt.Sprintf("failed to send %s via SMTP", tag), "to", toEmail, "error", err)
		return fmt.Errorf("send mail error: %w", err)
	}

	slog.Info(fmt.Sprintf("📧 %s sent successfully via SMTP", tag), "to", toEmail)
	return nil
}

