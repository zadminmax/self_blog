package service

import (
	"archive/zip"
	"bytes"
	"errors"
	"fmt"
	"io"
	"os"
	"path/filepath"
	"strings"

	"github.com/selfblog/backend/internal/config"
	"github.com/selfblog/backend/internal/domain"
	"gorm.io/gorm"
)

type DemoInput struct {
	Name        string
	Slug        string
	Description string
	CoverURL    string
	CategoryID  *int64
	Enabled     bool
}

type DemoService struct {
	db  *gorm.DB
	cfg *config.Config
}

func NewDemoService(db *gorm.DB, cfg *config.Config) *DemoService {
	return &DemoService{db: db, cfg: cfg}
}

var (
	ErrDemoZipRequired = errors.New("zip required")
	ErrDemoNameRequired = errors.New("demo name required")
)

func slugifyDemo(s string) string {
	s = strings.ToLower(strings.TrimSpace(s))
	if s == "" {
		return ""
	}
	var b strings.Builder
	b.Grow(len(s))
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
	out := strings.Trim(b.String(), "-")
	if out == "" {
		return ""
	}
	return out
}

func allocateUniqueSlug(db *gorm.DB, base string) (string, error) {
	base = slugifyDemo(base)
	if base == "" {
		return "", errors.New("invalid slug")
	}
	candidate := base
	for i := 0; i < 20; i++ {
		var exists domain.Demo
		err := db.Where("slug = ?", candidate).First(&exists).Error
		if err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				return candidate, nil
			}
			return "", err
		}
		candidate = fmt.Sprintf("%s-%d", base, i+1)
	}
	return "", errors.New("could not allocate slug")
}

// extractZip extracts zipBytes into targetDir, preventing zip-slip.
func extractZip(zipBytes []byte, targetDir string) (string, error) {
	if err := os.RemoveAll(targetDir); err != nil {
		return "", err
	}
	if err := os.MkdirAll(targetDir, 0o755); err != nil {
		return "", err
	}

	r, err := zip.NewReader(bytes.NewReader(zipBytes), int64(len(zipBytes)))
	if err != nil {
		return "", err
	}
	for _, f := range r.File {
		name := f.Name
		// Skip path traversal.
		clean := filepath.Clean(name)
		if strings.HasPrefix(clean, ".."+string(filepath.Separator)) || clean == ".." {
			return "", errors.New("invalid zip path")
		}
		// Ensure target stays within targetDir.
		dest := filepath.Join(targetDir, clean)
		if !strings.HasPrefix(dest, filepath.Clean(targetDir)+string(filepath.Separator)) && dest != filepath.Clean(targetDir) {
			return "", errors.New("invalid zip destination")
		}

		if f.FileInfo().IsDir() {
			if err := os.MkdirAll(dest, f.Mode()); err != nil {
				return "", err
			}
			continue
		}

		if err := os.MkdirAll(filepath.Dir(dest), 0o755); err != nil {
			return "", err
		}
		out, err := os.OpenFile(dest, os.O_WRONLY|os.O_CREATE|os.O_TRUNC, f.Mode())
		if err != nil {
			return "", err
		}
		rc, err := f.Open()
		if err != nil {
			_ = out.Close()
			return "", err
		}
		_, cpErr := io.Copy(out, rc)
		_ = out.Close()
		_ = rc.Close()
		if cpErr != nil {
			return "", cpErr
		}
	}

	// Decide entry dir: index.html at root or in a single subdir.
	indexAtRoot := filepath.Join(targetDir, "index.html")
	if _, err := os.Stat(indexAtRoot); err == nil {
		return "", nil
	}
	entries, err := os.ReadDir(targetDir)
	if err != nil {
		return "", err
	}
	// If there's exactly one directory containing index.html, use it.
	var candidate string
	for _, e := range entries {
		if !e.IsDir() {
			continue
		}
		ix := filepath.Join(targetDir, e.Name(), "index.html")
		if _, err := os.Stat(ix); err == nil {
			if candidate != "" && candidate != e.Name() {
				// Multiple candidates, fall back to first match.
				return e.Name(), nil
			}
			candidate = e.Name()
		}
	}
	return candidate, nil
}

func (s *DemoService) CreateFromZip(in DemoInput, zipBytes []byte) (*domain.Demo, error) {
	if strings.TrimSpace(in.Name) == "" {
		return nil, ErrDemoNameRequired
	}
	if len(zipBytes) == 0 {
		return nil, ErrDemoZipRequired
	}

	if in.Slug == "" {
		in.Slug = in.Name
	}
	if in.Enabled == false {
		// keep false if explicitly set; default true is handled by handler.
	}

	slug, err := allocateUniqueSlug(s.db, in.Slug)
	if err != nil {
		return nil, err
	}

	targetDir := filepath.Join(s.cfg.DemoDir, slug)
	entryDir, err := extractZip(zipBytes, targetDir)
	if err != nil {
		return nil, err
	}

	d := domain.Demo{
		Name:        in.Name,
		Slug:        slug,
		Description: in.Description,
		CoverURL:    in.CoverURL,
		Enabled:     in.Enabled,
		CategoryID:  in.CategoryID,
		EntryDir:    entryDir,
	}
	if err := s.db.Create(&d).Error; err != nil {
		return nil, err
	}
	return &d, nil
}

