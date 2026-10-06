const CJK = '\\u3000-\\u9fff\\uff00-\\uffef';

// Short plain-text summary for a meta description: collapses line breaks,
// ends at a sentence boundary when one falls in the back half of the limit,
// otherwise cuts at the limit (on a word boundary for spaced text) and adds "…".
export function excerpt(text: string, max: number): string {
  const flat = text
    .replace(/\s+/g, ' ')
    .replace(new RegExp(`([${CJK}]) (?=[${CJK}])`, 'g'), '$1')
    .trim();
  const chars = [...flat];
  if (chars.length <= max) return flat;

  const cut = chars.slice(0, max).join('');
  const lastEnd = [...cut.matchAll(/[。！？!?]|\.(?=\s|$)/g)].pop();
  const endIdx = lastEnd?.index ?? -1;
  if (endIdx + 1 >= max / 2) return cut.slice(0, endIdx + 1);

  let base = cut;
  if (/[A-Za-z0-9]$/.test(cut) && /^[A-Za-z0-9]/.test(chars[max])) {
    const space = cut.lastIndexOf(' ');
    if (space >= max * 0.6) base = cut.slice(0, space);
  }
  return base.replace(/[\s,，、;；:：]+$/, '') + '…';
}
