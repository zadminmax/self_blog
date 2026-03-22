package service

import (
	"errors"
	"time"

	"github.com/selfblog/backend/internal/config"
	"github.com/selfblog/backend/internal/domain"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
)

type UserService struct {
	db  *gorm.DB
	cfg *config.Config
}

func NewUserService(db *gorm.DB, cfg *config.Config) *UserService {
	return &UserService{db: db, cfg: cfg}
}

type UserInput struct {
	Username  string
	Password  string
	RoleIDs   []int64
	Active    *bool
	CreatedAt *time.Time
}

func (s *UserService) List() ([]domain.User, error) {
	var list []domain.User
	if err := s.db.Preload("Roles").Order("id DESC").Find(&list).Error; err != nil {
		return nil, err
	}
	return list, nil
}

func (s *UserService) Create(in UserInput) (*domain.User, error) {
	if in.Username == "" || in.Password == "" {
		return nil, errors.New("username/password required")
	}
	var existing domain.User
	if err := s.db.Where("username = ?", in.Username).First(&existing).Error; err == nil {
		return nil, errors.New("username already exists")
	} else if !errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, err
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(in.Password), bcrypt.DefaultCost)
	if err != nil {
		return nil, err
	}

	u := domain.User{
		Username:     in.Username,
		PasswordHash: string(hash),
		Active:       true,
	}
	if in.Active != nil {
		u.Active = *in.Active
	}

	if err := s.db.Create(&u).Error; err != nil {
		return nil, err
	}

	if len(in.RoleIDs) > 0 {
		var roles []domain.Role
		if err := s.db.Find(&roles, in.RoleIDs).Error; err != nil {
			return nil, err
		}
		if err := s.db.Model(&u).Association("Roles").Replace(&roles); err != nil {
			return nil, err
		}
	}

	// Reload with roles
	if err := s.db.Preload("Roles").First(&u, u.ID).Error; err != nil {
		return nil, err
	}
	return &u, nil
}

func (s *UserService) AssignRoles(userID int64, roleIDs []int64) (*domain.User, error) {
	var u domain.User
	if err := s.db.Preload("Roles").First(&u, userID).Error; err != nil {
		return nil, err
	}

	if len(roleIDs) == 0 {
		if err := s.db.Model(&u).Association("Roles").Clear(); err != nil {
			return nil, err
		}
	} else {
		var roles []domain.Role
		if err := s.db.Find(&roles, roleIDs).Error; err != nil {
			return nil, err
		}
		if err := s.db.Model(&u).Association("Roles").Replace(&roles); err != nil {
			return nil, err
		}
	}

	if err := s.db.Preload("Roles").First(&u, userID).Error; err != nil {
		return nil, err
	}
	return &u, nil
}

func (s *UserService) GetByID(userID int64) (*domain.User, error) {
	var u domain.User
	if err := s.db.Preload("Roles").First(&u, userID).Error; err != nil {
		return nil, err
	}
	return &u, nil
}

func (s *UserService) SetActive(userID int64, active bool) (*domain.User, error) {
	var u domain.User
	if err := s.db.First(&u, userID).Error; err != nil {
		return nil, err
	}
	if err := s.db.Model(&domain.User{}).Where("id = ?", userID).Update("active", active).Error; err != nil {
		return nil, err
	}
	if err := s.db.Preload("Roles").First(&u, userID).Error; err != nil {
		return nil, err
	}
	return &u, nil
}

type Profile struct {
	ID        int64  `json:"id"`
	Username  string `json:"username"`
	Nickname  string `json:"nickname"`
	AvatarURL string `json:"avatar_url"`
}

func (s *UserService) GetProfile(userID int64) (*Profile, error) {
	var u domain.User
	if err := s.db.First(&u, userID).Error; err != nil {
		return nil, err
	}
	return &Profile{
		ID:        u.ID,
		Username:  u.Username,
		Nickname:  u.Nickname,
		AvatarURL: u.AvatarURL,
	}, nil
}

func (s *UserService) UpdateProfile(userID int64, nickname string) (*Profile, error) {
	if nickname == "" {
		return nil, errors.New("nickname required")
	}
	if err := s.db.Model(&domain.User{}).Where("id = ?", userID).Update("nickname", nickname).Error; err != nil {
		return nil, err
	}
	return s.GetProfile(userID)
}

func (s *UserService) ChangePassword(userID int64, currentPassword, newPassword string) error {
	if newPassword == "" || len(newPassword) < 6 {
		return errors.New("new password too short")
	}
	var u domain.User
	if err := s.db.First(&u, userID).Error; err != nil {
		return err
	}
	if bcrypt.CompareHashAndPassword([]byte(u.PasswordHash), []byte(currentPassword)) != nil {
		return errors.New("current password incorrect")
	}
	hash, err := bcrypt.GenerateFromPassword([]byte(newPassword), bcrypt.DefaultCost)
	if err != nil {
		return err
	}
	return s.db.Model(&u).Update("password_hash", hash).Error
}

func (s *UserService) SetAvatar(userID int64, avatarURL string) (*Profile, error) {
	if avatarURL == "" {
		return nil, errors.New("avatar url required")
	}
	if err := s.db.Model(&domain.User{}).Where("id = ?", userID).Update("avatar_url", avatarURL).Error; err != nil {
		return nil, err
	}
	return s.GetProfile(userID)
}

