package security

import (
	"strings"
	"time"
)

const loginEventRingMax = 200

// LoginAttemptEvent is a single admin-login audit row (in-memory, cleared on process restart).
type LoginAttemptEvent struct {
	At       time.Time `json:"at"`
	IP       string    `json:"ip"`
	DeviceID string    `json:"device_id,omitempty"`
	Username string    `json:"username,omitempty"`
	Success  bool      `json:"success"`
	Detail   string    `json:"detail"` // locked | captcha | bad_password | ok
}

// LoginSecurityLimits documents throttle constants for the admin UI.
type LoginSecurityLimits struct {
	MaxFailuresBeforeLock int `json:"max_failures_before_lock"`
	LockMinutes           int `json:"lock_minutes"`
	CaptchaTTLMinutes     int `json:"captcha_ttl_minutes"`
}

// ThrottleView is one IP or device throttle row.
type ThrottleView struct {
	Kind        string  `json:"kind"` // ip | device
	Value       string  `json:"value"`
	Failures    int     `json:"failures"`
	Locked      bool    `json:"locked"`
	LockedUntil *string `json:"locked_until,omitempty"`
}

// LoginSecurityPanel aggregates data for GET /admin/login-security.
type LoginSecurityPanel struct {
	Config           LoginSecurityLimits   `json:"config"`
	Throttle         []ThrottleView        `json:"throttle"`
	RecentAttempts   []LoginAttemptEvent   `json:"recent_attempts"`
	PendingCaptchas  int                   `json:"pending_captcha_count"`
}

// LogAttempt records a login outcome (newest kept up to loginEventRingMax).
func (g *AdminLoginGuard) LogAttempt(ip, deviceID, username string, success bool, detail string) {
	g.mu.Lock()
	defer g.mu.Unlock()
	ev := LoginAttemptEvent{
		At:       time.Now().UTC(),
		IP:       ip,
		DeviceID: deviceID,
		Username: strings.TrimSpace(username),
		Success:  success,
		Detail:   detail,
	}
	g.events = append(g.events, ev)
	if len(g.events) > loginEventRingMax {
		g.events = g.events[len(g.events)-loginEventRingMax:]
	}
}

// SnapshotPanel returns throttle rows, recent attempts (newest first), and captcha backlog size.
func (g *AdminLoginGuard) SnapshotPanel() LoginSecurityPanel {
	g.mu.Lock()
	defer g.mu.Unlock()
	now := time.Now()
	g.pruneExpiredCaptchasLocked(now)

	cfg := LoginSecurityLimits{
		MaxFailuresBeforeLock: adminLoginMaxFailures,
		LockMinutes:           int(adminLoginLock / time.Minute),
		CaptchaTTLMinutes:     int(captchaTTL / time.Minute),
	}

	var throttle []ThrottleView
	appendMap := func(kind string, m map[string]*throttleEntry, prefix string) {
		for k, e := range m {
			g.pruneLocked(now, e)
			val := strings.TrimPrefix(k, prefix)
			locked := !e.lockedUntil.IsZero() && now.Before(e.lockedUntil)
			if e.failures == 0 && !locked {
				continue
			}
			var lu *string
			if locked {
				s := e.lockedUntil.UTC().Format(time.RFC3339)
				lu = &s
			}
			throttle = append(throttle, ThrottleView{
				Kind:        kind,
				Value:       val,
				Failures:    e.failures,
				Locked:      locked,
				LockedUntil: lu,
			})
		}
	}
	appendMap("ip", g.byIP, "ip:")
	appendMap("device", g.byDevice, "dev:")

	recent := make([]LoginAttemptEvent, len(g.events))
	for i := range g.events {
		recent[len(g.events)-1-i] = g.events[i]
	}

	return LoginSecurityPanel{
		Config:           cfg,
		Throttle:         throttle,
		RecentAttempts:   recent,
		PendingCaptchas:  len(g.captcha),
	}
}

// ClearThrottle removes one IP or device throttle bucket. Returns false if not found.
func (g *AdminLoginGuard) ClearThrottle(kind, value string) bool {
	g.mu.Lock()
	defer g.mu.Unlock()
	switch kind {
	case "ip":
		k := "ip:" + value
		if _, ok := g.byIP[k]; !ok {
			return false
		}
		delete(g.byIP, k)
		return true
	case "device":
		k := "dev:" + value
		if _, ok := g.byDevice[k]; !ok {
			return false
		}
		delete(g.byDevice, k)
		return true
	default:
		return false
	}
}
