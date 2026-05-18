/**
 * Quick regression check for public CMS markdown helpers (no test runner required).
 * Run: npm run verify:cms
 */
import { parseMarkdownSections, looksLikeMarkdownPlain } from '../src/utils/publicCmsMarkdown.js';
import { cmsSectionId } from '../src/utils/cmsSectionId.js';
import { buildFaqPageSchema } from '../src/utils/faqJsonLd.js';

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

const md = `## Utangulizi
Intro line

### Taarifa
- one
- two`;

assert(looksLikeMarkdownPlain(md), 'markdown detection');
const nested = parseMarkdownSections(md, { splitH3: false });
assert(nested.length === 1 && nested[0].title === 'Utangulizi', 'splitH3 false keeps ### in section');

const split = parseMarkdownSections(md, { splitH3: true });
assert(split.length >= 2, 'splitH3 true creates subsections');

assert(cmsSectionId('Utangulizi', 'policy-cms') === 'policy-cms-utangulizi', 'slug id');
assert(cmsSectionId('', 'x', 3) === 'x-3', 'fallback index id');

const faqSchema = buildFaqPageSchema([
  { question: 'Swali?', answer: 'Jibu.', active: true },
  { question: '', answer: 'x', active: true },
]);
assert(faqSchema?.mainEntity?.length === 1, 'FAQ schema filters invalid rows');
assert(buildFaqPageSchema([]) === null, 'empty FAQ schema');

console.log('verify-public-cms-markdown: OK');
