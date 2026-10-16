package email

import (
	"bufio"
	"fmt"
	"net"
	"strings"
	"testing"
	"time"
)

func TestSMTPVerificationLinksAndUnavailableDelivery(t *testing.T) {
	if NewEmailService(Config{}).SendVerificationEmail("user@example.com", "user", "secret-token") == nil {
		t.Fatal("unconfigured SMTP reported success")
	}
	listener, err := net.Listen("tcp", "127.0.0.1:0")
	if err != nil {
		t.Fatal(err)
	}
	defer listener.Close()
	captured := make(chan string, 1)
	go func() {
		conn, err := listener.Accept()
		if err != nil {
			return
		}
		defer conn.Close()
		_ = conn.SetDeadline(time.Now().Add(5 * time.Second))
		_, _ = fmt.Fprint(conn, "220 local SMTP test\r\n")
		reader := bufio.NewReader(conn)
		for {
			line, err := reader.ReadString('\n')
			if err != nil {
				return
			}
			switch {
			case strings.HasPrefix(line, "EHLO"):
				_, _ = fmt.Fprint(conn, "250-localhost\r\n250 OK\r\n")
			case strings.HasPrefix(line, "HELO"):
				_, _ = fmt.Fprint(conn, "250 OK\r\n")
			case strings.HasPrefix(line, "DATA"):
				_, _ = fmt.Fprint(conn, "354 Send data\r\n")
				var msg strings.Builder
				for {
					line, err = reader.ReadString('\n')
					if err != nil {
						return
					}
					if line == ".\r\n" {
						break
					}
					msg.WriteString(line)
				}
				captured <- msg.String()
				_, _ = fmt.Fprint(conn, "250 queued\r\n")
			case strings.HasPrefix(line, "QUIT"):
				_, _ = fmt.Fprint(conn, "221 bye\r\n")
				return
			default:
				_, _ = fmt.Fprint(conn, "250 OK\r\n")
			}
		}
	}()
	cfg := Config{Host: "127.0.0.1", Port: listener.Addr().(*net.TCPAddr).Port, FromEmail: "noreply@example.com", AppBaseURL: "http://localhost:3000"}
	if err = NewEmailService(cfg).SendVerificationEmail("user@example.com", "Đạo hữu", "secret-token"); err != nil {
		t.Fatal(err)
	}
	select {
	case message := <-captured:
		if !strings.Contains(message, "http://localhost:3000/verify-email?token=secret-token") || strings.Contains(message, "/api/v1/auth/verify-email") {
			t.Fatal("verification link did not point to web")
		}
	case <-time.After(time.Second):
		t.Fatal("no mail captured")
	}
	if NewEmailService(cfg).SendVerificationEmail("user@example.com\r\nBcc: victim@example.com", "user", "token") == nil {
		t.Fatal("mail header injection accepted")
	}
}
