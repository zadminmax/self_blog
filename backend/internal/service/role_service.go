package service

import (
	"errors"

	"github.com/selfblog/backend/internal/domain"
	"gorm.io/gorm"
)

type RoleService struct {
	db *gorm.DB
}

func NewRoleService(db *gorm.DB) *RoleService {
	return &RoleService{db: db}
}

func (s *RoleService) List() ([]domain.Role, error) {
	var list []domain.Role
	if err := s.db.Order("id DESC").Find(&list).Error; err != nil {
		return nil, err
	}
	return list, nil
}

func (s *RoleService) Create(name, description string) (*domain.Role, error) {
	if name == "" {
		return nil, errors.New("role name required")
	}
	var existing domain.Role
	if err := s.db.Where("name = ?", name).First(&existing).Error; err == nil {
		return nil, errors.New("role already exists")
	} else if !errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, err
	}

	r := domain.Role{Name: name, Description: description}
	if err := s.db.Create(&r).Error; err != nil {
		return nil, err
	}
	return &r, nil
}

func (s *RoleService) Update(id int64, name, description string) (*domain.Role, error) {
	var r domain.Role
	if err := s.db.First(&r, id).Error; err != nil {
		return nil, err
	}
	if name != "" {
		r.Name = name
	}
	r.Description = description
	if err := s.db.Save(&r).Error; err != nil {
		return nil, err
	}
	return &r, nil
}

func (s *RoleService) SetPermissions(roleID int64, permissionIDs []int64) (*domain.Role, error) {
	var r domain.Role
	if err := s.db.Preload("Permissions").First(&r, roleID).Error; err != nil {
		return nil, err
	}

	if len(permissionIDs) == 0 {
		if err := s.db.Model(&r).Association("Permissions").Clear(); err != nil {
			return nil, err
		}
	} else {
		var perms []domain.Permission
		if err := s.db.Find(&perms, permissionIDs).Error; err != nil {
			return nil, err
		}
		if err := s.db.Model(&r).Association("Permissions").Replace(&perms); err != nil {
			return nil, err
		}
	}

	if err := s.db.Preload("Permissions").First(&r, roleID).Error; err != nil {
		return nil, err
	}
	return &r, nil
}

func (s *RoleService) GetByID(roleID int64) (*domain.Role, error) {
	var r domain.Role
	if err := s.db.Preload("Permissions").First(&r, roleID).Error; err != nil {
		return nil, err
	}
	return &r, nil
}

