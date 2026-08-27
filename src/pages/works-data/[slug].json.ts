import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';

export async function getStaticPaths() {
  const works = await getCollection('works');
  return works.map((work) => ({ params: { slug: work.id }, props: { work } }));
}

export const GET: APIRoute = async ({ props }) => {
  const work = (props as any).work as Awaited<ReturnType<typeof getCollection<'works'>>>[number];

  const sources = work.data.gallery && work.data.gallery.length > 0 ? work.data.gallery : [work.data.cover];
  const images = sources.map((src) => ({ full: src, thumb: src }));

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
