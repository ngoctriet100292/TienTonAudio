import { api } from '@/lib/api';
import { MetadataRoute } from 'next';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://tientonaudio.com';
  const now = new Date();

  // 1. Static routes
  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      lastModified: now,
      changeFrequency: 'always',
      priority: 1.0,
    },
    {
      url: `${baseUrl}/rankings`,
      lastModified: now,
      changeFrequency: 'hourly',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/categories`,
      lastModified: now,
      changeFrequency: 'daily',
      priority: 0.85,
    },
    {
      url: `${baseUrl}/community`,
      lastModified: now,
      changeFrequency: 'hourly',
      priority: 0.85,
    },
    {
      url: `${baseUrl}/cultivation`,
      lastModified: now,
      changeFrequency: 'daily',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/vip`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.75,
    },
    {
      url: `${baseUrl}/about`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.7,
    },
    {
      url: `${baseUrl}/contact`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.6,
    },
  ];

  staticRoutes.push(...['policies', 'privacy', 'terms', 'copyright'].map(route => ({ url: `${baseUrl}/${route}`, lastModified: now, changeFrequency: 'monthly' as const, priority: 0.5 })));

  // 2. Dynamic Story Routes
  let storyRoutes: MetadataRoute.Sitemap = [];
  try {
    const stories = await api.getStories(1, 200);
    if (stories && stories.length > 0) {
      storyRoutes = stories.map((s) => ({
        url: `${baseUrl}/stories/${s.slug}`,
        lastModified: new Date(),
        changeFrequency: 'daily',
        priority: 0.9,
      }));
    }
  } catch (e) {
    console.warn('Sitemap story fetch error:', e);
  }

  // 3. Dynamic Category Routes
  const categorySlugs = ['tien-hiep', 'huyen-huyen', 'kiem-hiep', 'do-thi-tu-tien', 'he-thong', 'xuyen-khong', 'trung-sinh'];
  const categoryRoutes: MetadataRoute.Sitemap = categorySlugs.map((slug) => ({
    url: `${baseUrl}/categories/${slug}`,
    lastModified: now,
    changeFrequency: 'daily',
    priority: 0.8,
  }));

  return [...staticRoutes, ...storyRoutes, ...categoryRoutes];
}
