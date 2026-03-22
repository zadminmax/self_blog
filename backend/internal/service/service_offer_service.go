package service

import (
	"errors"
	"strings"

	"github.com/selfblog/backend/internal/domain"
	"github.com/selfblog/backend/internal/pkg/htmlutil"
	"gorm.io/gorm"
)

type ServiceOfferService struct {
	db *gorm.DB
}

func NewServiceOfferService(db *gorm.DB) *ServiceOfferService {
	return &ServiceOfferService{db: db}
}

func serviceSlug(s string) string {
	s = strings.ToLower(strings.TrimSpace(s))
	var b strings.Builder
	prevDash := false
	for _, r := range s {
		ok := (r >= 'a' && r <= 'z') || (r >= '0' && r <= '9')
		if ok {
			b.WriteRune(r)
			prevDash = false
			continue
		}
		if !prevDash {
			b.WriteRune('-')
			prevDash = true
		}
	}
	return strings.Trim(b.String(), "-")
}

type ServiceOfferInput struct {
	Name      string
	Slug      string
	Category  string
	PriceText string
	Summary   string
	Content   string
	CoverURL  string
	SortOrder int
	Featured  bool
	Enabled   bool
}

func (s *ServiceOfferService) ListAdmin() ([]domain.ServiceOffer, error) {
	var list []domain.ServiceOffer
	if err := s.db.Order("sort_order ASC, id DESC").Find(&list).Error; err != nil {
		return nil, err
	}
	return withContentHTML(list), nil
}

func (s *ServiceOfferService) ListPublic() ([]domain.ServiceOffer, error) {
	var list []domain.ServiceOffer
	if err := s.db.Where("enabled = ?", true).Order("sort_order ASC, id DESC").Find(&list).Error; err != nil {
		return nil, err
	}
	return withContentHTML(list), nil
}

func (s *ServiceOfferService) Create(in ServiceOfferInput) (*domain.ServiceOffer, error) {
	if strings.TrimSpace(in.Name) == "" {
		return nil, errors.New("name required")
	}
	if strings.TrimSpace(in.Slug) == "" {
		in.Slug = serviceSlug(in.Name)
	}
	if in.Slug == "" {
		return nil, errors.New("invalid slug")
	}
	o := domain.ServiceOffer{
		Name:      in.Name,
		Slug:      in.Slug,
		Category:  in.Category,
		PriceText: in.PriceText,
		Summary:   in.Summary,
		Content:   in.Content,
		CoverURL:  in.CoverURL,
		SortOrder: in.SortOrder,
		Featured:  in.Featured,
		Enabled:   in.Enabled,
	}
	if err := s.db.Create(&o).Error; err != nil {
		return nil, err
	}
	return &o, nil
}

func (s *ServiceOfferService) Update(id int64, in ServiceOfferInput) (*domain.ServiceOffer, error) {
	var o domain.ServiceOffer
	if err := s.db.First(&o, id).Error; err != nil {
		return nil, err
	}
	o.Name = in.Name
	if strings.TrimSpace(in.Slug) != "" {
		o.Slug = in.Slug
	}
	o.Category = in.Category
	o.PriceText = in.PriceText
	o.Summary = in.Summary
	o.Content = in.Content
	o.CoverURL = in.CoverURL
	o.SortOrder = in.SortOrder
	o.Featured = in.Featured
	o.Enabled = in.Enabled
	if err := s.db.Save(&o).Error; err != nil {
		return nil, err
	}
	return &o, nil
}

func (s *ServiceOfferService) Delete(id int64) error {
	return s.db.Delete(&domain.ServiceOffer{}, id).Error
}

func withContentHTML(list []domain.ServiceOffer) []domain.ServiceOffer {
	for i := range list {
		html, err := htmlutil.MarkdownToSafeHTML(list[i].Content)
		if err != nil {
			list[i].ContentHTML = htmlutil.SanitizeHTML(list[i].Content)
			continue
		}
		list[i].ContentHTML = html
	}
	return list
}

