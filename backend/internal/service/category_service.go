package service

import (
	"github.com/selfblog/backend/internal/domain"
	"gorm.io/gorm"
)

type CategoryService struct{ db *gorm.DB }

func NewCategoryService(db *gorm.DB) *CategoryService { return &CategoryService{db: db} }

func (s *CategoryService) List() ([]domain.Category, error) {
	var list []domain.Category
	err := s.db.Order("name ASC").Find(&list).Error
	return list, err
}

func (s *CategoryService) Create(name, slug string) (*domain.Category, error) {
	c := domain.Category{Name: name, Slug: slug}
	if err := s.db.Create(&c).Error; err != nil {
		return nil, err
	}
	return &c, nil
}

func (s *CategoryService) Update(id int64, name, slug string) (*domain.Category, error) {
	var c domain.Category
	if err := s.db.First(&c, id).Error; err != nil {
		return nil, err
	}
	c.Name = name
	c.Slug = slug
	if err := s.db.Save(&c).Error; err != nil {
		return nil, err
	}
	return &c, nil
}

func (s *CategoryService) Delete(id int64) error {
	return s.db.Transaction(func(tx *gorm.DB) error {
		var c domain.Category
		if err := tx.First(&c, id).Error; err != nil {
			return err
		}
		if err := tx.Model(&c).Association("Posts").Clear(); err != nil {
			return err
		}
		return tx.Delete(&c).Error
	})
}
