import { mkdir, readFile, writeFile } from 'node:fs/promises';

const sourcePath = new URL('../../wangzhe-esports-knowledge-data/graph_v1/nodes/hero.jsonl', import.meta.url);
const graphPath = new URL('../src/data/kpl.generated.ts', import.meta.url);
const outputPath = new URL('../src/data/hero-official.generated.ts', import.meta.url);
const source = await readFile(sourcePath, 'utf8');
const graphSource = await readFile(graphPath, 'utf8');
const graphHeroIds = new Set([...graphSource.matchAll(/"id": "hero:(\d+)", "name":/g)].map((match) => match[1]));
const heroes = source.trim().split(/\r?\n/).map((line) => JSON.parse(line)).filter((hero) => graphHeroIds.has(hero.properties.hero_id));

function decodeHtml(value = '') {
  return value
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/[ \t]+/g, ' ')
    .replace(/\n\s+/g, '\n')
    .trim();
}

function absoluteUrl(value) {
  return value.startsWith('//') ? `https:${value}` : value;
}

async function fetchHero(hero) {
  const id = hero.properties.hero_id;
  const url = `https://pvp.qq.com/web201605/herodetail/${id}.shtml`;
  try {
    const response = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 KPLKnowledgeGraph/1.0' } });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const html = new TextDecoder('gbk').decode(await response.arrayBuffer());
    const storyBlock = html.match(/id="hero-story"[\s\S]*?<div class="pop-bd">([\s\S]*?)<\/div>/i)?.[1] ?? '';
    const story = [...storyBlock.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/gi)].map((match) => decodeHtml(match[1])).filter(Boolean).join('\n\n');
    const skillBlock = html.match(/<div class="skill-show">([\s\S]*?)<\/div>\s*<\/div>/i)?.[1] ?? html;
    const iconBlock = html.match(/<ul class="skill-u1">([\s\S]*?)<\/ul>/i)?.[1] ?? '';
    const icons = [...iconBlock.matchAll(/(?:src|data-img)="(\/\/[^"#]+)"/gi)].map((match) => absoluteUrl(match[1]));
    const skills = [...skillBlock.matchAll(/<p class="skill-name"><b>([\s\S]*?)<\/b><span>([\s\S]*?)<\/span><span>([\s\S]*?)<\/span><\/p>\s*<p class="skill-desc">([\s\S]*?)<\/p>/gi)]
      .map((match, index) => ({
        name: decodeHtml(match[1]),
        cooldown: decodeHtml(match[2]).replace(/^冷却值[：:]?\s*/, ''),
        cost: decodeHtml(match[3]).replace(/^消耗[：:]?\s*/, ''),
        description: decodeHtml(match[4]),
        icon: icons[index] ?? '',
      }))
      .filter((skill) => skill.name && skill.description);
    return [id, { sourceUrl: url, story, skills }];
  } catch (error) {
    console.warn(`Skipping ${hero.name} (${id}): ${error.message}`);
    return [id, { sourceUrl: url, story: '', skills: [] }];
  }
}

const entries = [];
for (let index = 0; index < heroes.length; index += 8) {
  entries.push(...await Promise.all(heroes.slice(index, index + 8).map(fetchHero)));
}

const available = entries.filter(([, value]) => value.story || value.skills.length).length;
const output = `// Generated from the official Honor of Kings hero pages. Do not edit manually.\n` +
  `export interface OfficialHeroProfile { sourceUrl: string; story: string; skills: Array<{ name: string; cooldown: string; cost: string; description: string; icon: string }> }\n` +
  `export const heroOfficialProfiles: Record<string, OfficialHeroProfile> = ${JSON.stringify(Object.fromEntries(entries), null, 2)};\n`;
await mkdir(new URL('../src/data/', import.meta.url), { recursive: true });
await writeFile(outputPath, output, 'utf8');
console.log(`Wrote ${available}/${entries.length} official hero profiles.`);
