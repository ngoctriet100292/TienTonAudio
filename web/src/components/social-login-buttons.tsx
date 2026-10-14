'use client';

interface Props {
  loading?: boolean;
}

export function SocialLoginButtons({ loading = false }: Props) {
  return <p aria-busy={loading} className="mt-4 text-center text-xs text-slate-400">Đăng nhập mạng xã hội chưa khả dụng. Vui lòng dùng email và mật khẩu.</p>;
}
