'use client';

import { useEffect, useRef, type ReactNode } from 'react';
import { usePathname } from 'next/navigation';

const targets = '.motion-page > * > :first-child, section, .glass-card, .motion-card, .grid > a, .grid > article, .grid > button, .grid > div, [data-motion-item]';
const excluded = '.editorial-shell, .reveal, .reader-prose, [data-motion-skip], [role="dialog"], [aria-live], .fixed, .sticky, .animate-in';

export function PageMotion({ children }: { children: ReactNode }) {
  const root = useRef<HTMLDivElement>(null);
  const pathname = usePathname();

  useEffect(() => {
    const container = root.current;
    if (!container || !('IntersectionObserver' in window)) return;

    const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
    const registered = new WeakSet<HTMLElement>();
    const running = new Set<Animation>();
    let frame = 0;

    const observer = new IntersectionObserver(entries => {
      let index = 0;
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        const element = entry.target as HTMLElement;
        observer.unobserve(element);
        if (preference.matches || !element.isConnected || typeof element.animate !== 'function') continue;
        // Separate translate from transform so existing hover effects still work.
        const animation = element.animate([
          { opacity: 0, translate: '0 16px' },
          { opacity: 1, translate: '0 0' },
        ], {
          duration: 520,
          delay: Math.min(index++ * 45, 180),
          easing: 'cubic-bezier(0.16, 1, 0.3, 1)',
          fill: 'backwards',
        });
        running.add(animation);
        animation.onfinish = () => { element.dataset.motionRegistered = 'complete'; running.delete(animation); };
        animation.oncancel = () => { element.dataset.motionRegistered = 'complete'; running.delete(animation); };
      }
    }, { threshold: 0, rootMargin: '0px 0px -24px 0px' });

    function register() {
      if (!container || preference.matches) return;
      for (const element of container.querySelectorAll<HTMLElement>(targets)) {
        if (registered.has(element) || element.matches('script, style, template') || element.closest(excluded)) continue;
        // Never turn a container of sticky controls or a fixed modal into an
        // animated containing block. Keep reading text and live updates steady.
        if (element.matches('.fixed, .sticky') || element.querySelector('.fixed, .sticky, .reader-prose, [role="dialog"]')) continue;
        if (element.parentElement?.closest('[data-motion-registered="pending"]')) continue;
        registered.add(element);
        element.dataset.motionRegistered = 'pending';
        observer.observe(element);
      }
    }

    register();
    // Async results, tab panels and pagination get the same entrance treatment.
    const mutations = new MutationObserver(records => {
      if (!records.some(record => Array.from(record.addedNodes).some(node => node.nodeType === 1))) return;
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(register);
    });
    mutations.observe(container, { childList: true, subtree: true });

    function onPreferenceChange() {
      if (preference.matches) {
        running.forEach(animation => animation.cancel());
        observer.disconnect();
      } else {
        register();
        container?.querySelectorAll<HTMLElement>('[data-motion-registered="pending"]').forEach(element => observer.observe(element));
      }
    }
    preference.addEventListener('change', onPreferenceChange);
    return () => {
      observer.disconnect();
      mutations.disconnect();
      cancelAnimationFrame(frame);
      running.forEach(animation => animation.cancel());
      preference.removeEventListener('change', onPreferenceChange);
      container.querySelectorAll<HTMLElement>('[data-motion-registered]').forEach(element => delete element.dataset.motionRegistered);
    };
  }, [pathname]);

  return <div ref={root} className="motion-page">{children}</div>;
}
