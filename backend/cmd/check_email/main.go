package main

import (
	"flag"
	"fmt"
	"github.com/IREAKING/tientonaudio/backend/config"
	"github.com/IREAKING/tientonaudio/backend/pkg/email"
	"os"
)

func main() {
	path := flag.String("config", "app.env", "Configuration file")
	flag.Parse()
	cfg, err := config.LoadConfig(*path)
	if err != nil {
		fmt.Fprintln(os.Stderr, "Invalid configuration")
		os.Exit(1)
	}
	err = email.CheckSMTP(email.Config{Host: cfg.SMTPHost, Port: cfg.SMTPPort, Username: cfg.SMTPUsername, Password: cfg.SMTPPassword})
	if err != nil {
		fmt.Fprintln(os.Stderr, err.Error())
		os.Exit(1)
	}
	fmt.Println("SMTP connection and authentication passed; no email was sent.")
}
