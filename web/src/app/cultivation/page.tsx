import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowDown, Headphones } from 'lucide-react';
import { CultivationInteractiveView } from '@/components/cultivation-view';
import { EditorialCTA, EditorialHero, EditorialShell } from '@/components/editorial';

export const metadata: Metadata = {
  title: '17 cảnh giới tu tiên | Tiên Tôn Audio',
  description: 'Khám phá bản đồ 17 cảnh giới tu tiên, theo dõi tu vi và thử nhịp tu luyện của bạn.',
};

export default function CultivationPage() {
  return <EditorialShell label="Cảnh giới tu tiên">
    <EditorialHero eyebrow="MỖI CÂU CHUYỆN, MỘT BƯỚC TIẾN" title="Lắng nghe nhân gian." accent="Chạm đến tiên giới." description="Từ Luyện Khí đến Tiên Đế, 17 cảnh giới mở ra một hành trình dành riêng cho bạn. Khám phá tiên lộ, tìm hiểu từng mốc tu vi và chọn nhịp tu luyện của mình." variant="realm">
      <Link href="#realm-map" className="editorial-button">Khám phá 17 cảnh giới <ArrowDown size={17} /></Link>
      <Link href="/categories" className="editorial-button-secondary"><Headphones size={17} />Bắt đầu nghe</Link>
    </EditorialHero>
    <CultivationInteractiveView />
    <EditorialCTA title="Tiên lộ bắt đầu từ một câu chuyện." />
  </EditorialShell>;
}
