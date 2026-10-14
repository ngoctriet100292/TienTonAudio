import { CultivationSpinner } from '@/components/cultivation-spinner';

export default function Loading() {
  return (
    <div className="min-h-[70vh] flex items-center justify-center">
      <CultivationSpinner size="lg" />
    </div>
  );
}
