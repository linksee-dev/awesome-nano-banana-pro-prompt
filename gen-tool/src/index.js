import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import Mustache from 'mustache';
import yaml from 'js-yaml';
import langs from './i18n/lang.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const args = process.argv.slice(2);
const args_lang = args.find(arg => arg.startsWith('--lang='));
const lang = args_lang ? args_lang.split('=')[1] : 'en';
const t = langs[lang];

// read all case files
const caseDirs = fs.readdirSync(path.join(__dirname, '../../cases'));
const numericDirs = caseDirs.filter(dir => !isNaN(dir));
let cases = numericDirs.map(dir => {
  const caseNumber = parseInt(dir);
  const casePath = path.join(__dirname, '../../cases', dir, 'case.yaml');
  const attributionPath = path.join(__dirname, '../../cases', dir, 'ATTRIBUTION.yml');
  
  // Check if files exist before reading
  if (!fs.existsSync(casePath)) {
    console.warn(`Warning: case.yaml not found in cases/${dir}, skipping...`);
    return null;
  }
  
  const caseData = yaml.load(fs.readFileSync(casePath, 'utf8'));
  
  // ATTRIBUTION.yml is optional, use default if not exists
  let attributionData = {};
  if (fs.existsSync(attributionPath)) {
    attributionData = yaml.load(fs.readFileSync(attributionPath, 'utf8'));
  }
  
  return {
    case_no: caseNumber,
    ...caseData,
    attribution: attributionData
  };
}).filter(c => c !== null); // Remove null entries
// Sort cases in descending order by case number
cases.sort((a, b) => b.case_no - a.case_no);

// render cases
const case_template = fs.readFileSync(path.join(__dirname, '../templates/case.md'), 'utf8');
let cases_contents = '';
for (const c of cases) {
    const source_links = c.source_links.length === 1
      ? `[${t.source_link_caption}](${c.source_links[0].url})`
    : c.source_links.map((link, i) => `[${t.source_link_caption}${i + 1}](${link.url})`).join(' | ');

    cases_contents += Mustache.render(case_template, {
      case_no: c.case_no,
      t: t,
      title: lang === 'zh' ? c.title_zh : c.title,
      author: c.author,
      author_link: c.author_link,
      source_links: source_links,
      image: c.image,
      alt_text: lang === 'zh' ? (c.alt_text_zh || '').trim() : (c.alt_text || '').trim(),
      attribution: c.attribution,
      prompt: lang === 'zh' ? (c.prompt_zh || '').trim() : (c.prompt || '').trim(),
      prompt_note: lang === 'zh' ? (c.prompt_note_zh || '').trim() : (c.prompt_note || '').trim(),
      reference_note: lang === 'zh' ? (c.reference_note_zh || '').trim() : (c.reference_note || '').trim(),
      submitter: c.submitter,
      submitter_link: c.submitter_link,
    }) + '\n';
}

// Data for the README template
const data = {
  't': t,
  'cases': cases.map(c => ({
    case_no: c.case_no,
    title: lang === 'zh' ? c.title_zh : c.title,
    author: c.author,
  })),
  'header': fs.readFileSync(path.join(__dirname, '../templates', lang, 'header.md'), 'utf8'),
  'table-of-contents': fs.readFileSync(path.join(__dirname, '../templates', lang, 'table-of-contents.md'), 'utf8'),
  'nano-banana-pro-intro': fs.readFileSync(path.join(__dirname, '../templates', lang, 'nano-banana-pro-intro.md'), 'utf8'),
  'cases-contents': cases_contents,
  'tools-intro': fs.readFileSync(path.join(__dirname, '../templates', lang, 'tools-intro.md'), 'utf8'),
  'prompting-tips': fs.readFileSync(path.join(__dirname, '../templates', lang, 'prompting-tips.md'), 'utf8'),
  'how-to-contribute': fs.readFileSync(path.join(__dirname, '../templates', lang, 'how-to-contribute.md'), 'utf8'),
  'acknowledgements': fs.readFileSync(path.join(__dirname, '../templates', lang, 'acknowledgements.md'), 'utf8'),
  'sponsored': fs.readFileSync(path.join(__dirname, '../templates', lang, 'sponsored.md'), 'utf8'),
  'star-history': fs.readFileSync(path.join(__dirname, '../templates', lang, 'star-history.md'), 'utf8')
};

// Render the README template
const readmeTemplate = fs.readFileSync(path.join(__dirname, '../templates/README.md.md'), 'utf8');
const renderedReadme = Mustache.render(readmeTemplate, data);

// Write the rendered README
const filename = lang === 'zh' ? 'README_zh.md' : 'README.md';
fs.writeFileSync(path.join(__dirname, '../..', filename), renderedReadme);
console.log(`${filename} generated successfully`);
