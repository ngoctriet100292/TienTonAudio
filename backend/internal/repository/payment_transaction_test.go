package repository

import (
	"context"
	"errors"
	"reflect"
	"strings"
	"testing"
	"time"

	db "github.com/IREAKING/tientonaudio/backend/db/sqlc"
	"github.com/IREAKING/tientonaudio/backend/internal/domain"
	"github.com/IREAKING/tientonaudio/backend/pkg/utils"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgtype"
)

type transactionFixture struct {
	pgx.Tx
	payment                         db.Payment
	reused                          bool
	failQuery                       string
	committed, rolledBack           bool
	subscriptions, updates, rewards int
	expiry                          pgtype.Timestamptz
}

func (f *transactionFixture) Commit(context.Context) error { f.committed = true; return nil }
func (f *transactionFixture) Rollback(context.Context) error {
	if !f.committed {
		f.rolledBack = true
	}
	return nil
}
func (f *transactionFixture) Exec(context.Context, string, ...any) (pgconn.CommandTag, error) {
	return pgconn.NewCommandTag("SELECT 1"), nil
}
func (f *transactionFixture) QueryRow(ctx context.Context, sql string, args ...any) pgx.Row {
	if f.failQuery != "" && strings.Contains(sql, f.failQuery) {
		return fixtureRow{err: errors.New("injected database failure")}
	}
	switch {
	case strings.Contains(sql, "SELECT id FROM payments"):
		return fixtureRow{values: []any{f.payment.ID}}
	case strings.Contains(sql, "GetPaymentByID"):
		return fixtureRow{values: structFields(f.payment)}
	case strings.Contains(sql, "SELECT EXISTS"):
		return fixtureRow{values: []any{f.reused}}
	case strings.Contains(sql, "GetSubscriptionPlanByID"):
		return fixtureRow{values: structFields(db.SubscriptionPlan{ID: 1, Name: "VIP", DurationDays: 30})}
	case strings.Contains(sql, "MAX(expires_at)"):
		return fixtureRow{values: []any{pgtype.Timestamptz{Time: time.Now().AddDate(0, 0, 10), Valid: true}}}
	case strings.Contains(sql, "ActivateSubscription"):
		f.subscriptions++
		f.expiry = args[2].(pgtype.Timestamptz)
		return fixtureRow{values: structFields(db.Subscription{})}
	case strings.Contains(sql, "GetUserCultivation"):
		return fixtureRow{values: structFields(db.GetUserCultivationRow{})}
	case strings.Contains(sql, "AddUserCultivationExp"):
		f.rewards++
		return fixtureRow{values: structFields(db.AddUserCultivationExpRow{})}
	case strings.Contains(sql, "CreateNotification"):
		return fixtureRow{values: structFields(db.Notification{})}
	case strings.Contains(sql, "UpdatePaymentStatus"):
		f.updates++
		return fixtureRow{values: structFields(f.payment)}
	default:
		return fixtureRow{err: errors.New("unexpected query: " + sql)}
	}
}

type fixtureRow struct {
	values []any
	err    error
}

func (r fixtureRow) Scan(dest ...any) error {
	if r.err != nil {
		return r.err
	}
	if len(dest) != len(r.values) {
		return errors.New("unexpected scan width")
	}
	for i, v := range r.values {
		reflect.ValueOf(dest[i]).Elem().Set(reflect.ValueOf(v))
	}
	return nil
}
func structFields(v any) []any {
	r := reflect.ValueOf(v)
	fields := make([]any, r.NumField())
	for i := range fields {
		fields[i] = r.Field(i).Interface()
	}
	return fields
}
func pendingPayment() db.Payment {
	status := "pending"
	plan := int32(1)
	return db.Payment{ID: uuid.New(), UserID: uuid.New(), PlanID: &plan, Amount: utils.Float64ToNumeric(99000), Provider: "vietqr", Status: &status}
}

func TestPaymentWebhookAtomicCompletionAndRollback(t *testing.T) {
	for _, fail := range []string{"", "ActivateSubscription", "AddUserCultivationExp", "CreateNotification", "UpdatePaymentStatus"} {
		t.Run(fail, func(t *testing.T) {
			f := &transactionFixture{payment: pendingPayment(), failQuery: fail}
			req := domain.WebhookCallbackReq{PaymentID: f.payment.ID, TransactionID: "bank-tx-1", Status: "completed", Amount: 99000}
			err := processPaymentWebhook(context.Background(), req, f)
			if fail != "" {
				if err == nil || f.committed || !f.rolledBack {
					t.Fatal("database failure was not rolled back")
				}
			} else {
				if err != nil || !f.committed || f.subscriptions != 1 || f.updates != 1 || f.rewards != 1 {
					t.Fatalf("incomplete payment commit: %v", err)
				}
				if f.expiry.Time.Before(time.Now().AddDate(0, 0, 39)) {
					t.Fatal("renewal discarded remaining subscription days")
				}
			}
		})
	}
}

func TestPaymentWebhookRejectsUnderpaymentAndReusedTransaction(t *testing.T) {
	for _, reused := range []bool{false, true} {
		f := &transactionFixture{payment: pendingPayment(), reused: reused}
		amount := int64(1)
		if reused {
			amount = 99000
		}
		err := processPaymentWebhook(context.Background(), domain.WebhookCallbackReq{PaymentID: f.payment.ID, TransactionID: "bank-tx-1", Status: "completed", Amount: amount}, f)
		if err == nil || f.committed || f.subscriptions != 0 || f.updates != 0 {
			t.Fatal("invalid payment event changed entitlements")
		}
	}
}

func TestCompletedWebhookIsIdempotent(t *testing.T) {
	f := &transactionFixture{payment: pendingPayment()}
	status, txID := "completed", "bank-tx-1"
	f.payment.Status, f.payment.TransactionID = &status, &txID
	err := processPaymentWebhook(context.Background(), domain.WebhookCallbackReq{PaymentID: f.payment.ID, TransactionID: txID, Status: status, Amount: 99000}, f)
	if err != nil || !f.committed || f.subscriptions != 0 || f.rewards != 0 || f.updates != 0 {
		t.Fatalf("duplicate completion was reapplied: %v", err)
	}
}
