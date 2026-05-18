/**
 * FAQPage JSON-LD synced with Admin → FAQs (active rows).
 */

const FAQ_JSON_LD_ID = 'seo-faq-jsonld';

function plainText(value) {
  return String(value || '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * @param {Array<{ question?: string, answer?: string, active?: boolean }>} faqs
 * @returns {object | null}
 */
export function buildFaqPageSchema(faqs) {
  const mainEntity = (faqs || [])
    .filter((f) => f && f.active !== false)
    .map((f) => {
      const name = plainText(f.question);
      const text = plainText(f.answer);
      if (!name || !text) return null;
      return {
        '@type': 'Question',
        name,
        acceptedAnswer: {
          '@type': 'Answer',
          text,
        },
      };
    })
    .filter(Boolean);

  if (mainEntity.length === 0) return null;

  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity,
  };
}

/**
 * Inject or update FAQPage JSON-LD in document head.
 * @param {Array<{ question?: string, answer?: string, active?: boolean }>} faqs
 */
export function syncFaqJsonLd(faqs) {
  if (typeof document === 'undefined') return;

  const schema = buildFaqPageSchema(faqs);
  let el = document.getElementById(FAQ_JSON_LD_ID);

  if (!schema) {
    if (el) el.remove();
    return;
  }

  if (!el) {
    el = document.createElement('script');
    el.id = FAQ_JSON_LD_ID;
    el.type = 'application/ld+json';
    document.head.appendChild(el);
  }

  el.textContent = JSON.stringify(schema);
}

export function removeFaqJsonLd() {
  if (typeof document === 'undefined') return;
  document.getElementById(FAQ_JSON_LD_ID)?.remove();
}
