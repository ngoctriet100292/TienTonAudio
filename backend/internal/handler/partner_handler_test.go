package handler

import (
	"context"
	"errors"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	db "github.com/IREAKING/tientonaudio/backend/db/sqlc"
	"github.com/IREAKING/tientonaudio/backend/pkg/auth"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
)

type partnerFixture struct {
	db.DBTX
	role string
	err  error
}
type partnerRow struct {
	role string
	err  error
}

func (f *partnerFixture) QueryRow(_ context.Context, query string, _ ...any) pgx.Row {
	if strings.Contains(query, "UPDATE users") {
		role := f.role
		if role == "user" {
			role = "partner"
		}
		return partnerRow{role: role, err: f.err}
	}
	return partnerRow{err: f.err}
}
func (r partnerRow) Scan(dest ...any) error {
	if r.err != nil {
		return r.err
	}
	if len(dest) == 1 {
		*dest[0].(*string) = r.role
	} else {
		for _, value := range dest {
			*value.(*int64) = 1
		}
	}
	return nil
}
func TestBecomePartnerPreservesExistingRoles(t *testing.T) {
	for _, role := range []string{"user", "partner", "creator", "narrator", "admin"} {
		h := NewPartnerHandler(&partnerFixture{role: role}, nil, nil, nil)
		r := httptest.NewRequest(http.MethodPost, "/become-partner", nil)
		r = r.WithContext(auth.SetClaimsToContext(r.Context(), &auth.AccessTokenClaims{UserID: uuid.New(), Role: role}))
		w := httptest.NewRecorder()
		h.BecomePartner(w, r)
		want := role
		if role == "user" {
			want = "partner"
		}
		if w.Code != 200 || !strings.Contains(w.Body.String(), `"role":"`+want+`"`) {
			t.Fatalf("role %s: %d %s", role, w.Code, w.Body.String())
		}
	}
}
func TestPartnerStatsDoesNotHideDatabaseFailure(t *testing.T) {
	h := NewPartnerHandler(&partnerFixture{err: errors.New("private database error")}, nil, nil, nil)
	r := httptest.NewRequest(http.MethodGet, "/stats", nil)
	r = r.WithContext(auth.SetClaimsToContext(r.Context(), &auth.AccessTokenClaims{UserID: uuid.New(), Role: "partner"}))
	w := httptest.NewRecorder()
	h.GetPartnerStats(w, r)
	if w.Code != 500 || strings.Contains(w.Body.String(), "private database error") {
		t.Fatalf("unexpected response: %d %s", w.Code, w.Body.String())
	}
}
