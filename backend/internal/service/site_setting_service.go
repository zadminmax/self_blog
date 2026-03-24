package service

import (
	"errors"
	"strings"

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

		HomeHeroTitle:            "文章、Demo 与技术服务，一套界面多端适配",
		HomeHeroLead:             "聚焦可落地的方案与可运行的示例，数据来自自建 API；首页展示最新文章摘要、精选 Demo 与报价服务入口。",
		HomeHeroBtnPosts:         "全部文章",
		HomeHeroBtnDemos:         "浏览 Demo",
		HomeSidebarNavTitle:      "站内导览",
		HomeSectionTagsTitle:     "标签与分类",
		HomeSectionTagsHint:      "点击可筛选文章列表",
		HomeSectionPostsTitle:    "最新文章",
		HomeSectionPostsMore:     "查看全部",
		HomeSectionDemosTitle:    "精选 Demo",
		HomeSectionDemosMore:     "全部 Demo",
		HomeSectionServicesTitle: "服务内容",
		HomeSectionServicesSub:   "按后台排序展示前 6 项，完整说明见服务页",
		HomeSectionServicesMore:  "服务与报价",
		HomePromoTitle:           "需要定制开发或技术咨询？",
		HomePromoLead:            "查看报价与交付说明，或通过关于页了解背景与联系方式（可按你的实际业务再扩展）。",
		HomePromoBtnServices:     "查看服务报价",
		HomePromoBtnAbout:      "关于我",
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

// Get 管理端：含 Markdown 正文（库内原始值）
func (s *SiteSettingService) Get() (*domain.SiteSetting, error) {
	return s.ensureRow()
}

// GetForAdmin 管理端展示：首页等字段在库为空时填入内置默认，便于直接修改后保存
func (s *SiteSettingService) GetForAdmin() (*domain.SiteSetting, error) {
	row, err := s.ensureRow()
	if err != nil {
		return nil, err
	}
	d := defaultSiteSettingRow()
	out := *row
	pickPtr := func(dst *string, def string) {
		if strings.TrimSpace(*dst) == "" {
			*dst = def
		}
	}
	pickPtr(&out.HomeHeroTitle, d.HomeHeroTitle)
	pickPtr(&out.HomeHeroLead, d.HomeHeroLead)
	pickPtr(&out.HomeHeroBtnPosts, d.HomeHeroBtnPosts)
	pickPtr(&out.HomeHeroBtnDemos, d.HomeHeroBtnDemos)
	pickPtr(&out.HomeSidebarNavTitle, d.HomeSidebarNavTitle)
	pickPtr(&out.HomeSectionTagsTitle, d.HomeSectionTagsTitle)
	pickPtr(&out.HomeSectionTagsHint, d.HomeSectionTagsHint)
	pickPtr(&out.HomeSectionPostsTitle, d.HomeSectionPostsTitle)
	pickPtr(&out.HomeSectionPostsMore, d.HomeSectionPostsMore)
	pickPtr(&out.HomeSectionDemosTitle, d.HomeSectionDemosTitle)
	pickPtr(&out.HomeSectionDemosMore, d.HomeSectionDemosMore)
	pickPtr(&out.HomeSectionServicesTitle, d.HomeSectionServicesTitle)
	pickPtr(&out.HomeSectionServicesSub, d.HomeSectionServicesSub)
	pickPtr(&out.HomeSectionServicesMore, d.HomeSectionServicesMore)
	pickPtr(&out.HomePromoTitle, d.HomePromoTitle)
	pickPtr(&out.HomePromoLead, d.HomePromoLead)
	pickPtr(&out.HomePromoBtnServices, d.HomePromoBtnServices)
	pickPtr(&out.HomePromoBtnAbout, d.HomePromoBtnAbout)
	return &out, nil
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

	HomeHeroTitle            string
	HomeHeroLead             string
	HomeHeroBtnPosts         string
	HomeHeroBtnDemos         string
	HomeSidebarNavTitle      string
	HomeSectionTagsTitle     string
	HomeSectionTagsHint      string
	HomeSectionPostsTitle    string
	HomeSectionPostsMore     string
	HomeSectionDemosTitle    string
	HomeSectionDemosMore     string
	HomeSectionServicesTitle string
	HomeSectionServicesSub   string
	HomeSectionServicesMore  string
	HomePromoTitle           string
	HomePromoLead            string
	HomePromoBtnServices     string
	HomePromoBtnAbout        string
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
	row.HomeHeroTitle = in.HomeHeroTitle
	row.HomeHeroLead = in.HomeHeroLead
	row.HomeHeroBtnPosts = in.HomeHeroBtnPosts
	row.HomeHeroBtnDemos = in.HomeHeroBtnDemos
	row.HomeSidebarNavTitle = in.HomeSidebarNavTitle
	row.HomeSectionTagsTitle = in.HomeSectionTagsTitle
	row.HomeSectionTagsHint = in.HomeSectionTagsHint
	row.HomeSectionPostsTitle = in.HomeSectionPostsTitle
	row.HomeSectionPostsMore = in.HomeSectionPostsMore
	row.HomeSectionDemosTitle = in.HomeSectionDemosTitle
	row.HomeSectionDemosMore = in.HomeSectionDemosMore
	row.HomeSectionServicesTitle = in.HomeSectionServicesTitle
	row.HomeSectionServicesSub = in.HomeSectionServicesSub
	row.HomeSectionServicesMore = in.HomeSectionServicesMore
	row.HomePromoTitle = in.HomePromoTitle
	row.HomePromoLead = in.HomePromoLead
	row.HomePromoBtnServices = in.HomePromoBtnServices
	row.HomePromoBtnAbout = in.HomePromoBtnAbout
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
	d := defaultSiteSettingRow()
	heroTitle := row.HomeHeroTitle
	if strings.TrimSpace(heroTitle) == "" {
		heroTitle = d.HomeHeroTitle
	}
	heroLead := row.HomeHeroLead
	if strings.TrimSpace(heroLead) == "" {
		heroLead = d.HomeHeroLead
	}
	pick := func(v, def string) string {
		if strings.TrimSpace(v) == "" {
			return def
		}
		return v
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

		"home_hero_title":              heroTitle,
		"home_hero_lead":               heroLead,
		"home_hero_btn_posts":          pick(row.HomeHeroBtnPosts, d.HomeHeroBtnPosts),
		"home_hero_btn_demos":          pick(row.HomeHeroBtnDemos, d.HomeHeroBtnDemos),
		"home_sidebar_nav_title":       pick(row.HomeSidebarNavTitle, d.HomeSidebarNavTitle),
		"home_section_tags_title":      pick(row.HomeSectionTagsTitle, d.HomeSectionTagsTitle),
		"home_section_tags_hint":       pick(row.HomeSectionTagsHint, d.HomeSectionTagsHint),
		"home_section_posts_title":     pick(row.HomeSectionPostsTitle, d.HomeSectionPostsTitle),
		"home_section_posts_more":      pick(row.HomeSectionPostsMore, d.HomeSectionPostsMore),
		"home_section_demos_title":     pick(row.HomeSectionDemosTitle, d.HomeSectionDemosTitle),
		"home_section_demos_more":      pick(row.HomeSectionDemosMore, d.HomeSectionDemosMore),
		"home_section_services_title":  pick(row.HomeSectionServicesTitle, d.HomeSectionServicesTitle),
		"home_section_services_sub":    pick(row.HomeSectionServicesSub, d.HomeSectionServicesSub),
		"home_section_services_more":   pick(row.HomeSectionServicesMore, d.HomeSectionServicesMore),
		"home_promo_title":             pick(row.HomePromoTitle, d.HomePromoTitle),
		"home_promo_lead":              pick(row.HomePromoLead, d.HomePromoLead),
		"home_promo_btn_services":      pick(row.HomePromoBtnServices, d.HomePromoBtnServices),
		"home_promo_btn_about":         pick(row.HomePromoBtnAbout, d.HomePromoBtnAbout),
	}, nil
}
