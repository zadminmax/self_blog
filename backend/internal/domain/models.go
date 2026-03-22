package domain

import (
	"time"
)

type User struct {
	ID           int64     `gorm:"primaryKey" json:"id"`
	Username     string    `gorm:"uniqueIndex;size:64;not null" json:"username"`
	Nickname    string    `gorm:"size:64;default:''" json:"nickname"`
	AvatarURL   string    `gorm:"size:1024;default:''" json:"avatar_url"`
	PasswordHash string    `gorm:"size:255;not null" json:"-"`
	Active       bool      `gorm:"default:true" json:"active"`
	CreatedAt    time.Time `json:"created_at"`
	UpdatedAt    time.Time `json:"updated_at"`
	Roles        []Role    `gorm:"many2many:user_roles;" json:"roles,omitempty"`
}

type Role struct {
	ID          int64          `gorm:"primaryKey" json:"id"`
	Name        string         `gorm:"uniqueIndex;size:64;not null" json:"name"`
	Description string         `gorm:"size:255" json:"description,omitempty"`
	Permissions []Permission   `gorm:"many2many:role_permissions;" json:"permissions,omitempty"`
	CreatedAt   time.Time      `json:"created_at"`
	UpdatedAt   time.Time      `json:"updated_at"`
}

type Permission struct {
	ID   int64  `gorm:"primaryKey" json:"id"`
	Name string `gorm:"uniqueIndex;size:128;not null" json:"name"`
}

type Post struct {
	ID          int64      `gorm:"primaryKey" json:"id"`
	Title       string     `gorm:"size:512;not null" json:"title"`
	Slug        string     `gorm:"uniqueIndex;size:256;not null" json:"slug"`
	Excerpt     string     `gorm:"size:2048" json:"excerpt"`
	CoverURL    string     `gorm:"size:1024" json:"cover_url"`
	Status      string     `gorm:"size:32;default:draft;index" json:"status"` // draft, published
	PublishedAt *time.Time `json:"published_at,omitempty"`
	ContentType string     `gorm:"size:64;default:article;index" json:"content_type"`
	BodyFormat  string     `gorm:"size:32;default:markdown;not null" json:"body_format"`
	BodySource  string     `gorm:"type:text" json:"body_source,omitempty"`
	BodyHTML    string     `gorm:"type:text" json:"body_html,omitempty"`
	CreatedAt   time.Time  `json:"created_at"`
	UpdatedAt   time.Time  `json:"updated_at"`
	Categories  []Category `gorm:"many2many:post_categories;" json:"categories,omitempty"`
	Tags        []Tag      `gorm:"many2many:post_tags;" json:"tags,omitempty"`
}

type Category struct {
	ID        int64     `gorm:"primaryKey" json:"id"`
	Name      string    `gorm:"size:128;not null" json:"name"`
	Slug      string    `gorm:"uniqueIndex;size:128;not null" json:"slug"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
	Posts     []Post    `gorm:"many2many:post_categories;" json:"-"`
}

type Tag struct {
	ID        int64     `gorm:"primaryKey" json:"id"`
	Name      string    `gorm:"size:128;not null" json:"name"`
	Slug      string    `gorm:"uniqueIndex;size:128;not null" json:"slug"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
	Posts     []Post    `gorm:"many2many:post_tags;" json:"-"`
}

type Media struct {
	ID         int64     `gorm:"primaryKey" json:"id"`
	Path       string    `gorm:"size:512;not null" json:"path"`
	URL        string    `gorm:"size:1024;not null" json:"url"`
	MimeType   string    `gorm:"size:128" json:"mime_type"`
	Name       string    `gorm:"size:128;default:''" json:"name"`
	CategoryID *int64    `gorm:"index" json:"category_id,omitempty"`
	Category   *MediaCategory `gorm:"foreignKey:CategoryID;constraint:OnDelete:SET NULL;" json:"category,omitempty"`
	Size       int64     `json:"size"`
	UploaderID int64     `gorm:"index" json:"uploader_id"`
	CreatedAt  time.Time `json:"created_at"`
}

type MediaCategory struct {
	ID        int64     `gorm:"primaryKey" json:"id"`
	Name      string    `gorm:"size:128;not null;uniqueIndex" json:"name"`
	Slug      string    `gorm:"size:128;not null;uniqueIndex" json:"slug"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

type DemoCategory struct {
	ID        int64     `gorm:"primaryKey" json:"id"`
	Name      string    `gorm:"size:128;not null;uniqueIndex" json:"name"`
	Slug      string    `gorm:"size:128;not null;uniqueIndex" json:"slug"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

type Demo struct {
	ID          int64           `gorm:"primaryKey" json:"id"`
	Name        string          `gorm:"size:256;not null" json:"name"`
	Slug        string          `gorm:"uniqueIndex;size:256;not null" json:"slug"`
	Description string          `gorm:"size:2048;default:''" json:"description"`
	CoverURL    string          `gorm:"size:1024;default:''" json:"cover_url"`
	Enabled     bool            `gorm:"default:true;index" json:"enabled"`
	CategoryID  *int64          `gorm:"index" json:"category_id,omitempty"`
	Category    *DemoCategory  `gorm:"foreignKey:CategoryID;constraint:OnDelete:SET NULL;" json:"category,omitempty"`
	EntryDir    string          `gorm:"size:256;default:''" json:"entry_dir"`
	CreatedAt   time.Time       `json:"created_at"`
	UpdatedAt   time.Time       `json:"updated_at"`
}

type ServiceOffer struct {
	ID          int64     `gorm:"primaryKey" json:"id"`
	Name        string    `gorm:"size:256;not null" json:"name"`
	Slug        string    `gorm:"uniqueIndex;size:256;not null" json:"slug"`
	Category    string    `gorm:"size:128;index;default:''" json:"category"`
	PriceText   string    `gorm:"size:128;default:''" json:"price_text"`
	Summary     string    `gorm:"size:2048;default:''" json:"summary"`
	Content     string    `gorm:"type:text" json:"content"`
	CoverURL    string    `gorm:"size:1024;default:''" json:"cover_url"`
	SortOrder   int       `gorm:"default:100;index" json:"sort_order"`
	Featured    bool      `gorm:"default:false;index" json:"featured"`
	Enabled     bool      `gorm:"default:true;index" json:"enabled"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
	ContentHTML string    `gorm:"-" json:"content_html"`
}

// SiteSetting 全站单例（id 固定为 1）：站点名、SEO、Logo、页脚、关于页等
type SiteSetting struct {
	ID int64 `gorm:"primaryKey" json:"id"`

	SiteName        string `gorm:"size:128;default:''" json:"site_name"`
	SiteTagline     string `gorm:"size:256;default:''" json:"site_tagline"`
	MetaDescription string `gorm:"size:512;default:''" json:"meta_description"`
	LogoURL         string `gorm:"size:1024;default:''" json:"logo_url"`
	FooterLine      string `gorm:"size:512;default:''" json:"footer_line"`

	AboutTitle string `gorm:"size:128;default:''" json:"about_title"`
	AboutLead  string `gorm:"size:512;default:''" json:"about_lead"`
	AboutBody  string `gorm:"type:text" json:"about_body"`

	UpdatedAt time.Time `json:"updated_at"`
}

const (
	PostStatusDraft     = "draft"
	PostStatusPublished = "published"
	BodyFormatMarkdown  = "markdown"
	BodyFormatHTML      = "html"
)
