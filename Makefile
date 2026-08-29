.PHONY: help run-backend run-mobile test-backend test-mobile build-backend docker-up docker-down migrate

help:
	@echo "=============================================="
	@echo "   TienTonAudio — Monorepo Architecture"
	@echo "=============================================="
	@echo ""
	@echo " Backend (Go):"
	@echo "   make run-backend     Chạy Go server (cổng 8080)"
	@echo "   make migrate         Chạy Auto-Migration tạo bảng Supabase/Postgres"
	@echo "   make build-backend   Biên dịch binary (bin/tientonaudio)"
	@echo "   make test-backend    Chạy unit tests Backend"
	@echo ""
	@echo " Mobile (Flutter):"
	@echo "   make run-mobile      Khởi chạy ứng dụng Flutter trên máy ảo/máy thật"
	@echo "   make test-mobile     Chạy unit tests Flutter"
	@echo ""
	@echo " Hạ tầng (Docker):"
	@echo "   make docker-up       Khởi động PostgreSQL & Redis container"
	@echo "   make docker-down     Dừng containers"
	@echo ""

run-backend:
	@$(MAKE) -C backend run

migrate:
	@$(MAKE) -C backend migrate

build-backend:
	@$(MAKE) -C backend build

test-backend:
	@$(MAKE) -C backend test

run-mobile:
	@cd mobile && flutter run

test-mobile:
	@cd mobile && flutter test

docker-up:
	@docker compose up -d

docker-down:
	@docker compose down
