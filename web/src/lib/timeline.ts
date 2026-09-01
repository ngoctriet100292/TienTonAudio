import { AudioTimelineMarker } from '@/types';

/**
 * Phân tích danh sách mốc thời gian YouTube / Podcast sang danh sách AudioTimelineMarker
 * Hỗ trợ các định dạng:
 * - "00:00 Mở đầu"
 * - "15:30 Bí cảnh Vô Lượng"
 * - "01:15:20 Đột phá Luyện Khí"
 * - "Chương 4: Đại chiến (03:40:00)"
 */
export function parseYouTubeTimestamps(rawText: string): AudioTimelineMarker[] {
  if (!rawText) return [];

  const timeRegex = /(?:(?:(\d{1,2}):)?(\d{1,2}):(\d{2}))/;
  const lines = rawText.split('\n');
  const markers: AudioTimelineMarker[] = [];

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;

    const match = line.match(timeRegex);
    if (!match) continue;

    const fullMatch = match[0];
    const hours = match[1] ? parseInt(match[1], 10) : 0;
    const minutes = parseInt(match[2], 10);
    const seconds = parseInt(match[3], 10);

    const totalSeconds = hours * 3600 + minutes * 60 + seconds;

    let title = line.replace(fullMatch, '').trim();
    // Bỏ các ký tự ngăn cách thông thường
    title = title.replace(/^[()[\]\-–—:.]+|[()[\]\-–—:.]+$/g, '').trim();
    if (!title) {
      title = `Phân đoạn ${fullMatch}`;
    }

    markers.push({
      title,
      start_seconds: totalSeconds,
    });
  }

  // Sắp xếp tăng dần theo thời gian
  return markers.sort((a, b) => a.start_seconds - b.start_seconds);
}

/**
 * Định dạng số giây sang dạng hh:mm:ss hoặc mm:ss
 */
export function formatAudioTime(secs: number): string {
  if (isNaN(secs) || secs < 0) return '0:00';

  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = Math.floor(secs % 60);

  if (h > 0) {
    return `${h}:${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
  }
  return `${m}:${s < 10 ? '0' : ''}${s}`;
}

/**
 * Tìm mốc thời gian đang phát hiện tại dựa trên currentTime
 */
export function getCurrentMarker(
  markers: AudioTimelineMarker[] = [],
  currentTime: number
): { marker: AudioTimelineMarker; index: number } | null {
  if (!markers || markers.length === 0) return null;

  for (let i = markers.length - 1; i >= 0; i--) {
    if (currentTime >= markers[i].start_seconds) {
      return { marker: markers[i], index: i };
    }
  }

  return { marker: markers[0], index: 0 };
}
