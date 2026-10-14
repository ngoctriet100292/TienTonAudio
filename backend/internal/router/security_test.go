package router_test

import (
	"context"
	db "github.com/IREAKING/tientonaudio/backend/db/sqlc"
	"github.com/IREAKING/tientonaudio/backend/internal/repository"
	"github.com/IREAKING/tientonaudio/backend/internal/service"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/IREAKING/tientonaudio/backend/config"
	"github.com/IREAKING/tientonaudio/backend/internal/handler"
	"github.com/IREAKING/tientonaudio/backend/internal/router"
	"github.com/IREAKING/tientonaudio/backend/pkg/auth"
	"github.com/google/uuid"
)

func TestContentWritesRequireAdmin(t *testing.T) {
	jwt := auth.NewJWTService("security-test-secret-long-enough", "test", time.Hour, time.Hour)
	tokens, err := jwt.GenerateTokenPair(uuid.New(), "reader@example.com", false, []string{"user"}, nil)
	if err != nil {
		t.Fatal(err)
	}
	r := router.NewRouter(router.RouterOptions{Config: &config.Config{Environment: "test", RateLimitRequestsPerMinute: 1000}, JWTService: jwt})
	id := uuid.New().String()
	for _, route := range []struct{ method, path string }{{"POST", "/stories/"}, {"PUT", "/stories/" + id}, {"DELETE", "/stories/" + id}, {"POST", "/chapters/"}, {"POST", "/chapters/bulk"}, {"POST", "/chapters/" + id + "/audio"}} {
		for _, token := range []string{"", tokens.AccessToken} {
			req := httptest.NewRequest(route.method, "/api/v1"+route.path, nil)
			if token != "" {
				req.Header.Set("Authorization", "Bearer "+token)
			}
			rr := httptest.NewRecorder()
			r.ServeHTTP(rr, req)
			want := http.StatusUnauthorized
			if token != "" {
				want = http.StatusForbidden
			}
			if rr.Code != want {
				t.Errorf("%s %s: want %d, got %d", route.method, route.path, want, rr.Code)
			}
		}
	}
}

func TestSelfConfirmDisabledAndStatusProtected(t *testing.T) {
	r := router.NewRouter(router.RouterOptions{Config: &config.Config{Environment: "test", RateLimitRequestsPerMinute: 1000}, JWTService: auth.NewJWTService("test-secret", "test", time.Hour, time.Hour), PaymentHandler: handler.NewPaymentHandler(nil, "")})
	id := uuid.New().String()
	for _, route := range []struct {
		method, path string
		status       int
	}{{"POST", "/api/v1/payments/" + id + "/confirm-auto", http.StatusGone}, {"GET", "/api/v1/payments/" + id + "/status", http.StatusUnauthorized}} {
		rr := httptest.NewRecorder()
		r.ServeHTTP(rr, httptest.NewRequest(route.method, route.path, nil))
		if rr.Code != route.status {
			t.Fatalf("%s: want %d, got %d", route.path, route.status, rr.Code)
		}
	}
}

type privatePlaylistFixture struct {
	repository.PlaylistRepository
	owner uuid.UUID
}

func (f privatePlaylistFixture) GetPlaylistByID(ctx context.Context, id uuid.UUID) (db.Playlist, error) {
	private := false
	return db.Playlist{ID: id, UserID: uuid.NullUUID{UUID: f.owner, Valid: true}, Name: "Private", IsPublic: &private}, nil
}
func (f privatePlaylistFixture) GetPlaylistItemsWithDetails(ctx context.Context, id uuid.UUID) ([]db.GetPlaylistItemsWithDetailsRow, error) {
	return nil, nil
}

func TestPrivatePlaylistAcceptsOwnerTokenAndRejectsOthers(t *testing.T) {
	owner := uuid.New()
	jwt := auth.NewJWTService("playlist-test-secret", "test", time.Hour, time.Hour)
	svc := service.NewPlaylistService(privatePlaylistFixture{owner: owner})
	r := router.NewRouter(router.RouterOptions{Config: &config.Config{Environment: "test", RateLimitRequestsPerMinute: 1000}, JWTService: jwt, PlaylistHandler: handler.NewPlaylistHandler(svc)})
	for _, user := range []uuid.UUID{uuid.Nil, owner, uuid.New()} {
		req := httptest.NewRequest("GET", "/api/v1/playlists/"+uuid.New().String(), nil)
		if user != uuid.Nil {
			tokens, err := jwt.GenerateTokenPair(user, "reader@example.com", false, []string{"user"}, nil)
			if err != nil {
				t.Fatal(err)
			}
			req.Header.Set("Authorization", "Bearer "+tokens.AccessToken)
		}
		rr := httptest.NewRecorder()
		r.ServeHTTP(rr, req)
		want := http.StatusNotFound
		if user == owner {
			want = http.StatusOK
		}
		if rr.Code != want {
			t.Errorf("user %s: want %d,got %d", user, want, rr.Code)
		}
	}
}
