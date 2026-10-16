package repository

import (
	"context"
	"errors"
	"strings"
	"testing"
	"time"

	"github.com/IREAKING/tientonaudio/backend/internal/domain"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgtype"
)

type listeningFixture struct {
	pgx.Tx
	story                            uuid.UUID
	duration                         int32
	premium, vip                     bool
	position                         int32
	exp                              int64
	last                             pgtype.Timestamptz
	now                              time.Time
	progress, rewards                int
	completed, committed, rolledBack bool
	fail                             string
}

func (f *listeningFixture) QueryRow(_ context.Context, query string, _ ...any) pgx.Row {
	if f.fail != "" && strings.Contains(query, f.fail) {
		return fixtureRow{err: errors.New("database failure")}
	}
	switch {
	case strings.Contains(query, "FROM chapters"):
		return fixtureRow{values: []any{f.story, f.duration, f.premium}}
	case strings.Contains(query, "FOR UPDATE"):
		return fixtureRow{values: []any{f.exp, f.last, f.now}}
	case strings.Contains(query, "FROM subscriptions"):
		return fixtureRow{values: []any{f.vip}}
	case strings.Contains(query, "FROM listening_history"):
		return fixtureRow{values: []any{f.position}}
	default:
		return fixtureRow{err: errors.New("unexpected query")}
	}
}
func (f *listeningFixture) Exec(_ context.Context, query string, args ...any) (pgconn.CommandTag, error) {
	if f.fail != "" && strings.Contains(query, f.fail) {
		return pgconn.CommandTag{}, errors.New("database failure")
	}
	if strings.Contains(query, "UpsertListeningProgress") {
		f.progress++
		f.position = args[3].(int32)
		f.completed = *args[5].(*bool)
	}
	if strings.Contains(query, "UPDATE users") {
		gain := args[1].(int64)
		f.exp += gain
		if gain > 0 {
			f.rewards++
		}
		f.last = pgtype.Timestamptz{Time: args[3].(time.Time), Valid: true}
	}
	return pgconn.NewCommandTag("UPDATE 1"), nil
}
func (f *listeningFixture) Commit(context.Context) error { f.committed = true; return nil }
func (f *listeningFixture) Rollback(context.Context) error {
	if !f.committed {
		f.rolledBack = true
	}
	return nil
}

func TestListeningRewardsAreBoundedByServerTime(t *testing.T) {
	for _, vip := range []bool{false, true} {
		f := &listeningFixture{story: uuid.New(), duration: 600, now: time.Now(), vip: vip}
		req := domain.ListeningProgressReq{ChapterID: uuid.New(), StoryID: f.story, LastPositionSeconds: 10}
		user := uuid.New()
		if err := saveListeningProgressTransaction(context.Background(), f, user, req); err != nil {
			t.Fatal(err)
		}
		if f.exp != 0 {
			t.Fatal("first progress event must only start the reward clock")
		}
		for i := 0; i < 20; i++ {
			f.now = f.now.Add(time.Second)
			req.LastPositionSeconds++
			if err := saveListeningProgressTransaction(context.Background(), f, user, req); err != nil {
				t.Fatal(err)
			}
		}
		if f.exp != 0 {
			t.Fatal("rapid progress calls awarded tu vi")
		}
		f.now = f.now.Add(5 * time.Minute)
		req.LastPositionSeconds = 600
		req.IsCompleted = true
		if err := saveListeningProgressTransaction(context.Background(), f, user, req); err != nil {
			t.Fatal(err)
		}
		want := int64(5)
		if vip {
			want = 10
		}
		if f.exp != want || !f.completed {
			t.Fatalf("got exp=%d completed=%v", f.exp, f.completed)
		}
		f.now = f.now.Add(10 * time.Minute)
		if err := saveListeningProgressTransaction(context.Background(), f, user, req); err != nil {
			t.Fatal(err)
		}
		if f.exp != want || f.rewards != 1 {
			t.Fatal("replayed completion awarded tu vi")
		}
	}
}

func TestListeningRejectsInvalidProgressAndRollsBack(t *testing.T) {
	for _, scenario := range []string{"wrong-story", "negative-position", "past-duration", "premium", "write-failure", "reward-failure"} {
		t.Run(scenario, func(t *testing.T) {
			f := &listeningFixture{story: uuid.New(), duration: 100, now: time.Now(), last: pgtype.Timestamptz{Time: time.Now().Add(-10 * time.Minute), Valid: true}}
			req := domain.ListeningProgressReq{ChapterID: uuid.New(), StoryID: f.story, LastPositionSeconds: 50}
			switch scenario {
			case "wrong-story":
				req.StoryID = uuid.New()
			case "negative-position":
				req.LastPositionSeconds = -1
			case "past-duration":
				req.LastPositionSeconds = 101
			case "premium":
				f.premium = true
			case "write-failure":
				f.fail = "UpsertListeningProgress"
			case "reward-failure":
				f.fail = "UPDATE users"
			}
			if err := saveListeningProgressTransaction(context.Background(), f, uuid.New(), req); err == nil {
				t.Fatal("invalid progress accepted")
			}
			if f.committed || !f.rolledBack {
				t.Fatal("failed transaction did not roll back")
			}
		})
	}
}

func TestListeningDoesNotCompleteEarly(t *testing.T) {
	f := &listeningFixture{story: uuid.New(), duration: 100, now: time.Now()}
	req := domain.ListeningProgressReq{ChapterID: uuid.New(), LastPositionSeconds: 1, IsCompleted: true}
	if err := saveListeningProgressTransaction(context.Background(), f, uuid.New(), req); err != nil {
		t.Fatal(err)
	}
	if f.completed {
		t.Fatal("chapter marked completed near its beginning")
	}
}
