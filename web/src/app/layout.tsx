import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/context/auth-context";
import { AudioProvider } from "@/context/audio-context";
import { AmbientAudioProvider } from "@/context/ambient-audio-context";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { StickyAudioPlayer } from "@/components/audio-player";
import { BottomTabBar } from "@/components/bottom-tab-bar";
import { AmbientSoundModal } from "@/components/ambient-sound-modal";
import { PwaInstallPrompt } from "@/components/pwa-install-prompt";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "https://tientonaudio.com"),
  title: {
    default: "Tiên Tôn Audio - Nghe Truyện Tiên Hiệp & Tiểu Thuyết Chuẩn Studio 320kbps",
    template: "%s | Tiên Tôn Audio",
  },
  description: "Trang nghe truyện audio và đọc tiểu thuyết tiên hiệp, huyền huyễn, kiếm hiệp chuẩn chất lượng cao 320kbps. Giọng đọc MC truyền cảm, trợ lý AI Đạo Hữu giải đáp cốt truyện.",
  keywords: [
    "tiên tôn audio",
    "nghe truyen audio",
    "truyen tien hiep audio",
    "truyen huyen huyen audio",
    "audiobook tien hiep",
    "pham nhan tu tien audio",
    "vo luyen dinh phong audio",
    "truyen audio 320kbps"
  ],
  authors: [{ name: "IREAKING", url: "https://github.com/IREAKING" }],
  creator: "IREAKING",
  publisher: "Tiên Tôn Audio",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  openGraph: {
    type: "website",
    locale: "vi_VN",
    url: "https://tientonaudio.com",
    title: "Tiên Tôn Audio - Thế Giới Truyện Audio Tiên Hiệp Đỉnh Cao",
    description: "Thưởng thức kho tàng truyện audio tiên hiệp, huyền huyễn chất lượng cao 320kbps. Đọc truyện mượt mà với AI Đạo Hữu.",
    siteName: "Tiên Tôn Audio",
    images: [
      {
        url: "/og-banner.jpg",
        width: 1200,
        height: 630,
        alt: "Tiên Tôn Audio - Nghe Truyện Tiên Hiệp Đỉnh Cao",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Tiên Tôn Audio - Nghe Truyện Tiên Hiệp Đỉnh Cao",
    description: "Nền tảng nghe truyện audio chuẩn 320kbps và đọc tiểu thuyết với AI Đạo Hữu.",
    images: ["/og-banner.jpg"],
  },
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Tiên Tôn Audio",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Schema Structured Data (JSON-LD) cho Google Rich Snippets
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "name": "Tiên Tôn Audio",
    "url": "https://tientonaudio.com",
    "potentialAction": {
      "@type": "SearchAction",
      "target": "https://tientonaudio.com/search?q={search_term_string}",
      "query-input": "required name=search_term_string"
    },
    "description": "Nền tảng nghe truyện audio và đọc tiểu thuyết tiên hiệp, huyền huyễn chất lượng cao."
  };

  return (
    <html lang="vi" className="dark">
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body className="min-h-screen bg-[#070a11] text-slate-100 antialiased flex flex-col selection:bg-amber-500 selection:text-black">
        <AuthProvider>
          <AudioProvider>
            <AmbientAudioProvider>
              <Navbar />
              <main className="flex-1 pb-32 md:pb-24">{children}</main>
              <StickyAudioPlayer />
              <BottomTabBar />
              <Footer />
              <AmbientSoundModal />
              <PwaInstallPrompt />
            </AmbientAudioProvider>
          </AudioProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
