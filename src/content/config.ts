import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';
import { DOMAINS, SERVICES } from '../config/site';

const works = defineCollection({
  loader: glob({ pattern: '*.md', base: './src/content/works' }),
  schema: ({ image }) =>
    z.object({
      title: z.string(),
      title_en: z.string().optional(),
      domain: z.array(z.enum(DOMAINS)).min(1),
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

export const collections = { works, faq };
