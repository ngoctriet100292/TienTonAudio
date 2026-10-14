package middleware

import (
	"net"
	"net/http"
	"strings"
)

// Only configured reverse proxies may supply a client address. Walk XFF from the trusted edge.
func TrustedProxyMiddleware(cidrs []string) func(http.Handler) http.Handler {
	var networks []*net.IPNet
	for _, cidr := range cidrs {
		if _, network, err := net.ParseCIDR(strings.TrimSpace(cidr)); err == nil {
			networks = append(networks, network)
		}
	}
	trusted := func(ip net.IP) bool {
		for _, network := range networks {
			if network.Contains(ip) {
				return true
			}
		}
		return false
	}
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			ip := net.ParseIP(stripPort(r.RemoteAddr))
			if ip != nil && trusted(ip) {
				forwarded := r.Header.Get("X-Forwarded-For")
				if forwarded != "" {
					parts := strings.Split(forwarded, ",")
					valid := true
					for i := len(parts) - 1; i >= 0 && trusted(ip); i-- {
						candidate := net.ParseIP(strings.TrimSpace(parts[i]))
						if candidate == nil {
							valid = false
							break
						}
						ip = candidate
					}
					if valid {
						r = r.Clone(r.Context())
						r.RemoteAddr = ip.String()
					}
				} else if candidate := net.ParseIP(strings.TrimSpace(r.Header.Get("X-Real-IP"))); candidate != nil {
					r = r.Clone(r.Context())
					r.RemoteAddr = candidate.String()
				}
			}
			next.ServeHTTP(w, r)
		})
	}
}
