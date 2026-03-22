package service

import (
	"errors"
	"strings"
	"time"
	"unicode"

	"github.com/google/uuid"
	"github.com/selfblog/backend/internal/domain"
	"github.com/selfblog/backend/internal/pkg/htmlutil"
	"gorm.io/gorm"
)

type PostService struct {
	db *gorm.DB
}

func NewPostService(db *gorm.DB) *PostService {
	return &PostService{db: db}
}

func slugify(s string) string {
	var b strings.Builder
	lastDash := false
	for _, r := range strings.ToLower(strings.TrimSpace(s)) {
		if unicode.IsLetter(r) || unicode.IsDigit(r) {
			b.WriteRune(r)
			lastDash = false
		} else if r == ' ' || r == '-' || r == '_' {
			if !lastDash && b.Len() > 0 {
				b.WriteByte('-')
				lastDash = true
			}
		}
	}
	out := strings.Trim(b.String(), "-")
	if out == "" {
		out = "post"
	}
	return out
}

func (s *PostService) ensureUniqueSlug(base string, excludeID int64) (string, error) {
	slug := slugify(base)
	candidate := slug
	for i := 0; i < 50; i++ {
		var n int64
		q := s.db.Model(&domain.Post{}).Where("slug = ?", candidate)
		if excludeID > 0 {
			q = q.Where("id <> ?", excludeID)
		}
		if err := q.Count(&n).Error; err != nil {
			return "", err
		}
		if n == 0 {
			return candidate, nil
		}
		candidate = slug + "-" + strings.ReplaceAll(uuid.New().String(), "-", "")[:8]
	}
	return "", errors.New("could not allocate slug")
}

func (s *PostService) buildBodyHTML(p *domain.Post) error {
	switch p.BodyFormat {
	case domain.BodyFormatMarkdown:
		h, err := htmlutil.MarkdownToSafeHTML(p.BodySource)
		if err != nil {
			return err
		}
		p.BodyHTML = h
	case domain.BodyFormatHTML:
		p.BodyHTML = htmlutil.SanitizeHTML(p.BodySource)
	default:
		p.BodyHTML = htmlutil.SanitizeHTML(p.BodySource)
	}
	return nil
}

type PostListFilter struct {
	Page       int
	PageSize   int
	Status     string
	ContentType string
	TagSlug    string
	CategorySlug string
	PublicOnly bool
}

func (s *PostService) List(f PostListFilter) ([]domain.Post, int64, error) {
	if f.Page < 1 {
		f.Page = 1
	}
	if f.PageSize < 1 || f.PageSize > 100 {
		f.PageSize = 20
	}
	q := s.db.Model(&domain.Post{}).Preload("Categories").Preload("Tags").Order("id DESC")
	if f.PublicOnly {
		q = q.Where("status = ?", domain.PostStatusPublished)
		now := time.Now()
		q = q.Where("published_at IS NOT NULL AND published_at <= ?", now)
	} else if f.Status != "" {
		q = q.Where("status = ?", f.Status)
	}
	if f.ContentType != "" {
		q = q.Where("content_type = ?", f.ContentType)
	}
	if f.TagSlug != "" {
		q = q.Joins("JOIN post_tags ON post_tags.post_id = posts.id").
			Joins("JOIN tags ON tags.id = post_tags.tag_id AND tags.slug = ?", f.TagSlug)
	}
	if f.CategorySlug != "" {
		q = q.Joins("JOIN post_categories ON post_categories.post_id = posts.id").
			Joins("JOIN categories ON categories.id = post_categories.category_id AND categories.slug = ?", f.CategorySlug)
	}
	var total int64
	if err := q.Count(&total).Error; err != nil {
		return nil, 0, err
	}
	var list []domain.Post
	offset := (f.Page - 1) * f.PageSize
	if err := q.Offset(offset).Limit(f.PageSize).Find(&list).Error; err != nil {
		return nil, 0, err
	}
	return list, total, nil
}

func (s *PostService) GetByID(id int64) (*domain.Post, error) {
	var p domain.Post
	if err := s.db.Preload("Categories").Preload("Tags").First(&p, id).Error; err != nil {
		return nil, err
	}
	return &p, nil
}

func (s *PostService) GetBySlugPublic(slug string) (*domain.Post, error) {
	var p domain.Post
	now := time.Now()
	err := s.db.Preload("Categories").Preload("Tags").
		Where("slug = ? AND status = ? AND published_at IS NOT NULL AND published_at <= ?", slug, domain.PostStatusPublished, now).
		First(&p).Error
	if err != nil {
		return nil, err
	}
	if p.BodyHTML == "" && p.BodySource != "" {
		_ = s.buildBodyHTML(&p)
	}
	return &p, nil
}

