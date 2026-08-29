import 'package:flutter/material.dart';
import '../../core/theme/app_theme.dart';

class AiChatScreen extends StatefulWidget {
  const AiChatScreen({super.key});

  @override
  State<AiChatScreen> createState() => _AiChatScreenState();
}

class _AiChatScreenState extends State<AiChatScreen> {
  final TextEditingController _controller = TextEditingController();
  final ScrollController _scrollController = ScrollController();
  bool _isTyping = false;

  final List<Map<String, dynamic>> _messages = [
    {
      'isUser': false,
      'text': 'Kính chào Đạo Hữu! Ta là AI Đạo Hữu của Tiên Tôn Audio. Ta có thể đàm đạo về hệ thống 17 cảnh giới, giải thích công pháp huyền thoại, hoặc tóm tắt các tác phẩm tiên hiệp kinh điển. Hôm nay đạo hữu muốn đàm đạo điều gì?',
      'time': 'Vừa xong',
    }
  ];

  final List<String> _quickPrompts = [
    '✨ Giải thích 17 Cảnh Giới Tu Tiên',
    '⚔️ Gợi ý truyện Tiên Hiệp đỉnh cao',
    '⚡ Làm sao tăng Tu Vi nhanh nhất?',
    '🔮 Tóm tắt công pháp Đại Thừa Kỳ',
  ];

  void _sendMessage(String text) {
    if (text.trim().isEmpty) return;

    setState(() {
      _messages.add({
        'isUser': true,
        'text': text.trim(),
        'time': 'Vừa xong',
      });
      _isTyping = true;
    });

    _controller.clear();
    _scrollToBottom();

    // Giả lập AI phản hồi đàm đạo sau 1 giây
    Future.delayed(const Duration(milliseconds: 1200), () {
      if (!mounted) return;
      String reply = 'Đạo hữu vừa nhắc tới một đạo lý vô cùng thâm sâu! ';
      if (text.contains('Cảnh Giới') || text.contains('cảnh giới')) {
        reply += 'Hệ thống tu chân Tiên Tôn gồm 17 Cảnh Giới chia làm 3 đại tầng: Phàm Giới (Luyện Khí ➔ Đại Thừa), Tiên Giới (Nhân Tiên ➔ Đại La Kim Tiên), và Chí Tôn (Tiên Quân ➔ Tiên Đế đỉnh phong). Đạo hữu nghe audio càng nhiều, linh khí hấp thu càng mạnh mẽ!';
      } else if (text.contains('Truyện') || text.contains('truyện')) {
        reply += 'Hiện tại Bảng Vàng Tiên Vương đang có các tuyệt phẩm như: Phàm Nhân Tu Tiên, Già Thiên, Thôn Phệ Tinh Không. Đạo hữu có thể chọn chất lượng 320kbps để thưởng thức trọn vẹn nhất.';
      } else {
        reply += 'Trong cõi hồng trần mênh mang, muốn đắc đạo phi thăng cần kiên trì "Thính Âm Tụ Khí", kết hợp đan dược VIP để nhân đôi tốc độ đột phá.';
      }

      setState(() {
        _isTyping = false;
        _messages.add({
          'isUser': false,
          'text': reply,
          'time': 'Vừa xong',
        });
      });
      _scrollToBottom();
    });
  }

