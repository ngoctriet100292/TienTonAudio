package router

import (
	"net/http"
	"os"
	"path/filepath"
	"testing"
)

func TestPublicStorageDoesNotExposeChaptersOrAudio(t *testing.T) {
	dir := t.TempDir()
	fs := publicStorageFileSystem{fs: http.Dir(dir)}
	for _, key := range []string{"stories/audio/sample.mp3", "stories/one/chapters/1.txt", "stories/covers/cover.jpg", "avatars/user.png"} {
		name := filepath.Join(dir, key)
		if err := os.MkdirAll(filepath.Dir(name), 0755); err != nil {
			t.Fatal(err)
		}
		if err := os.WriteFile(name, []byte("test"), 0600); err != nil {
			t.Fatal(err)
		}
		file, err := fs.Open("/" + key)
		protected := key == "stories/audio/sample.mp3" || key == "stories/one/chapters/1.txt"
		if protected && err == nil {
			file.Close()
			t.Fatalf("publicly exposed %s", key)
		}
		if !protected {
			if err != nil {
				t.Fatal(err)
			}
			file.Close()
		}
	}
}
