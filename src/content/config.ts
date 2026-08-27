import { defineCollection, reference, z } from 'astro:content';
import { glob } from 'astro/loaders';
import { SERVICES } from '../config/site';

// Sveltia CMS writes '' or null (rather than omitting the key) when an
// optional field is left blank, which plain z.<type>().optional() rejects.
// This normalizes both to undefined before the real schema sees it.
const optionalBlank = <T extends z.ZodTypeAny>(schema: T) =>
  z.preprocess((val) => (val === '' || val === null ? undefined : val), schema.optional());

// Domains are CMS-editable (via the "relation" widget) rather than a fixed
// enum — content editors can add a new domain by creating an entry here,
// no code change needed. See src/content/domains/*.md for the seed set.
const domains = defineCollection({
  loader: glob({ pattern: '*.md', base: './src/content/domains' }),
  schema: z.object({
    title: z.string(),
    title_en: optionalBlank(z.string()),
  }),
});

// Work images live in public/images/uploads/ (Sveltia's media_folder), served
// as plain static files rather than imported/optimized via astro:assets —
// the image() schema helper only resolves images co-located with the
// content file, not public/-rooted paths. See WorkCard/Carousel/etc, which
// render these as plain <img> tags instead of <Image>.
const works = defineCollection({
  loader: glob({ pattern: '*.md', base: './src/content/works' }),
  schema: z.object({
    title: z.string(),
    title_en: optionalBlank(z.string()),
    domain: z.array(reference('domains')).min(1),
    service: z.array(z.enum(SERVICES)).min(1),
    year: optionalBlank(z.number()),
    cover: z.string(),
    cover_clay: optionalBlank(z.string()),
    gallery: z.array(z.string()).optional(),
    video: optionalBlank(
      z.object({
        src: z.string(),
        poster: optionalBlank(z.string()),
      })
    ),
    featured: z.boolean().default(false),
    order: z.number().default(0),
  }),
});

const faq = defineCollection({
  loader: glob({ pattern: '*.md', base: './src/content/faq' }),
  schema: z.object({
    category: z.string(),
    category_en: optionalBlank(z.string()),
    question: z.string(),
    question_en: optionalBlank(z.string()),
    answer: z.string(),
    answer_en: optionalBlank(z.string()),
    order: z.number().default(0),
  }),
});

export const collections = { works, faq, domains };
