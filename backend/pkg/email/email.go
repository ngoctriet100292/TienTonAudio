package email

import (
	"crypto/tls"
	"fmt"
	"mime"
	"net"
	"net/mail"
	"net/smtp"
	"net/url"
	"strings"
	"time"
)

type Config struct {
	Host       string
	Port       int
	Username   string
	Password   string
	FromEmail  string
	AppBaseURL string
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
		baseURL = "http://localhost:3000"
	}
	baseURL = strings.TrimRight(baseURL, "/")

	verifyURL := fmt.Sprintf("%s/verify-email?token=%s", baseURL, url.QueryEscape(token))

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

	return s.sendMail(toEmail, subject, body)
}

func (s *emailService) SendPasswordResetEmail(toEmail, username, token string) error {
	baseURL := s.cfg.AppBaseURL
	if baseURL == "" {
		baseURL = "http://localhost:3000"
	}
	baseURL = strings.TrimRight(baseURL, "/")

	resetURL := fmt.Sprintf("%s/reset-password?token=%s", baseURL, url.QueryEscape(token))

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

	return s.sendMail(toEmail, subject, body)
}

func (s *emailService) sendMail(toEmail, subject, body string) error {
	if s.cfg.Host == "" || s.cfg.Port == 0 {
		return fmt.Errorf("SMTP is not configured")
	}
	from := s.cfg.FromEmail
	if from == "" {
		from = s.cfg.Username
	}
	for _, address := range []string{from, toEmail} {
		parsed, err := mail.ParseAddress(address)
		if err != nil || parsed.Address != address || strings.ContainsAny(address, "\r\n") {
			return fmt.Errorf("invalid mail address")
		}
	}
	client, err := s.connect()
	if err != nil {
		return err
	}
	defer client.Close()
	if err = client.Mail(from); err != nil {
		return fmt.Errorf("SMTP sender rejected")
	}
	if err = client.Rcpt(toEmail); err != nil {
		return fmt.Errorf("SMTP recipient rejected")
	}
	data, err := client.Data()
	if err != nil {
		return fmt.Errorf("SMTP data rejected")
	}
	msg := fmt.Sprintf("From: %s\r\nTo: %s\r\nSubject: %s\r\nMIME-Version: 1.0\r\nContent-Type: text/plain; charset=UTF-8\r\n\r\n%s", from, toEmail, mime.QEncoding.Encode("UTF-8", subject), body)
	if _, err = data.Write([]byte(msg)); err != nil {
		return fmt.Errorf("SMTP message failed")
	}
	if err = data.Close(); err != nil {
		return fmt.Errorf("SMTP message not accepted")
	}
	_ = client.Quit()
	return nil
}

func (s *emailService) connect() (*smtp.Client, error) {
	if s.cfg.Host == "" || s.cfg.Port == 0 {
		return nil, fmt.Errorf("SMTP is not configured")
	}
	addr := net.JoinHostPort(s.cfg.Host, fmt.Sprint(s.cfg.Port))
	dialer := &net.Dialer{Timeout: 10 * time.Second}
	var conn net.Conn
	var err error
	tlsConfig := &tls.Config{ServerName: s.cfg.Host, MinVersion: tls.VersionTLS12}
	if s.cfg.Port == 465 {
		conn, err = tls.DialWithDialer(dialer, "tcp", addr, tlsConfig)
	} else {
		conn, err = dialer.Dial("tcp", addr)
	}
	if err != nil {
		return nil, fmt.Errorf("SMTP connection failed")
	}
	_ = conn.SetDeadline(time.Now().Add(20 * time.Second))
	client, err := smtp.NewClient(conn, s.cfg.Host)
	if err != nil {
		conn.Close()
		return nil, fmt.Errorf("SMTP handshake failed")
	}
	if s.cfg.Port != 465 {
		if ok, _ := client.Extension("STARTTLS"); ok {
			if err = client.StartTLS(tlsConfig); err != nil {
				client.Close()
				return nil, fmt.Errorf("SMTP TLS failed")
			}
		} else if s.cfg.Host != "localhost" && net.ParseIP(s.cfg.Host) != nil && !net.ParseIP(s.cfg.Host).IsLoopback() {
			client.Close()
			return nil, fmt.Errorf("SMTP server requires TLS")
		} else if s.cfg.Host != "localhost" && net.ParseIP(s.cfg.Host) == nil {
			client.Close()
			return nil, fmt.Errorf("SMTP server requires TLS")
		}
	}
	if s.cfg.Username != "" {
		if s.cfg.Password == "" {
			client.Close()
			return nil, fmt.Errorf("SMTP password missing")
		}
		if err = client.Auth(smtp.PlainAuth("", s.cfg.Username, s.cfg.Password, s.cfg.Host)); err != nil {
			client.Close()
			return nil, fmt.Errorf("SMTP authentication failed")
		}
	}
	return client, nil
}

// CheckSMTP verifies transport and credentials without sending an email.
func CheckSMTP(cfg Config) error {
	client, err := (&emailService{cfg: cfg}).connect()
	if err != nil {
		return err
	}
	defer client.Close()
	if err = client.Noop(); err != nil {
		return fmt.Errorf("SMTP check failed")
	}
	_ = client.Quit()
	return nil
}
