package service

import (
	"github.com/selfblog/backend/internal/domain"
	"gorm.io/gorm"
)

type PermissionService struct{ db *gorm.DB }

func NewPermissionService(db *gorm.DB) *PermissionService { return &PermissionService{db: db} }

func (s *PermissionService) List() ([]domain.Permission, error) {
	var list []domain.Permission
	if err := s.db.Order("id ASC").Find(&list).Error; err != nil {
		return nil, err
	}
	return list, nil
}