  void _scrollToBottom() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (_scrollController.hasClients) {
        _scrollController.animateTo(
          _scrollController.position.maxScrollExtent,
          duration: const Duration(milliseconds: 300),
          curve: Curves.easeOut,
        );
      }
    });
  }

  @override
  void dispose() {
    _controller.dispose();
    _scrollController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppTheme.background,
      appBar: AppBar(
        backgroundColor: AppTheme.surface,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios_new_rounded, color: Colors.white, size: 20),
          onPressed: () => Navigator.pop(context),
        ),
        title: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(6),
              decoration: BoxDecoration(
                color: Colors.indigoAccent.withValues(alpha: 0.2),
                borderRadius: BorderRadius.circular(10),
              ),
              child: const Icon(Icons.smart_toy_rounded, color: Colors.indigoAccent, size: 20),
            ),
            const SizedBox(width: 10),
            const Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'AI Đạo Hữu',
                  style: TextStyle(fontSize: 16, fontWeight: FontWeight.w900, color: Colors.white),
                ),
                Text(
                  'Trực tuyến • Trợ lý đàm đạo 24/7',
                  style: TextStyle(fontSize: 10, color: AppTheme.secondary),
                ),
              ],
            ),
          ],
        ),
      ),
      body: Column(
        children: [
          // Danh sách tin nhắn
          Expanded(
            child: ListView.separated(
              controller: _scrollController,
              padding: const EdgeInsets.all(16),
              physics: const BouncingScrollPhysics(),
              itemCount: _messages.length + (_isTyping ? 1 : 0),
              separatorBuilder: (_, __) => const SizedBox(height: 14),
              itemBuilder: (context, index) {
                if (index == _messages.length && _isTyping) {
                  return _buildTypingIndicator();
                }
                final msg = _messages[index];
                return _buildChatBubble(msg['isUser'] as bool, msg['text'] as String);
              },
            ),
          ),

          // Gợi ý câu hỏi nhanh
          Container(
            height: 42,
            margin: const EdgeInsets.only(bottom: 8),
            child: ListView.separated(
              scrollDirection: Axis.horizontal,
              padding: const EdgeInsets.symmetric(horizontal: 16),
              itemCount: _quickPrompts.length,
              separatorBuilder: (_, __) => const SizedBox(width: 8),
              itemBuilder: (context, i) {
                return GestureDetector(
                  onTap: () => _sendMessage(_quickPrompts[i]),
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                    decoration: BoxDecoration(
                      color: AppTheme.surface,
                      borderRadius: BorderRadius.circular(20),
                      border: Border.all(color: Colors.white.withValues(alpha: 0.1)),
                    ),
                    alignment: Alignment.center,
                    child: Text(
                      _quickPrompts[i],
                      style: const TextStyle(fontSize: 11, color: AppTheme.textSecondary),
                    ),
                  ),
                );
              },
            ),
          ),

          // Khung nhập tin nhắn
          Container(
            padding: const EdgeInsets.fromLTRB(16, 8, 16, 24),
            decoration: BoxDecoration(
              color: AppTheme.surface,
              border: Border(top: BorderSide(color: Colors.white.withValues(alpha: 0.05))),
            ),
            child: Row(
              children: [
                Expanded(
                  child: Container(
                    decoration: BoxDecoration(
                      color: Colors.black.withValues(alpha: 0.4),
                      borderRadius: BorderRadius.circular(24),
                      border: Border.all(color: Colors.white.withValues(alpha: 0.1)),
                    ),
                    child: TextField(
                      controller: _controller,
                      style: const TextStyle(fontSize: 13, color: Colors.white),
                      decoration: const InputDecoration(
                        hintText: 'Hỏi AI Đạo Hữu về cốt truyện, công pháp...',
                        hintStyle: TextStyle(fontSize: 12, color: AppTheme.textMuted),
                        contentPadding: EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                        border: InputBorder.none,
                      ),
                      onSubmitted: _sendMessage,
                    ),
                  ),
                ),
                const SizedBox(width: 8),
                GestureDetector(
                  onTap: () => _sendMessage(_controller.text),
                  child: Container(
                    width: 44,
                    height: 44,
                    decoration: BoxDecoration(
                      gradient: AppTheme.goldGradient,
                      shape: BoxShape.circle,
                      boxShadow: AppTheme.glowShadow(AppTheme.primary, opacity: 0.3, blur: 12),
                    ),
                    child: const Icon(Icons.send_rounded, color: Colors.black, size: 20),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildChatBubble(bool isUser, String text) {
    return Align(
      alignment: isUser ? Alignment.centerRight : Alignment.centerLeft,
      child: Container(
        constraints: BoxConstraints(maxWidth: MediaQuery.of(context).size.width * 0.8),
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: isUser ? AppTheme.primary : AppTheme.surface,
          borderRadius: BorderRadius.circular(18).copyWith(
            bottomRight: isUser ? const Radius.circular(4) : const Radius.circular(18),
            bottomLeft: !isUser ? const Radius.circular(4) : const Radius.circular(18),
          ),
          border: isUser ? null : Border.all(color: Colors.white.withValues(alpha: 0.08)),
        ),
        child: Text(
          text,
          style: TextStyle(
            fontSize: 13,
            color: isUser ? Colors.black : Colors.white,
            fontWeight: isUser ? FontWeight.w600 : FontWeight.normal,
            height: 1.45,
          ),
        ),
      ),
    );
  }

  Widget _buildTypingIndicator() {
    return Align(
      alignment: Alignment.centerLeft,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
        decoration: BoxDecoration(
          color: AppTheme.surface,
          borderRadius: BorderRadius.circular(16),
        ),
        child: const Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            SizedBox(
              width: 12,
              height: 12,
              child: CircularProgressIndicator(strokeWidth: 2, color: AppTheme.primary),
            ),
            SizedBox(width: 8),
            Text(
              'AI Đạo Hữu đang ngẫm nghĩ...',
              style: TextStyle(fontSize: 11, color: AppTheme.textSecondary),
            ),
          ],
        ),
      ),
    );
  }
}
