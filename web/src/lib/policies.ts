export type PolicySection = { id: string; title: string; paragraphs: string[]; bullets?: string[] };
export type PolicyDocument = { slug: string; label: string; eyebrow: string; title: string; accent: string; description: string; sections: PolicySection[] };

export const policyDocuments: PolicyDocument[] = [
  {
    slug: 'privacy', label: 'Bảo mật & dữ liệu', eyebrow: 'DỮ LIỆU CỦA BẠN', title: 'Trải nghiệm riêng tư.', accent: 'Thông tin rõ ràng.',
    description: 'Tìm hiểu những dữ liệu phục vụ tài khoản, tiến độ nghe và các tính năng bạn sử dụng trên Tiên Tôn Audio.',
    sections: [
      { id: 'account', title: 'Thông tin tài khoản', paragraphs: ['Khi đăng ký và sử dụng tài khoản, hệ thống xử lý tên người dùng, địa chỉ email và thông tin hồ sơ bạn cung cấp. Mật khẩu được lưu dưới dạng băm, không phải văn bản thuần.'], bullets: ['Thông tin hồ sơ giúp hiển thị tên và hình đại diện trong cộng đồng.', 'Email phục vụ đăng nhập, xác thực và khôi phục tài khoản.'] },
      { id: 'activity', title: 'Tiến độ nghe và hoạt động', paragraphs: ['Lịch sử nghe, vị trí chương, tủ truyện và tu vi giúp bạn tiếp tục trải nghiệm và theo dõi hoạt động của mình. Bài viết, bình luận và đánh giá bạn đăng có thể được hiển thị cho người dùng khác.'], bullets: ['Không đưa thông tin riêng tư của mình hoặc người khác vào nội dung công khai.', 'Chỉ chia sẻ thông tin bạn muốn xuất hiện cùng hồ sơ cộng đồng.'] },
      { id: 'browser', title: 'Dữ liệu lưu trong trình duyệt', paragraphs: ['Web sử dụng bộ nhớ trình duyệt để duy trì phiên đăng nhập và ghi nhớ một số lựa chọn như tốc độ phát hoặc âm lượng. Khi đăng xuất, thông tin phiên đăng nhập được xóa khỏi bộ nhớ ứng dụng. Xóa dữ liệu trình duyệt có thể làm mất các tùy chọn lưu trên thiết bị.'] },
      { id: 'services', title: 'Hạ tầng và thanh toán', paragraphs: ['Database và dịch vụ lưu trữ file phục vụ vận hành nền tảng. Khi mua hội viên, hệ thống lưu thông tin đơn hàng, số tiền và trạng thái giao dịch để kiểm tra và kích hoạt quyền truy cập. Không gửi mật khẩu ngân hàng, mã OTP hoặc thông tin thẻ trong nội dung hỗ trợ.'] },
      { id: 'requests', title: 'Yêu cầu về dữ liệu', paragraphs: ['Bạn có thể chỉnh sửa những thông tin hồ sơ được hỗ trợ tại trang Cài đặt. Với yêu cầu kiểm tra, chỉnh sửa hoặc xóa dữ liệu khác, hãy liên hệ kèm email của tài khoản và mô tả yêu cầu. Việc xác minh tài khoản có thể cần thiết để tránh xử lý yêu cầu của người không có quyền.'] },
      { id: 'contact', title: 'Trao đổi với chúng tôi', paragraphs: ['Nếu bạn có câu hỏi về dữ liệu cá nhân hoặc nhận thấy vấn đề trong tài khoản, gửi thông tin tới support@tientonaudio.com. Không đưa mật khẩu hay mã xác thực vào email.'] },
    ],
  },
  {
    slug: 'terms', label: 'Điều khoản sử dụng', eyebrow: 'CÙNG XÂY DỰNG MỘT KHÔNG GIAN TỐT', title: 'Thưởng thức tự do.', accent: 'Sử dụng có trách nhiệm.',
    description: 'Những nguyên tắc chung khi sử dụng tài khoản, thưởng thức nội dung và tham gia cộng đồng Tiên Tôn Audio.',
    sections: [
      { id: 'service', title: 'Phạm vi dịch vụ', paragraphs: ['Tiên Tôn Audio cung cấp các tính năng nghe audio, đọc nội dung truyện và tương tác cộng đồng. Danh mục tác phẩm, chất lượng audio và khả năng truy cập phụ thuộc vào nội dung và trạng thái hiện có trên hệ thống.'] },
      { id: 'account', title: 'Tài khoản và bảo vệ phiên đăng nhập', paragraphs: ['Sử dụng thông tin tài khoản chính xác và giữ bí mật mật khẩu của bạn. Bạn chịu trách nhiệm với nội dung và hoạt động do mình thực hiện qua tài khoản. Nếu phát hiện truy cập bất thường, hãy thay đổi mật khẩu và liên hệ hỗ trợ.'], bullets: ['Không chia sẻ mã xác thực hoặc thông tin đăng nhập.', 'Không mạo danh cá nhân, tác giả, người đọc hay đội ngũ vận hành.'] },
      { id: 'content', title: 'Sử dụng nội dung', paragraphs: ['Tác phẩm, bản dịch, bản thu âm và các nội dung liên quan có quyền sở hữu riêng. Khả năng nghe hoặc đọc trên nền tảng không đồng nghĩa với quyền sao chép, đăng lại, phân phối hoặc sử dụng thương mại. Khi đóng góp nội dung, hãy bảo đảm bạn có quyền sử dụng phù hợp.'] },
      { id: 'community', title: 'Nguyên tắc cộng đồng', paragraphs: ['Trao đổi về tác phẩm một cách tôn trọng. Nội dung vi phạm có thể được báo cáo để đội ngũ vận hành xem xét.'], bullets: ['Không quấy rối, đe dọa hoặc công khai thông tin riêng tư của người khác.', 'Không đăng spam, liên kết lừa đảo hoặc nội dung mạo danh.', 'Không cố ý khai thác lỗi, vượt kiểm tra quyền truy cập hoặc thao túng hoạt động tài khoản.'] },
      { id: 'membership', title: 'Hội viên và giao dịch', paragraphs: ['Giá, thời hạn và quyền lợi của gói hội viên được hiển thị tại trang VIP trước khi bạn tạo đơn. Quyền truy cập premium được kích hoạt sau khi giao dịch được xác nhận; tạo đơn hoặc mở mã thanh toán chưa đồng nghĩa với thanh toán thành công. Nếu có vấn đề, gửi mã đơn và bằng chứng giao dịch tới hỗ trợ để được kiểm tra.'] },
      { id: 'support', title: 'Thay đổi và hỗ trợ', paragraphs: ['Tính năng hoặc nội dung có thể được điều chỉnh trong quá trình vận hành. Nếu gặp lỗi, tranh chấp về tài khoản hoặc cần làm rõ điều khoản, hãy liên hệ hỗ trợ với thông tin cụ thể về trường hợp của bạn.'] },
    ],
  },
  {
    slug: 'copyright', label: 'Bản quyền nội dung', eyebrow: 'TÔN TRỌNG NGƯỜI SÁNG TẠO', title: 'Mỗi tác phẩm', accent: 'đều có người đứng sau.',
    description: 'Một kênh rõ ràng để tác giả, dịch giả, đơn vị xuất bản và chủ sở hữu bản thu âm trao đổi về nội dung trên nền tảng.',
    sections: [
      { id: 'respect', title: 'Tôn trọng quyền sử dụng tác phẩm', paragraphs: ['Một câu chuyện có thể gắn với nhiều phần đóng góp: nguyên tác, bản dịch, giọng đọc, âm nhạc và hình ảnh. Người đăng cần bảo đảm phạm vi quyền sử dụng phù hợp cho nội dung mình cung cấp.'] },
      { id: 'prepare', title: 'Thông tin cần chuẩn bị', paragraphs: ['Để đội ngũ vận hành xác định đúng nội dung và người gửi yêu cầu, vui lòng chuẩn bị:'], bullets: ['Tên người gửi, đơn vị đại diện nếu có và email liên hệ.', 'Tên tác phẩm hoặc bản thu âm cùng tài liệu thể hiện quyền sở hữu / quyền đại diện.', 'Đường dẫn cụ thể của truyện, chương hoặc file cần xem xét.', 'Mô tả phần nội dung liên quan và đề nghị xử lý của bạn.'] },
      { id: 'send', title: 'Gửi yêu cầu xem xét', paragraphs: ['Gửi email tới support@tientonaudio.com với tiêu đề “Yêu cầu bản quyền — [Tên tác phẩm]”. Có thể đính kèm tài liệu và ảnh chụp màn hình cần thiết. Không gửi tài liệu riêng tư không liên quan tới yêu cầu.'] },
      { id: 'review', title: 'Quá trình xem xét', paragraphs: ['Yêu cầu cần được kiểm tra dựa trên đường dẫn, nội dung và tài liệu bạn cung cấp. Đội ngũ vận hành có thể cần thêm thông tin hoặc trao đổi với bên đăng nội dung để làm rõ trước khi đưa ra hướng xử lý.'] },
      { id: 'contributor', title: 'Nếu bạn là người đăng nội dung', paragraphs: ['Hãy lưu lại tài liệu về quyền sử dụng tác phẩm và bản thu âm. Khi nhận được yêu cầu liên quan, cung cấp thông tin đúng phạm vi và tránh đăng lại nội dung đang được xem xét bằng đường dẫn khác.'] },
    ],
  },
];
