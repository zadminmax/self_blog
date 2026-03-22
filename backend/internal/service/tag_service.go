package service

import (
	"github.com/selfblog/backend/internal/domain"
	"gorm.io/gorm"
)

type TagService struct{ db *gorm.DB }

func NewTagService(db *gorm.DB) *TagService { return &TagService{db: db} }

func (s *TagService) List() ([]domain.Tag, error) {
	var list []domain.Tag
	err := s.db.Order("name ASC").Find(&list).Error
	return list, err
}

func (s *TagService) Create(name, slug string) (*domain.Tag, error) {
	t := domain.Tag{Name: name, Slug: slug}
	if err := s.db.Create(&t).Error; err != nil {
		return nil, err
	}
	return &t, nil
}

func (s *TagService) Update(id int64, name, slug string) (*domain.Tag, error) {
	var t domain.Tag
	if err := s.db.First(&t, id).Error; err != nil {
		return nil, err
	}
	t.Name = name
	t.Slug = slug
	if err := s.db.Save(&t).Error; err != nil {
		return nil, err
	}
	return &t, nil
}

func (s *TagService) Delete(id int64) error {
	return s.db.Transaction(func(tx *gorm.DB) error {
		var t domain.Tag
		if err := tx.First(&t, id).Error; err != nil {
			return err
		}
		if err := tx.Model(&t).Association("Posts").Clear(); err != nil {
			return err
		}
		return tx.Delete(&t).Error
	})
}
