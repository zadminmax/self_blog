package service

import (
	"errors"
	"time"

	"github.com/selfblog/backend/internal/config"
	"github.com/selfblog/backend/internal/domain"
	"github.com/selfblog/backend/internal/pkg/jwtutil"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
)

type AuthService struct {
	db  *gorm.DB
	cfg *config.Config
}

func NewAuthService(db *gorm.DB, cfg *config.Config) *AuthService {
	return &AuthService{db: db, cfg: cfg}
}

func (s *AuthService) Login(username, password string) (token string, perms []string, user *domain.User, err error) {
	var u domain.User
	if err := s.db.Preload("Roles.Permissions").Where("username = ?", username).First(&u).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return "", nil, nil, errors.New("invalid credentials")
		}
		return "", nil, nil, err
	}
	if !u.Active {
		return "", nil, nil, errors.New("account disabled")
	}
	if bcrypt.CompareHashAndPassword([]byte(u.PasswordHash), []byte(password)) != nil {
		return "", nil, nil, errors.New("invalid credentials")
	}
	permSet := map[string]struct{}{}
	var roles []string
	for _, r := range u.Roles {
		roles = append(roles, r.Name)
		for _, p := range r.Permissions {
			permSet[p.Name] = struct{}{}
		}
	}
	for p := range permSet {
		perms = append(perms, p)
	}
	exp := time.Duration(s.cfg.JWTExpireHours) * time.Hour
	token, err = jwtutil.Sign(s.cfg.JWTSecret, u.ID, u.Username, roles, perms, exp)
	if err != nil {
		return "", nil, nil, err
	}
	return token, perms, &u, nil
}

func (s *AuthService) UserPermissions(userID int64) ([]string, error) {
	var u domain.User
	if err := s.db.Preload("Roles.Permissions").First(&u, userID).Error; err != nil {
		return nil, err
	}
	permSet := map[string]struct{}{}
	for _, r := range u.Roles {
		for _, p := range r.Permissions {
			permSet[p.Name] = struct{}{}
		}
	}
	out := make([]string, 0, len(permSet))
	for p := range permSet {
		out = append(out, p)
	}
	return out, nil
}
