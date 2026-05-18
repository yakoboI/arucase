const cheerio = require('cheerio');

const PAGE_PATHS = {
  homepage: '/',
  about: '/about',
  admissions: '/admissions',
  staff: '/staff',
  'student-life': '/student-life',
  student_report: '/student-report',
  'school-fee': '/school-fee',
  fees: '/school-fee',
  contact: '/contact',
  privacy: '/privacy-policy',
};

function htmlToPlain(html, maxLen = 80000) {
  const $ = cheerio.load(html || '');
  const text = ($('body').length ? $('body').text() : $.root().text()).replace(/\s+/g, ' ').trim();
  return text.slice(0, maxLen);
}

async function buildFaqSection(query) {
  const faqsResult = await query(
    'SELECT question, answer, category FROM faqs WHERE active = TRUE ORDER BY display_order, created_at'
  );
  const faqList = (faqsResult.rows || [])
    .map((f) => `Q: ${f.question}\nA: ${f.answer}`)
    .join('\n\n');
  return faqList ? `FAQs:\n${faqList}` : '';
}

async function buildDocumentsSection(query) {
  try {
    const docsResult = await query(
      `SELECT name, extracted_text FROM ai_matters_documents
       WHERE extracted_text IS NOT NULL AND TRIM(extracted_text) != ''
       ORDER BY created_at DESC`
    );
    const docContent = (docsResult.rows || [])
      .map((d) => `--- ${d.name} ---\n${(d.extracted_text || '').slice(0, 150000)}`)
      .join('\n\n');
    return docContent ? `Uploaded documents (AI Matters):\n${docContent}` : '';
  } catch {
    return '';
  }
}

async function buildPublicPagesSection(query) {
  try {
    const pagesResult = await query(
      `SELECT page_name, title, html_content FROM public_pages
       WHERE html_content IS NOT NULL AND TRIM(html_content) != ''`
    );
    const blocks = (pagesResult.rows || [])
      .map((p) => {
        const path = PAGE_PATHS[p.page_name] || `/${p.page_name}`;
        const text = htmlToPlain(p.html_content);
        if (text.length < 20) return '';
        return `--- ${p.title || p.page_name} (${path}) ---\n${text}`;
      })
      .filter(Boolean);
    return blocks.length ? `Public website pages:\n${blocks.join('\n\n')}` : '';
  } catch {
    return '';
  }
}

async function buildSiteContactsSection(query) {
  try {
    const result = await query(
      `SELECT contact_address, contact_phone, contact_email, contact_whatsapp,
              office_weekdays, office_saturday, office_sunday,
              admissions_email, academics_email, bursar_email, parents_email
       FROM website_settings WHERE id = 1`
    );
    const row = result.rows[0];
    if (!row) return '';
    const lines = Object.entries(row)
      .filter(([, v]) => v && String(v).trim())
      .map(([k, v]) => `${k}: ${String(v).trim()}`);
    return lines.length ? `Site contact (footer / contact page):\n${lines.join('\n')}` : '';
  } catch {
    return '';
  }
}

async function buildStaffSection(query) {
  try {
    const result = await query(
      `SELECT full_name, role_title, profile_summary, is_teaching
       FROM staff_profiles WHERE active = TRUE
       ORDER BY is_teaching DESC, display_order ASC LIMIT 40`
    );
    const lines = (result.rows || []).map(
      (s) =>
        `- ${s.full_name} (${s.role_title || 'Staff'})${s.profile_summary ? `: ${String(s.profile_summary).slice(0, 200)}` : ''}`
    );
    return lines.length ? `Staff directory (public):\n${lines.join('\n')}` : '';
  } catch {
    return '';
  }
}

async function buildAnnouncementsSection(query) {
  try {
    const result = await query(
      `SELECT title, content, created_at FROM public_announcements
       WHERE active = TRUE ORDER BY created_at DESC LIMIT 8`
    );
    const lines = (result.rows || []).map((a) => {
      const body = htmlToPlain(a.content, 500);
      return `- ${a.title}${body ? `: ${body}` : ''}`;
    });
    return lines.length ? `Recent announcements (/announcements):\n${lines.join('\n')}` : '';
  } catch {
    return '';
  }
}

async function buildPublicChatContext(query, { nectaSummary = '' } = {}) {
  const sections = await Promise.all([
    buildFaqSection(query),
    buildSiteContactsSection(query),
    buildPublicPagesSection(query),
    buildDocumentsSection(query),
    buildStaffSection(query),
    buildAnnouncementsSection(query),
  ]);

  if (nectaSummary) {
    sections.push(`NECTA results summary (/necta-results):\n${nectaSummary}`);
  }

  return sections.filter(Boolean).join('\n\n');
}

module.exports = {
  buildPublicChatContext,
  PAGE_PATHS,
};
