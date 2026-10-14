BINARY_NAME=tientonaudio
SERVER_ADDRESS=0.0.0.0:8080

# Load environment variables if app.env exists
ifneq (,$(wildcard ./app.env))
    include app.env
    export
endif

.PHONY: all build run server test clean sqlc swag migrate-up migrate-down migrate-create docker-up docker-down tidy lint help

all: build

## Build
build:
	@echo "==> Building binary..."
	@go build -ldflags="-s -w" -o bin/$(BINARY_NAME) ./cmd/server/...
	@echo "==> Binary built at bin/$(BINARY_NAME)"

## Run server
run server:
	@echo "==> Starting server..."
	@go run ./cmd/server/...

## Tests
test:
	@echo "==> Running tests..."
	@go test -v -race -cover ./...

test-unit:
	@go test -v -race -cover ./internal/...

## Clean build artifacts
clean:
	@rm -rf bin/
	@echo "==> Cleaned"

## sqlc code generation
sqlc:
	@echo "==> Generating sqlc code..."
	@sqlc generate
	@echo "==> sqlc generation done"

## Swagger docs
swag:
	@echo "==> Generating Swagger docs..."
	@swag init -g cmd/server/main.go -o docs/
	@echo "==> Swagger docs generated"

## Database migrations
migrate:
	@echo "==> Running Go Auto-Migration..."
	@go run ./cmd/migrate/main.go

upload-r2:
	@echo "==> Running Cloudflare R2 Upload Tool..."
	@go run ./cmd/upload_to_r2/main.go -mode=all

migrate-up:
	@echo "==> Running migrations UP..."
	@migrate -path db/migrations -database "$(DATABASE_URL)" -verbose up

migrate-down:
	@echo "==> Running migrations DOWN..."
	@migrate -path db/migrations -database "$(DATABASE_URL)" -verbose down 1

migrate-create:
	@if [ -z "$(name)" ]; then echo "Usage: make migrate-create name=<migration_name>"; exit 1; fi
	@migrate create -ext sql -dir db/migrations -seq $(name)
	@echo "==> Migration files created"

migrate-drop:
	@echo "==> Dropping all migrations..."
	@migrate -path db/migrations -database "$(DATABASE_URL)" drop -f

## Docker
docker-up:
	@echo "==> Starting Docker services..."
	@docker compose up -d
	@echo "==> Services started. Waiting for health checks..."
	@sleep 3

docker-down:
	@echo "==> Stopping Docker services..."
	@docker compose down

docker-clean:
	@docker compose down -v --remove-orphans

docker-build:
	@docker build -t $(BINARY_NAME):latest .

docker-logs:
	@docker compose logs -f

## Dev setup
setup: docker-up
	@echo "==> Waiting for Postgres..."
	@sleep 5
	@$(MAKE) migrate-up
	@echo "==> Dev environment ready!"

## Lint
lint:
	@golangci-lint run ./...

## Go mod tidy
tidy:
	@go mod tidy
	@echo "==> go.mod tidied"

## Install tools
install-tools:
	@echo "==> Installing tools..."
	@go install github.com/sqlc-dev/sqlc/cmd/sqlc@latest
	@go install -tags 'postgres' github.com/golang-migrate/migrate/v4/cmd/migrate@latest
	@go install github.com/swaggo/swag/cmd/swag@latest
	@echo "==> Tools installed"

## Help
help:
	@echo ""
	@echo "TienTon Audio — Available targets:"
	@echo ""
	@echo "  build            Build the binary"
	@echo "  run / server     Run the server locally"
	@echo "  test             Run all tests"
	@echo "  clean            Remove build artifacts"
	@echo ""
	@echo "  sqlc             Generate sqlc code from queries"
	@echo "  swag             Generate Swagger API docs"
	@echo ""
	@echo "  migrate-up       Run all pending migrations"
	@echo "  migrate-down     Rollback last migration"
	@echo "  migrate-create   Create new migration (name=<name>)"
	@echo ""
	@echo "  docker-up        Start Docker services (Postgres, Redis)"
	@echo "  docker-down      Stop Docker services"
	@echo "  docker-clean     Stop and remove volumes"
	@echo ""
	@echo "  setup            Full dev setup (docker + migrate)"
	@echo "  tidy             Run go mod tidy"
	@echo "  lint             Run golangci-lint"
	@echo "  install-tools    Install CLI tools (sqlc, migrate, swag)"
	@echo ""
