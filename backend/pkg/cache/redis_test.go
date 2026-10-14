package cache_test

import (
	"context"
	"testing"
	"time"

	"github.com/IREAKING/tientonaudio/backend/pkg/cache"
)

func TestMemoryCache(t *testing.T) {
	c := cache.NewMemoryCache()
	defer c.Close()

	ctx := context.Background()

	// Ping test
	if err := c.Ping(ctx); err != nil {
		t.Fatalf("expected ping to succeed, got %v", err)
	}

	// Set & Get test
	err := c.Set(ctx, "test_key", "test_val", 1*time.Minute)
	if err != nil {
		t.Fatalf("unexpected set error: %v", err)
	}

	val, err := c.Get(ctx, "test_key")
	if err != nil {
		t.Fatalf("unexpected get error: %v", err)
	}
	if val != "test_val" {
		t.Fatalf("expected 'test_val', got '%s'", val)
	}

	// Expiration test
	err = c.Set(ctx, "exp_key", "exp_val", 20*time.Millisecond)
	if err != nil {
		t.Fatalf("unexpected set error: %v", err)
	}
	time.Sleep(50 * time.Millisecond)

	val, err = c.Get(ctx, "exp_key")
	if err != nil {
		t.Fatalf("unexpected get error: %v", err)
	}
	if val != "" {
		t.Fatalf("expected key to have expired (empty value), got %q", val)
	}

	// Delete test
	err = c.Set(ctx, "del_key", "del_val", 1*time.Minute)
	if err != nil {
		t.Fatalf("unexpected set error: %v", err)
	}
	if err := c.Delete(ctx, "del_key"); err != nil {
		t.Fatalf("unexpected delete error: %v", err)
	}
	val, err = c.Get(ctx, "del_key")
	if err != nil {
		t.Fatalf("unexpected get error: %v", err)
	}
	if val != "" {
		t.Fatalf("expected key to be deleted (empty value), got %q", val)
	}
}
