package htmlutil

import (
	"bytes"

	"github.com/microcosm-cc/bluemonday"
	"github.com/yuin/goldmark"
)

var md = goldmark.New()
var sanitizer = bluemonday.UGCPolicy()

func MarkdownToSafeHTML(src string) (string, error) {
	var buf bytes.Buffer
	if err := md.Convert([]byte(src), &buf); err != nil {
		return "", err
	}
	return string(sanitizer.SanitizeBytes(buf.Bytes())), nil
}

func SanitizeHTML(html string) string {
	return sanitizer.Sanitize(html)
}
