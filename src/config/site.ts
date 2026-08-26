import raw from '../data/site.json';

// Single source of truth for all site-wide facts (contact info, brand copy, etc).
// Backed by src/data/site.json so Sveltia CMS's "全站設定" collection can write to it;
// every component must import `site` from here — never hardcode these values inline.
export const site = raw as {
  name: string;
  nameEn: string;
  shortName: string;
  domain: string;
  url: string;
  taglineZh: string;
  taglineEn: string;
  introZh: string;
  introEn: string;
  email: string;
  phone: string;
  mobile: string;
  lineId: string;
  lineUrl: string;
  addressZh: string;
  addressEn: string;
  taxId: string;
  hours: string;
  social: {
    instagram: string;
    facebook: string;
    behance: string;
  };
  portfolioPdf: string;
  ogImage: string;
};

// tel: links need the raw digits with country code, no separators.
export function telHref(taiwanLocalNumber: string): string {
  const digits = taiwanLocalNumber.replace(/[^0-9]/g, '').replace(/^0/, '');
  return `tel:+886${digits}`;
}

// Long-form labels — matches the naming used consistently across the Stitch
// visual mockups (studio_hikari_7/8 home, _6 FAQ, cms config), not the short
// form from the original text spec.
export const DOMAINS = ['建築設計', '工程模擬', '室內設計', '景觀模擬', '產品模擬'] as const;
export const SERVICES = ['靜態透視圖', '動畫', '模擬分析', 'BIM'] as const;

export const DOMAIN_LABELS_EN: Record<(typeof DOMAINS)[number], string> = {
  建築設計: 'Architecture',
  工程模擬: 'Engineering',
  室內設計: 'Interior',
  景觀模擬: 'Landscape',
  產品模擬: 'Product',
};

export const SERVICE_LABELS_EN: Record<(typeof SERVICES)[number], string> = {
  靜態透視圖: 'Renderings',
  動畫: 'Animation',
  模擬分析: 'Simulation',
  BIM: 'BIM',
};
