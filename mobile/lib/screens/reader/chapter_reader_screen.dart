import 'package:flutter/material.dart';
import '../../core/theme/app_theme.dart';
import '../../data/models/chapter_model.dart';
import '../../data/models/story_model.dart';

class ChapterReaderScreen extends StatefulWidget {
  final Story story;
  final Chapter chapter;
  final List<Chapter> allChapters;

  const ChapterReaderScreen({
    super.key,
    required this.story,
    required this.chapter,
    required this.allChapters,
  });

  @override
  State<ChapterReaderScreen> createState() => _ChapterReaderScreenState();
}

class _ChapterReaderScreenState extends State<ChapterReaderScreen> {
  late Chapter _currentChapter;
  double _fontSize = 17.0;
  int _themeIndex = 0; // 0: Dark, 1: Sepia, 2: Black

  final List<Color> _bgColors = [
    const Color(0xFF0F172A),
    const Color(0xFF2B241A),
    const Color(0xFF05070C),
  ];

  final List<Color> _textColors = [
    const Color(0xFFE2E8F0),
    const Color(0xFFF2E6D8),
    const Color(0xFFF1F5F9),
  ];

  @override
  void initState() {
    super.initState();
    _currentChapter = widget.chapter;
  }

  int get _currentIndex => widget.allChapters.indexWhere((c) => c.id == _currentChapter.id);
  Chapter? get _prevChapter => _currentIndex > 0 ? widget.allChapters[_currentIndex - 1] : null;
  Chapter? get _nextChapter =>
      (_currentIndex >= 0 && _currentIndex < widget.allChapters.length - 1)
          ? widget.allChapters[_currentIndex + 1]
          : null;

  @override
  Widget build(BuildContext context) {
    final bgColor = _bgColors[_themeIndex];
    final textColor = _textColors[_themeIndex];
    final content = _currentChapter.content ?? 'Nội dung chương đang được cập nhật...';

    return Scaffold(
      backgroundColor: bgColor,
      appBar: AppBar(
        backgroundColor: bgColor,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios_new_rounded, size: 20, color: AppTheme.textPrimary),
          onPressed: () => Navigator.pop(context),
        ),
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              widget.story.title,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: const TextStyle(fontSize: 13, color: AppTheme.textMuted),
            ),
            Text(
              _currentChapter.title,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: const TextStyle(fontSize: 15, fontWeight: FontWeight.bold, color: AppTheme.primary),
            ),
          ],
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.format_size_rounded, color: AppTheme.textSecondary),
            onPressed: _showSettingsSheet,
          ),
        ],
      ),
      body: SafeArea(
        child: Column(
          children: [
            Expanded(
              child: SingleChildScrollView(
                padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Center(
                      child: Text(
                        _currentChapter.title,
                        textAlign: TextAlign.center,
                        style: const TextStyle(
                          fontSize: 20,
                          fontWeight: FontWeight.w900,
                          color: AppTheme.primary,
                        ),
                      ),
                    ),
                    const SizedBox(height: 8),
                    const Divider(color: Colors.white10),
                    const SizedBox(height: 16),
                    SelectableText(
                      content,
                      style: TextStyle(
                        fontSize: _fontSize,
                        height: 1.85,
                        letterSpacing: 0.2,
                        color: textColor,
                      ),
                    ),
                    const SizedBox(height: 32),
                  ],
                ),
              ),
            ),
            // Bottom Bar Điều Hướng Chương
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
              decoration: BoxDecoration(
                color: bgColor,
                border: const Border(top: BorderSide(color: Colors.white10, width: 0.8)),
              ),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  TextButton.icon(
                    onPressed: _prevChapter != null
                        ? () {
                            setState(() {
                              _currentChapter = _prevChapter!;
                            });
                          }
                        : null,
                    icon: const Icon(Icons.arrow_back_rounded, size: 16),
                    label: const Text('Chương Trước'),
                    style: TextButton.styleFrom(
                      foregroundColor: _prevChapter != null ? AppTheme.textPrimary : Colors.white24,
                    ),
                  ),
                  Text(
                    '${_currentIndex + 1} / ${widget.allChapters.length}',
                    style: const TextStyle(fontSize: 12, color: AppTheme.textMuted, fontWeight: FontWeight.bold),
                  ),
                  TextButton.icon(
                    onPressed: _nextChapter != null
                        ? () {
                            setState(() {
                              _currentChapter = _nextChapter!;
                            });
                          }
                        : null,
                    icon: const Icon(Icons.arrow_forward_rounded, size: 16),
                    label: const Text('Chương Sau'),
                    style: TextButton.styleFrom(
                      foregroundColor: _nextChapter != null ? AppTheme.primary : Colors.white24,
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  void _showSettingsSheet() {
    showModalBottomSheet(
      context: context,
      backgroundColor: AppTheme.surface,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (context) {
        return StatefulBuilder(
          builder: (context, setSheetState) {
            return Padding(
              padding: const EdgeInsets.all(20),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    'Cài Đặt Đọc Truyện',
                    style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: AppTheme.textPrimary),
                  ),
                  const SizedBox(height: 20),
                  // Cỡ chữ
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text('Cỡ chữ', style: TextStyle(color: AppTheme.textSecondary)),
                      Row(
                        children: [
                          IconButton(
                            onPressed: () {
                              if (_fontSize > 13) {
                                setState(() => _fontSize -= 1);
                                setSheetState(() {});
                              }
                            },
                            icon: const Icon(Icons.remove_circle_outline, color: AppTheme.primary),
                          ),
                          Text('${_fontSize.toInt()} px', style: const TextStyle(color: AppTheme.textPrimary, fontWeight: FontWeight.bold)),
                          IconButton(
                            onPressed: () {
                              if (_fontSize < 30) {
                                setState(() => _fontSize += 1);
                                setSheetState(() {});
                              }
                            },
                            icon: const Icon(Icons.add_circle_outline, color: AppTheme.primary),
                          ),
                        ],
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),
                  // Màu nền
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text('Màu nền', style: TextStyle(color: AppTheme.textSecondary)),
                      Row(
                        children: List.generate(3, (index) {
                          final labels = ['Tối', 'Cổ', 'Đen'];
                          final isSelected = _themeIndex == index;
                          return Padding(
                            padding: const EdgeInsets.only(left: 8),
                            child: ChoiceChip(
                              label: Text(labels[index]),
                              selected: isSelected,
                              onSelected: (_) {
                                setState(() => _themeIndex = index);
                                setSheetState(() {});
                              },
                              selectedColor: AppTheme.primary,
                              backgroundColor: AppTheme.surfaceLight,
                              labelStyle: TextStyle(
                                color: isSelected ? Colors.black : Colors.white,
                                fontWeight: FontWeight.bold,
                                fontSize: 12,
                              ),
                            ),
                          );
                        }),
                      ),
                    ],
                  ),
                ],
              ),
            );
          },
        );
      },
    );
  }
}
