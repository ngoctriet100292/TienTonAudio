package cache

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"log/slog"
	"strconv"
	"sync"
	"time"

	"github.com/redis/go-redis/v9"
)

type CacheService interface {
	Increment(ctx context.Context, key string, ttl time.Duration) (int64, error)
	Set(ctx context.Context, key string, value any, ttl time.Duration) error
	Get(ctx context.Context, key string) (string, error)
	Delete(ctx context.Context, key string) error
	Ping(ctx context.Context) error
	Close() error
}

// ---- REDIS CACHE ----

type redisCache struct {
	client *redis.Client
}

// NewRedisCache kết nối tới Redis qua redisURL (vd: redis://localhost:6379/0)
func NewRedisCache(ctx context.Context, redisURL string) (CacheService, error) {
	opts, err := redis.ParseURL(redisURL)
	if err != nil {
		return nil, fmt.Errorf("invalid redis url: %w", err)
	}

	client := redis.NewClient(opts)
	pingCtx, cancel := context.WithTimeout(ctx, 3*time.Second)
	defer cancel()

	if err := client.Ping(pingCtx).Err(); err != nil {
		_ = client.Close()
		return nil, fmt.Errorf("redis ping failed: %w", err)
	}

	slog.Info("successfully connected to Redis cache", "addr", opts.Addr)
	return &redisCache{client: client}, nil
}

// NewSmartCache thử kết nối Redis trước; nếu không có hoặc lỗi thì tự động fallback về memory cache
func NewSmartCache(ctx context.Context, redisURL string) CacheService {
	if redisURL != "" {
		rc, err := NewRedisCache(ctx, redisURL)
		if err == nil {
			return rc
		}
		slog.Warn("could not connect to Redis, fallback to in-memory cache", "error", err)
	} else {
		slog.Info("REDIS_URL is empty, using in-memory cache")
	}
	return NewMemoryCache()
}

func (r *redisCache) Set(ctx context.Context, key string, value any, ttl time.Duration) error {
	var strVal string
	switch v := value.(type) {
	case string:
		strVal = v
	case []byte:
		strVal = string(v)
	default:
		bytes, err := json.Marshal(v)
		if err != nil {
			return err
		}
		strVal = string(bytes)
	}
	return r.client.Set(ctx, key, strVal, ttl).Err()
}

func (r *redisCache) Get(ctx context.Context, key string) (string, error) {
	val, err := r.client.Get(ctx, key).Result()
	if errors.Is(err, redis.Nil) {
		return "", nil
	}
	return val, err
}

func (r *redisCache) Delete(ctx context.Context, key string) error {
	return r.client.Del(ctx, key).Err()
}

func (r *redisCache) Ping(ctx context.Context) error {
	return r.client.Ping(ctx).Err()
}

func (r *redisCache) Close() error {
	return r.client.Close()
}

// ---- IN-MEMORY CACHE (FALLBACK) ----

type memoryCache struct {
	writes uint64
	mu     sync.RWMutex
	items  map[string]memoryItem
}

type memoryItem struct {
	value      string
	expiration time.Time
}

func NewMemoryCache() CacheService {
	return &memoryCache{
		items: make(map[string]memoryItem),
	}
}

func (m *memoryCache) Set(ctx context.Context, key string, value any, ttl time.Duration) error {
	m.mu.Lock()
	defer m.mu.Unlock()

	var strVal string
	switch v := value.(type) {
	case string:
		strVal = v
	case []byte:
		strVal = string(v)
	default:
		bytes, err := json.Marshal(v)
		if err != nil {
			return err
		}
		strVal = string(bytes)
	}

	var exp time.Time
	if ttl > 0 {
		exp = time.Now().Add(ttl)
	}

	m.cleanupExpired()
	m.items[key] = memoryItem{
		value:      strVal,
		expiration: exp,
	}
	return nil
}

func (m *memoryCache) Get(ctx context.Context, key string) (string, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()

	item, exists := m.items[key]
	if !exists {
		return "", nil
	}

	if !item.expiration.IsZero() && time.Now().After(item.expiration) {
		return "", nil
	}

	return item.value, nil
}

func (m *memoryCache) Delete(ctx context.Context, key string) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	delete(m.items, key)
	return nil
}

func (m *memoryCache) Ping(ctx context.Context) error {
	return nil // Memory cache is always alive
}

func (m *memoryCache) Close() error {
	m.mu.Lock()
	defer m.mu.Unlock()
	m.items = make(map[string]memoryItem)
	return nil
}

// Increment keeps the counter and its initial expiry in one Redis operation.
func (r *redisCache) Increment(ctx context.Context, key string, ttl time.Duration) (int64, error) {
	return r.client.Eval(ctx, `local count = redis.call('INCR', KEYS[1]); if count == 1 then redis.call('PEXPIRE', KEYS[1], ARGV[1]); end; return count`, []string{key}, ttl.Milliseconds()).Int64()
}

func (m *memoryCache) cleanupExpired() {
	m.writes++
	if m.writes%256 != 0 {
		return
	}
	now := time.Now()
	for key, item := range m.items {
		if !item.expiration.IsZero() && !now.Before(item.expiration) {
			delete(m.items, key)
		}
	}
}

func (m *memoryCache) Increment(ctx context.Context, key string, ttl time.Duration) (int64, error) {
	m.mu.Lock()
	defer m.mu.Unlock()
	m.cleanupExpired()
	item, exists := m.items[key]
	now := time.Now()
	if !exists || (!item.expiration.IsZero() && !now.Before(item.expiration)) {
		m.items[key] = memoryItem{value: "1", expiration: now.Add(ttl)}
		return 1, nil
	}
	count, err := strconv.ParseInt(item.value, 10, 64)
	if err != nil {
		return 0, err
	}
	count++
	item.value = strconv.FormatInt(count, 10)
	m.items[key] = item
	return count, nil
}
