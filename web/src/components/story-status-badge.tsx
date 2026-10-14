import { StoryStatus } from '@/types';
import { CheckCircle2, Clock, PauseCircle } from 'lucide-react';

interface Props {
  status: StoryStatus | string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function StoryStatusBadge({ status, size = 'sm', className = '' }: Props) {
  let label = 'Còn tiếp';
  let badgeStyle = 'bg-amber-500/20 text-amber-300 border-amber-500/40';
  let Icon = Clock;

  switch (status) {
    case 'completed':
      label = 'Hoàn thành';
      badgeStyle = 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40';
      Icon = CheckCircle2;
      break;
    case 'paused':
    case 'dropped':
      label = 'Tạm ngưng';
      badgeStyle = 'bg-rose-500/20 text-rose-300 border-rose-500/40';
      Icon = PauseCircle;
      break;
    case 'ongoing':
    default:
      label = 'Còn tiếp';
      badgeStyle = 'bg-amber-500/20 text-amber-300 border-amber-500/40';
      Icon = Clock;
      break;
  }

  const sizeClasses = {
    sm: 'text-[11px] px-2 py-0.5 gap-1',
    md: 'text-xs px-2.5 py-1 gap-1.5',
    lg: 'text-sm px-3.5 py-1.5 gap-2',
  }[size];

  const iconSizes = {
    sm: 'w-3 h-3',
    md: 'w-3.5 h-3.5',
    lg: 'w-4 h-4',
  }[size];

  return (
    <span
      className={`inline-flex items-center rounded-full font-bold border backdrop-blur-md shadow-sm uppercase tracking-wider ${sizeClasses} ${badgeStyle} ${className}`}
    >
      <Icon className={iconSizes} />
      <span>{label}</span>
    </span>
  );
}
