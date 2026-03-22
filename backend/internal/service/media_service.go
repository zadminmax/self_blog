package service

import (
	"bytes"
	"errors"
	"io"
	"math"
	"net/http"
	"image"
	"image/color"
	"image/draw"
	"image/jpeg"
	_ "image/gif"
	_ "image/png"
	"strings"

	"github.com/selfblog/backend/internal/config"
	"github.com/selfblog/backend/internal/domain"
	"github.com/selfblog/backend/internal/storage"
	xdraw "golang.org/x/image/draw"
	_ "golang.org/x/image/webp"
	"gorm.io/gorm"
)

type MediaService struct {
	db  *gorm.DB
	st  storage.Storage
	cfg *config.Config
}

func NewMediaService(db *gorm.DB, st storage.Storage, cfg *config.Config) *MediaService {
	return &MediaService{db: db, st: st, cfg: cfg}
}

var (
	ErrUnsupportedFileType = errors.New("unsupported file type")
	ErrFileTooLarge        = errors.New("file too large")
)

var allowedImageMIME = map[string]struct{}{
	"image/jpeg": {}, "image/png": {}, "image/gif": {},
	"image/webp": {}, "image/svg+xml": {},
}

func normalizeMIME(ct string) string {
	return strings.TrimSpace(strings.Split(ct, ";")[0])
}

func (s *MediaService) Save(uploaderID int64, filename string, contentType string, r io.Reader, maxBytes int64, name string, categoryID *int64, categoryName string) (*domain.Media, error) {
	headerCT := normalizeMIME(contentType)

	buf, err := io.ReadAll(&io.LimitedReader{R: r, N: maxBytes + 1})
	if err != nil {
		return nil, err
	}
	if int64(len(buf)) > maxBytes {
		return nil, ErrFileTooLarge
	}

	ct := headerCT
	if ct == "" {
		ct = mimeFromBytes(buf)
	}
	if _, ok := allowedImageMIME[ct]; !ok {
		ct = mimeFromBytes(buf)
	}
	if _, ok := allowedImageMIME[ct]; !ok {
		return nil, ErrUnsupportedFileType
	}

	finalBuf, finalCT, compressed, err := maybeCompress(buf, ct)
	if err != nil {
		// If compression fails, fall back to original upload.
		finalBuf, finalCT, compressed = buf, ct, false
		_ = compressed
	}

	rel, size, err := s.st.Save(filename, finalCT, bytes.NewReader(finalBuf))
	if err != nil {
		return nil, err
	}
	if size != int64(len(finalBuf)) {
		return nil, errors.New("storage size mismatch")
	}
	url := storage.PublicURL(s.cfg.PublicURL, rel)
	// Resolve category by name if not provided.
	resolvedCategoryID := categoryID
	if resolvedCategoryID == nil {
		cn := strings.TrimSpace(categoryName)
		if cn != "" {
			var mc domain.MediaCategory
			if err := s.db.Where("slug = ?", cn).First(&mc).Error; err != nil {
				if errors.Is(err, gorm.ErrRecordNotFound) {
					_ = s.db.Where("name = ?", cn).First(&mc).Error
				} else {
					return nil, err
				}
			}
			if mc.ID != 0 {
				resolvedCategoryID = &mc.ID
			}
		}
	}

	m := domain.Media{
		Path:       rel,
		URL:        url,
		MimeType:   finalCT,
		Name:       name,
		CategoryID: resolvedCategoryID,
		Size:       size,
		UploaderID: uploaderID,
	}
	if err := s.db.Create(&m).Error; err != nil {
		return nil, err
	}
	return &m, nil
}

func mimeFromBytes(buf []byte) string {
	d := http.DetectContentType(buf)
	ct := normalizeMIME(d)
	if strings.Contains(ct, "svg") {
		return "image/svg+xml"
	}
	return ct
}

const (
	maxImageSide  = 1600
	jpegQuality   = 82
	minJpegHeight = 1
)

func maybeCompress(buf []byte, ct string) ([]byte, string, bool, error) {
	// Keep svg as-is.
	if ct == "image/svg+xml" {
		return buf, ct, false, nil
	}
	// Keep gif as-is (avoid losing animation by re-encoding).
	if ct == "image/gif" {
		return buf, ct, false, nil
	}

	img, _, err := image.Decode(bytes.NewReader(buf))
	if err != nil {
		return buf, ct, false, nil
	}

	b := img.Bounds()
	w := b.Dx()
	h := b.Dy()
	if w <= 0 || h <= 0 {
		return buf, ct, false, nil
	}
	if max(w, h) <= maxImageSide {
		return buf, ct, false, nil
	}

	scale := float64(maxImageSide) / float64(max(w, h))
	newW := int(math.Round(float64(w) * scale))
	newH := int(math.Round(float64(h) * scale))
	if newW < 1 {
		newW = minJpegHeight
	}
	if newH < 1 {
		newH = minJpegHeight
	}

	// Flatten onto white background and re-encode as JPEG.
	dstBounds := image.Rect(0, 0, newW, newH)
	bg := image.NewRGBA(dstBounds)
	draw.Draw(bg, bg.Bounds(), &image.Uniform{C: color.White}, image.Point{}, draw.Src)
	xdraw.CatmullRom.Scale(bg, bg.Bounds(), img, b, draw.Over, nil)

	var out bytes.Buffer
	if err := jpeg.Encode(&out, bg, &jpeg.Options{Quality: jpegQuality}); err != nil {
		return buf, ct, false, err
	}
	return out.Bytes(), "image/jpeg", true, nil
}

func max(a, b int) int {
	if a > b {
		return a
	}
	return b
}

func (s *MediaService) GetByID(id int64) (*domain.Media, error) {
	var m domain.Media
	if err := s.db.First(&m, id).Error; err != nil {
		return nil, err
	}
	return &m, nil
}

func (s *MediaService) List(page, pageSize int, uploaderID *int64, query string, categoryID *int64) ([]domain.Media, int64, error) {
	if page < 1 {
		page = 1
	}
	if pageSize < 1 || pageSize > 100 {
		pageSize = 20
	}

	dbq := s.db.Model(&domain.Media{}).Order("created_at DESC, id DESC")
	if uploaderID != nil {
		dbq = dbq.Where("uploader_id = ?", *uploaderID)
	}
	if qq := strings.TrimSpace(query); qq != "" {
		dbq = dbq.Where("LOWER(name) LIKE ?", "%"+strings.ToLower(qq)+"%")
	}
	if categoryID != nil {
		dbq = dbq.Where("category_id = ?", *categoryID)
	}

	var total int64
	if err := dbq.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	offset := (page - 1) * pageSize
	var items []domain.Media
	if err := dbq.Preload("Category").Offset(offset).Limit(pageSize).Find(&items).Error; err != nil {
		return nil, 0, err
	}
	return items, total, nil
}

func (s *MediaService) Delete(id int64) error {
	m, err := s.GetByID(id)
	if err != nil {
		return err
	}
	_ = s.st.Delete(m.Path)
	return s.db.Delete(&domain.Media{}, id).Error
}

func (s *MediaService) UpdateMeta(id int64, name string, categoryID *int64) error {
	m, err := s.GetByID(id)
	if err != nil {
		return err
	}
	m.Name = name
	m.CategoryID = categoryID
	return s.db.Save(m).Error
}

func (s *MediaService) ListCategories() ([]domain.MediaCategory, error) {
	var list []domain.MediaCategory
	if err := s.db.Order("id DESC").Find(&list).Error; err != nil {
		return nil, err
	}
	return list, nil
}
