import type { ImageProps } from 'next/image';
import Image from 'next/image';

type MediaImageProps = Omit<ImageProps, 'src'> & { src?: ImageProps['src'] };

// Optimize approved sources, and still support uploaded avatars on other origins.
export function MediaImage({ width = 512, height = 512, unoptimized, alt, src = '/placeholder-cover.svg', ...props }: MediaImageProps) {
  let approved = typeof src !== 'string' || src.startsWith('/');
  if (typeof src === 'string' && src.startsWith('https://')) {
    try {
      const hostname = new URL(src).hostname;
      approved = hostname === 'images.unsplash.com' || hostname.endsWith('.r2.dev') || hostname.endsWith('.googleusercontent.com');
    } catch { approved = false; }
  }
  return <Image {...props} alt={alt} src={src} width={props.fill ? undefined : width} height={props.fill ? undefined : height} unoptimized={unoptimized ?? !approved} />;
}