type PostInput struct {
	Title       string
	Slug        string
	Excerpt     string
	CoverURL    string
	Status      string
	ContentType string
	BodyFormat  string
	BodySource  string
	PublishedAt *time.Time
	CategoryIDs []int64
	TagIDs      []int64
}

func (s *PostService) Create(in PostInput) (*domain.Post, error) {
	p := domain.Post{
		Title:       in.Title,
		Excerpt:     in.Excerpt,
		CoverURL:    in.CoverURL,
		Status:      in.Status,
		ContentType: in.ContentType,
		BodyFormat:  in.BodyFormat,
		BodySource:  in.BodySource,
		PublishedAt: in.PublishedAt,
	}
	if p.Status == "" {
		p.Status = domain.PostStatusDraft
	}
	if p.ContentType == "" {
		p.ContentType = "article"
	}
	if p.BodyFormat == "" {
		p.BodyFormat = domain.BodyFormatMarkdown
	}
	var err error
	if in.Slug != "" {
		p.Slug, err = s.ensureUniqueSlug(in.Slug, 0)
	} else {
		p.Slug, err = s.ensureUniqueSlug(in.Title, 0)
	}
	if err != nil {
		return nil, err
	}
	if err := s.buildBodyHTML(&p); err != nil {
		return nil, err
	}
	return s.saveWithAssoc(&p, in.CategoryIDs, in.TagIDs)
}

func (s *PostService) Update(id int64, in PostInput) (*domain.Post, error) {
	p, err := s.GetByID(id)
	if err != nil {
		return nil, err
	}
	p.Title = in.Title
	p.Excerpt = in.Excerpt
	p.CoverURL = in.CoverURL
	if in.Status != "" {
		p.Status = in.Status
	}
	if in.ContentType != "" {
		p.ContentType = in.ContentType
	}
	if in.BodyFormat != "" {
		p.BodyFormat = in.BodyFormat
	}
	p.BodySource = in.BodySource
	if in.PublishedAt != nil {
		p.PublishedAt = in.PublishedAt
	}
	if in.Slug != "" && in.Slug != p.Slug {
		p.Slug, err = s.ensureUniqueSlug(in.Slug, id)
		if err != nil {
			return nil, err
		}
	}
	if err := s.buildBodyHTML(p); err != nil {
		return nil, err
	}
	return s.saveWithAssoc(p, in.CategoryIDs, in.TagIDs)
}

func (s *PostService) saveWithAssoc(p *domain.Post, catIDs, tagIDs []int64) (*domain.Post, error) {
	err := s.db.Transaction(func(tx *gorm.DB) error {
		if err := tx.Save(p).Error; err != nil {
			return err
		}
		var cats []domain.Category
		if len(catIDs) > 0 {
			if err := tx.Find(&cats, catIDs).Error; err != nil {
				return err
			}
		}
		if err := tx.Model(p).Association("Categories").Replace(cats); err != nil {
			return err
		}
		var tags []domain.Tag
		if len(tagIDs) > 0 {
			if err := tx.Find(&tags, tagIDs).Error; err != nil {
				return err
			}
		}
		if err := tx.Model(p).Association("Tags").Replace(tags); err != nil {
			return err
		}
		return nil
	})
	if err != nil {
		return nil, err
	}
	return s.GetByID(p.ID)
}

func (s *PostService) Delete(id int64) error {
	return s.db.Transaction(func(tx *gorm.DB) error {
		var p domain.Post
		if err := tx.First(&p, id).Error; err != nil {
			return err
		}
		if err := tx.Model(&p).Association("Categories").Clear(); err != nil {
			return err
		}
		if err := tx.Model(&p).Association("Tags").Clear(); err != nil {
			return err
		}
		return tx.Delete(&p).Error
	})
}

func (s *PostService) PublicPayload(p *domain.Post) map[string]any {
	html := p.BodyHTML
	if html == "" && p.BodySource != "" {
		_ = s.buildBodyHTML(p)
		html = p.BodyHTML
	}
	return map[string]any{
		"id":           p.ID,
		"title":        p.Title,
		"slug":         p.Slug,
		"excerpt":      p.Excerpt,
		"cover_url":    p.CoverURL,
		"content_type": p.ContentType,
		"published_at": p.PublishedAt,
		"body_html":    html,
		"categories":   p.Categories,
		"tags":         p.Tags,
		"created_at":   p.CreatedAt,
		"updated_at":   p.UpdatedAt,
	}
}
