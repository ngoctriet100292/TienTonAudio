import { REALM_COUNT } from '@/lib/cultivation';
import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowDown, Headphones } from 'lucide-react';
import { CultivationInteractiveView } from '@/components/cultivation-view';
import { EditorialCTA, EditorialHero, EditorialShell } from '@/components/editorial';

export const metadata: Metadata = {
  title: `${REALM_COUNT} cảnh giới Võ Đạo, Tu Tiên và Tiên Giới | Tiên Tôn Audio`,
  description: `Khám phá ${REALM_COUNT} cảnh giới từ Phàm Nhân, Hậu Thiên, Tiên Thiên đến Kết Đan và Tiên Đế. Theo dõi tu vi với ngưỡng EXP mới.`,
};

export default function CultivationPage() {
  return <EditorialShell label="Cảnh giới tu tiên">
    <EditorialHero eyebrow="MỖI CÂU CHUYỆN, MỘT BƯỚC TIẾN" title="Lắng nghe nhân gian." accent="Chạm đến tiên giới." description={`Từ Hậu Thiên, Tiên Thiên và Lục Địa Thần Tiên, bước vào Tu Tiên rồi phi thăng Tiên Giới. ${REALM_COUNT} cảnh giới mở ra một hành trình dài hơn, với Kết Đan và những mốc tu vi mới.`} variant="realm">
      <Link href="#realm-map" className="editorial-button">Khám phá {REALM_COUNT} cảnh giới <ArrowDown size={17} /></Link>
      <Link href="/categories" className="editorial-button-secondary"><Headphones size={17} />Bắt đầu nghe</Link>
    </EditorialHero>
    <CultivationInteractiveView />
    <EditorialCTA title="Tiên lộ bắt đầu từ một câu chuyện." />
  </EditorialShell>;
}
