package cache

import (
	"context"
	"sync"
	"time"
)

type CacheService interface {
	Set(ctx context.Context, key string, value any, ttl time.Duration) error
	Get(ctx context.Context, key string) (string, error)
	Delete(ctx context.Context, key string) error
}

type memoryCache struct {
	mu    sync.RWMutex
	items map[string]memoryItem
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
		strVal = ""
	}

	var exp time.Time
	if ttl > 0 {
		exp = time.Now().Add(ttl)
	}

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