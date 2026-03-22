package security

import (
	"crypto/rand"
	"encoding/hex"
	"fmt"
	"sync"
	"time"
)

const (
	adminLoginMaxFailures = 5
	adminLoginLock        = 2 * time.Hour
	captchaTTL            = 3 * time.Minute
	trackWidthPx          = 300
	// minSlideX: user must drag at least this far (random per captcha).
	minSlideMin = 248
	minSlideMax = 292
)

type captchaEntry struct {
	minX    int
	expires time.Time
}

type throttleEntry struct {
	failures    int
	lockedUntil time.Time
}

// AdminLoginGuard rate-limits admin login by IP and optional device id, and issues one-time slider captchas.
type AdminLoginGuard struct {
	mu       sync.Mutex
	captcha  map[string]*captchaEntry
	byIP     map[string]*throttleEntry
	byDevice map[string]*throttleEntry
	events   []LoginAttemptEvent
}

func NewAdminLoginGuard() *AdminLoginGuard {
	return &AdminLoginGuard{
		captcha:  make(map[string]*captchaEntry),
		byIP:     make(map[string]*throttleEntry),
		byDevice: make(map[string]*throttleEntry),
	}
}

func randomID() string {
	b := make([]byte, 16)
	_, _ = rand.Read(b)
	return hex.EncodeToString(b)
}

func (g *AdminLoginGuard) pruneLocked(now time.Time, e *throttleEntry) {
	if e == nil {
		return
	}
	if !e.lockedUntil.IsZero() && !now.Before(e.lockedUntil) {
		e.lockedUntil = time.Time{}
		e.failures = 0
	}
}

// CheckFrozen returns true if this IP or device is in the lockout window.
func (g *AdminLoginGuard) CheckFrozen(ip, deviceID string) (bool, string) {
	g.mu.Lock()
	defer g.mu.Unlock()
	now := time.Now()
	msg := func(key string, m map[string]*throttleEntry) string {
		e := m[key]
		if e == nil {
			return ""
		}
		g.pruneLocked(now, e)
		if e.lockedUntil.IsZero() || !now.Before(e.lockedUntil) {
			return ""
		}
		rem := e.lockedUntil.Sub(now)
		mins := int(rem.Round(time.Minute) / time.Minute)
		if mins < 1 {
			mins = 1
		}
		return fmt.Sprintf("登录已暂时锁定约 %d 分钟后再试（本 IP 或本设备失败次数过多）", mins)
	}
	if m := msg("ip:" + ip, g.byIP); m != "" {
		return true, m
	}
	if deviceID != "" {
		if m := msg("dev:"+deviceID, g.byDevice); m != "" {
			return true, m
		}
	}
	return false, ""
}

// IssueCaptcha creates a slider challenge; client must send slide_x >= server min for this id.
func (g *AdminLoginGuard) IssueCaptcha() (captchaID string, trackWidth int) {
	g.mu.Lock()
	defer g.mu.Unlock()
	g.pruneExpiredCaptchasLocked(time.Now())
	id := randomID()
	span := minSlideMax - minSlideMin + 1
	var rb [1]byte
	_, _ = rand.Read(rb[:])
	minX := minSlideMin + int(rb[0])%span
	g.captcha[id] = &captchaEntry{minX: minX, expires: time.Now().Add(captchaTTL)}
	return id, trackWidthPx
}

func (g *AdminLoginGuard) pruneExpiredCaptchasLocked(now time.Time) {
	for k, v := range g.captcha {
		if now.After(v.expires) {
			delete(g.captcha, k)
		}
	}
}

// VerifyCaptcha checks slide position and consumes the captcha (single use).
func (g *AdminLoginGuard) VerifyCaptcha(captchaID string, slideX int) bool {
	g.mu.Lock()
	defer g.mu.Unlock()
	now := time.Now()
	g.pruneExpiredCaptchasLocked(now)
	ent, ok := g.captcha[captchaID]
	if !ok || now.After(ent.expires) {
		return false
	}
	delete(g.captcha, captchaID)
	if slideX < ent.minX || slideX > trackWidthPx {
		return false
	}
	return true
}

// RecordFailure increments failure counters and may start a lockout for IP and device.
func (g *AdminLoginGuard) RecordFailure(ip, deviceID string) {
	g.mu.Lock()
	defer g.mu.Unlock()
	now := time.Now()
	bump := func(key string, m map[string]*throttleEntry) {
		e := m[key]
		if e == nil {
			e = &throttleEntry{}
			m[key] = e
		}
		g.pruneLocked(now, e)
		if !e.lockedUntil.IsZero() && now.Before(e.lockedUntil) {
			return
		}
		e.failures++
		if e.failures >= adminLoginMaxFailures {
			e.lockedUntil = now.Add(adminLoginLock)
			e.failures = 0
		}
	}
	bump("ip:"+ip, g.byIP)
	if deviceID != "" {
		bump("dev:"+deviceID, g.byDevice)
	}
}

// ClearFailures resets throttle after successful login.
func (g *AdminLoginGuard) ClearFailures(ip, deviceID string) {
	g.mu.Lock()
	defer g.mu.Unlock()
	delete(g.byIP, "ip:"+ip)
	if deviceID != "" {
		delete(g.byDevice, "dev:"+deviceID)
	}
}
