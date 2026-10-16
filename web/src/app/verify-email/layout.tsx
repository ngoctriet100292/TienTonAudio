import type { Metadata } from 'next';
export const metadata: Metadata = { title: 'Xác thực email', robots: { index: false, follow: false }, referrer: 'no-referrer' };
export default function VerifyEmailLayout({ children }: { children: React.ReactNode }) { return children; }
