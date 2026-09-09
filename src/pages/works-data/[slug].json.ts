import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';

export async function getStaticPaths() {
  const works = await getCollection('works');
  return works.map((work) => ({ params: { slug: work.id }, props: { work } }));
}

// Matches VideoBlock.astro's embed conversion — kept in sync since both turn
// a YouTube/Vimeo watch link into its embeddable iframe URL.
function toEmbedUrl(url: string) {
  const yt = url.match(/(?:youtu\.be\/|youtube\.com\/watch\?v=)([\w-]+)/);
  if (yt) return `https://www.youtube-nocookie.com/embed/${yt[1]}`;
  const vimeo = url.match(/vimeo\.com\/(\d+)/);
  if (vimeo) return `https://player.vimeo.com/video/${vimeo[1]}`;
  return url;
}

export const GET: APIRoute = async ({ props }) => {
  const work = (props as any).work as Awaited<ReturnType<typeof getCollection<'works'>>>[number];

  const sources = work.data.gallery && work.data.gallery.length > 0 ? work.data.gallery : [work.data.cover];
  const images = sources.map((src) => ({ full: src, thumb: src }));

  const rawVideo = work.data.video;
  const isExternal = rawVideo && /youtube\.com|youtu\.be|vimeo\.com/.test(rawVideo.src);
  const video = rawVideo
    ? {
        type: isExternal ? 'embed' : 'local',
        src: isExternal ? toEmbedUrl(rawVideo.src) : rawVideo.src,
        poster: rawVideo.poster || work.data.cover,
      }
    : null;

  const body = {
    id: work.id,
    title: work.data.title,
    titleEn: work.data.title_en || work.data.title,
    images,
    video,
  };

  return new Response(JSON.stringify(body), {
    headers: { 'Content-Type': 'application/json' },
  });
};
