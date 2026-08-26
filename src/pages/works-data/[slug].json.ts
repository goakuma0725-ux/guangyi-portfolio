import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import { getImage } from 'astro:assets';

export async function getStaticPaths() {
  const works = await getCollection('works');
  return works.map((work) => ({ params: { slug: work.id }, props: { work } }));
}

export const GET: APIRoute = async ({ props }) => {
  const work = (props as any).work as Awaited<ReturnType<typeof getCollection<'works'>>>[number];

  const sources = work.data.gallery && work.data.gallery.length > 0 ? work.data.gallery.map((g) => g.src) : [work.data.cover];

  const images = await Promise.all(
    sources.map(async (src) => {
      const full = await getImage({ src, width: 1600, format: 'webp' });
      const thumb = await getImage({ src, width: 160, height: 120, format: 'webp' });
      return { full: full.src, thumb: thumb.src };
    })
  );

  const body = {
    id: work.id,
    title: work.data.title,
    titleEn: work.data.title_en || work.data.title,
    images,
  };

  return new Response(JSON.stringify(body), {
    headers: { 'Content-Type': 'application/json' },
  });
};
