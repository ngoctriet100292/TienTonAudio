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
    const pending = new Set<HTMLElement>();
    let frame = 0;

    const observer = new IntersectionObserver(entries => {
      let index = 0;
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        const element = entry.target as HTMLElement;
        observer.unobserve(element);
        if (preference.matches || !element.isConnected || typeof element.animate !== 'function') { pending.delete(element); continue; }
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
        animation.onfinish = () => { pending.delete(element); running.delete(animation); };
        animation.oncancel = () => { pending.delete(element); running.delete(animation); };
      }
    }, { threshold: 0, rootMargin: '0px 0px -24px 0px' });

    function register() {
      if (!container || preference.matches) return;
      for (const element of container.querySelectorAll<HTMLElement>(targets)) {
        if (registered.has(element) || element.matches('script, style, template') || element.closest(excluded)) continue;
        // Never turn a container of sticky controls or a fixed modal into an
        // animated containing block. Keep reading text and live updates steady.
        if (element.matches('.fixed, .sticky') || element.querySelector('.fixed, .sticky, .reader-prose, [role="dialog"]')) continue;
        let ancestor = element.parentElement;
        while (ancestor && !pending.has(ancestor)) ancestor = ancestor.parentElement;
        if (ancestor) continue;
        registered.add(element);
        pending.add(element);
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
        pending.forEach(element => observer.observe(element));
      }
    }
    preference.addEventListener('change', onPreferenceChange);
    return () => {
      observer.disconnect();
      mutations.disconnect();
      cancelAnimationFrame(frame);
      running.forEach(animation => animation.cancel());
      preference.removeEventListener('change', onPreferenceChange);
      pending.clear();
    };
  }, [pathname]);

  return <div ref={root} className="motion-page">{children}</div>;
}
