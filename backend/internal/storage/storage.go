package storage

import (
	"fmt"
	"io"
	"mime"
	"os"
	"path/filepath"
	"strings"

	"github.com/google/uuid"
)

type Storage interface {
	Save(filenameHint string, contentType string, r io.Reader) (relativePath string, size int64, err error)
	Delete(relativePath string) error
}

type LocalStorage struct {
	RootDir string
}

func NewLocal(root string) (*LocalStorage, error) {
	if err := os.MkdirAll(root, 0o755); err != nil {
		return nil, err
	}
	return &LocalStorage{RootDir: root}, nil
}

func (l *LocalStorage) Save(filenameHint string, contentType string, r io.Reader) (string, int64, error) {
	ext := extFromContentType(contentType, filenameHint)
	sub := uuid.New().String()
	name := sub + ext
	rel := filepath.Join(sub[:2], name)
	full := filepath.Join(l.RootDir, rel)
	if err := os.MkdirAll(filepath.Dir(full), 0o755); err != nil {
		return "", 0, err
	}
	f, err := os.Create(full)
	if err != nil {
		return "", 0, err
	}
	defer f.Close()
	n, err := io.Copy(f, r)
	if err != nil {
		_ = os.Remove(full)
		return "", 0, err
	}
	return filepath.ToSlash(rel), n, nil
}

func (l *LocalStorage) Delete(relativePath string) error {
	rel := filepath.Clean(relativePath)
	full := filepath.Join(l.RootDir, rel)
	if err := os.Remove(full); err != nil {
		// If the file doesn't exist, treat it as already deleted.
		if os.IsNotExist(err) {
			return nil
		}
		return err
	}
	return nil
}

func extFromContentType(ct, hint string) string {
	if exts, _ := mime.ExtensionsByType(ct); len(exts) > 0 {
		return exts[0]
	}
	if i := strings.LastIndex(hint, "."); i >= 0 && i < len(hint)-1 {
		return strings.ToLower(hint[i:])
	}
	return ""
}

func PublicURL(base, relative string) string {
	relative = strings.TrimLeft(relative, "/")
	return fmt.Sprintf("%s/uploads/%s", strings.TrimRight(base, "/"), relative)
}
