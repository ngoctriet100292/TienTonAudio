package middleware

import (
	"net/http"
	"sync"
	"time"

	"github.com/IREAKING/tientonaudio/backend/pkg/utils"
)

type clientLimit struct {
	count     int
	resetTime time.Time
}

type RateLimiter struct {
	mu        sync.Mutex
	clients   map[string]*clientLimit
	rateLimit int
}

func NewRateLimiter(requestsPerMinute int) *RateLimiter {
	rl := &RateLimiter{
		clients:   make(map[string]*clientLimit),
		rateLimit: requestsPerMinute,
	}

	// Cleanup worker
	go func() {
		for {
			time.Sleep(1 * time.Minute)
			rl.mu.Lock()
			now := time.Now()
			for ip, cl := range rl.clients {
				if now.After(cl.resetTime) {
					delete(rl.clients, ip)
				}
			}
			rl.mu.Unlock()
		}
	}()

	return rl
}

func (rl *RateLimiter) Middleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		ip := r.RemoteAddr

		rl.mu.Lock()
		now := time.Now()
		cl, exists := rl.clients[ip]
		if !exists || now.After(cl.resetTime) {
			rl.clients[ip] = &clientLimit{
				count:     1,
				resetTime: now.Add(1 * time.Minute),
			}
			rl.mu.Unlock()
			next.ServeHTTP(w, r)
			return
		}

		if cl.count >= rl.rateLimit {
			rl.mu.Unlock()
			utils.ErrorResponse(w, http.StatusTooManyRequests, "Too many requests. Please try again later.")
			return
		}

		cl.count++
		rl.mu.Unlock()
		next.ServeHTTP(w, r)
	})
}