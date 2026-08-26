import { defineCollection, reference, z } from 'astro:content';
import { glob } from 'astro/loaders';
import { SERVICES } from '../config/site';

// Domains are CMS-editable (via the "relation" widget) rather than a fixed
// enum — content editors can add a new domain by creating an entry here,
// no code change needed. See src/content/domains/*.md for the seed set.
const domains = defineCollection({
  loader: glob({ pattern: '*.md', base: './src/content/domains' }),
  schema: z.object({
    title: z.string(),
    title_en: z.string().optional(),
  }),
});

const works = defineCollection({
  loader: glob({ pattern: '*.md', base: './src/content/works' }),
  schema: ({ image }) =>
    z.object({
      title: z.string(),
      title_en: z.string().optional(),
      domain: z.array(reference('domains')).min(1),
      service: z.array(z.enum(SERVICES)).min(1),
      year: z.number().optional(),
      cover: image(),
      cover_clay: image().optional(),
      gallery: z
        .array(
          z.object({
            src: image(),
            caption: z.string().optional(),
          })
        )
        .optional(),
      video: z
        .object({
          src: z.string(),
          poster: image().optional(),
        })
        .optional(),
      featured: z.boolean().default(false),
      order: z.number().default(0),
    }),
});

const faq = defineCollection({
  loader: glob({ pattern: '*.md', base: './src/content/faq' }),
  schema: z.object({
    category: z.string(),
    category_en: z.string().optional(),
    question: z.string(),
    question_en: z.string().optional(),
    answer: z.string(),
    answer_en: z.string().optional(),
    order: z.number().default(0),
  }),
});

export const collections = { works, faq, domains };