func (s *DemoService) ListAdmin(page, pageSize int, q string, categoryID *int64, enabled *bool) ([]domain.Demo, int64, error) {
	if page < 1 {
		page = 1
	}
	if pageSize < 1 || pageSize > 100 {
		pageSize = 20
	}
	qr := strings.TrimSpace(q)
	dbq := s.db.Model(&domain.Demo{}).Order("created_at DESC, id DESC").Preload("Category")
	if qr != "" {
		dbq = dbq.Where("LOWER(name) LIKE ?", "%"+strings.ToLower(qr)+"%")
	}
	if categoryID != nil {
		dbq = dbq.Where("category_id = ?", *categoryID)
	}
	if enabled != nil {
		dbq = dbq.Where("enabled = ?", *enabled)
	}
	var total int64
	if err := dbq.Count(&total).Error; err != nil {
		return nil, 0, err
	}
	offset := (page - 1) * pageSize
	var items []domain.Demo
	if err := dbq.Offset(offset).Limit(pageSize).Find(&items).Error; err != nil {
		return nil, 0, err
	}
	return items, total, nil
}

func (s *DemoService) ListPublic(page, pageSize int, categoryID *int64) ([]domain.Demo, int64, error) {
	if page < 1 {
		page = 1
	}
	if pageSize < 1 || pageSize > 100 {
		pageSize = 20
	}
	dbq := s.db.Model(&domain.Demo{}).Order("created_at DESC, id DESC").Preload("Category").Where("enabled = ?", true)
	if categoryID != nil {
		dbq = dbq.Where("category_id = ?", *categoryID)
	}
	var total int64
	if err := dbq.Count(&total).Error; err != nil {
		return nil, 0, err
	}
	offset := (page - 1) * pageSize
	var items []domain.Demo
	if err := dbq.Offset(offset).Limit(pageSize).Find(&items).Error; err != nil {
		return nil, 0, err
	}
	return items, total, nil
}

func (s *DemoService) GetPublicBySlug(slug string) (*domain.Demo, error) {
	var d domain.Demo
	if err := s.db.Preload("Category").Where("slug = ? AND enabled = ?", slug, true).First(&d).Error; err != nil {
		return nil, err
	}
	return &d, nil
}

func (s *DemoService) GetByID(id int64) (*domain.Demo, error) {
	var d domain.Demo
	if err := s.db.Preload("Category").First(&d, id).Error; err != nil {
		return nil, err
	}
	return &d, nil
}

func (s *DemoService) UpdateMeta(id int64, in DemoInput) (*domain.Demo, error) {
	var d domain.Demo
	if err := s.db.First(&d, id).Error; err != nil {
		return nil, err
	}
	if strings.TrimSpace(in.Name) != "" {
		d.Name = in.Name
	}
	if in.Description != "" {
		d.Description = in.Description
	}
	if in.CoverURL != "" {
		d.CoverURL = in.CoverURL
	}
	d.Enabled = in.Enabled
	d.CategoryID = in.CategoryID
	if err := s.db.Save(&d).Error; err != nil {
		return nil, err
	}
	return &d, nil
}

func (s *DemoService) Delete(id int64) error {
	var d domain.Demo
	if err := s.db.First(&d, id).Error; err != nil {
		return err
	}
	targetDir := filepath.Join(s.cfg.DemoDir, d.Slug)
	if err := os.RemoveAll(targetDir); err != nil {
		return err
	}
	return s.db.Delete(&domain.Demo{}, id).Error
}

func (s *DemoService) ListCategories() ([]domain.DemoCategory, error) {
	var list []domain.DemoCategory
	if err := s.db.Order("id DESC").Find(&list).Error; err != nil {
		return nil, err
	}
	return list, nil
}

func (s *DemoService) CreateCategory(name, slug string) (*domain.DemoCategory, error) {
	c := domain.DemoCategory{Name: name, Slug: slug}
	if err := s.db.Create(&c).Error; err != nil {
		return nil, err
	}
	return &c, nil
}

func (s *DemoService) UpdateCategory(id int64, name, slug string) (*domain.DemoCategory, error) {
	var c domain.DemoCategory
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

func (s *DemoService) DeleteCategory(id int64) error {
	return s.db.Delete(&domain.DemoCategory{}, id).Error
}

