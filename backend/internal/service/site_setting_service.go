package service

import (
	"errors"

	"github.com/selfblog/backend/internal/domain"
	"github.com/selfblog/backend/internal/pkg/htmlutil"
	"gorm.io/gorm"
)

type SiteSettingService struct {
	db *gorm.DB
}

func NewSiteSettingService(db *gorm.DB) *SiteSettingService {
	return &SiteSettingService{db: db}
}

const defaultAboutBodyMD = `## 你好

这里是**波波技术栈**个人博客：公开站侧重**可读性**与**响应式布局**，同一套页面在宽屏与手机上都会自动调整版式与导航。

后端使用 **Go（Gin + GORM）** 提供文章、Demo、服务等接口；前台使用 **Next.js App Router** 做 SEO 与静态生成友好渲染；后台可用 Ant Design 管理 Markdown 与媒体资源。

## 联系与更多

需要合作或技术咨询，可先查看[服务与报价](/services)；想看我做过的小实验，请访问 [Demo](/demos) 页面。

本地与部署说明见仓库 README 与环境变量配置。
`

func defaultSiteSettingRow() domain.SiteSetting {
	return domain.SiteSetting{
		ID:              1,
		SiteName:        "波波技术栈",
		SiteTagline:     "技术笔记 · 实践与方案",
		MetaDescription: "个人技术博客：文章、方案与实践记录",
		LogoURL:         "",
		FooterLine:      "波波技术栈 · 个人技术博客 · Go + Next.js",
		AboutTitle:      "关于",
		AboutLead:       "波波技术栈 — 全栈实践、写作与可运行原型。",
		AboutBody:       defaultAboutBodyMD,
	}
}

func (s *SiteSettingService) ensureRow() (*domain.SiteSetting, error) {
	var row domain.SiteSetting
	err := s.db.First(&row, 1).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		d := defaultSiteSettingRow()
		if err := s.db.Create(&d).Error; err != nil {
			return nil, err
		}
		return &d, nil
	}
	if err != nil {
		return nil, err
	}
	return &row, nil
}

// Get 管理端：含 Markdown 正文
func (s *SiteSettingService) Get() (*domain.SiteSetting, error) {
	return s.ensureRow()
}

type SiteSettingInput struct {
	SiteName        string
	SiteTagline     string
	MetaDescription string
	LogoURL         string
	FooterLine      string
	AboutTitle      string
	AboutLead       string
	AboutBody       string
}

func (s *SiteSettingService) Update(in SiteSettingInput) (*domain.SiteSetting, error) {
	row, err := s.ensureRow()
	if err != nil {
		return nil, err
	}
	row.SiteName = in.SiteName
	row.SiteTagline = in.SiteTagline
	row.MetaDescription = in.MetaDescription
	row.LogoURL = in.LogoURL
	row.FooterLine = in.FooterLine
	row.AboutTitle = in.AboutTitle
	row.AboutLead = in.AboutLead
	row.AboutBody = in.AboutBody
	if err := s.db.Save(row).Error; err != nil {
		return nil, err
	}
	return row, nil
}

func aboutBodyHTML(md string) string {
	if md == "" {
		return ""
	}
	h, err := htmlutil.MarkdownToSafeHTML(md)
	if err != nil {
		return htmlutil.SanitizeHTML(md)
	}
	return h
}

// PublicPayload 公开接口：不返回原始 about_body，附带渲染后的 HTML
func (s *SiteSettingService) PublicPayload() (map[string]any, error) {
	row, err := s.ensureRow()
	if err != nil {
		return nil, err
	}
	return map[string]any{
		"site_name":         row.SiteName,
		"site_tagline":      row.SiteTagline,
		"meta_description":  row.MetaDescription,
		"logo_url":          row.LogoURL,
		"footer_line":       row.FooterLine,
		"about_title":       row.AboutTitle,
		"about_lead":        row.AboutLead,
		"about_body_html":   aboutBodyHTML(row.AboutBody),
		"updated_at":        row.UpdatedAt,
	}, nil
}
