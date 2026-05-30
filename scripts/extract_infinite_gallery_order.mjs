#!/usr/bin/env node
/**
 * Extrae el orden visual de fotos en infinite-galeria (masonry).
 * Uso: node scripts/extract_infinite_gallery_order.mjs bodas
 */
import puppeteer from 'puppeteer';

const slug = process.argv[2] || 'bodas';
const urlSlugs = {
  bodas: 'bodas',
  'albumes-impresos': 'albumes-impresos',
  book: 'book',
  'erotic-photography': 'erotic-photography',
  celebridades: 'celebridades',
  publicidad: 'publicidad',
  viajes: 'viajes',
  ninos: 'nin-s',
  producto: 'producto',
  'retratos-de-familia': 'retratos-de-familia',
};

const urlSlug = urlSlugs[slug];
if (!urlSlug) {
  console.error('Slug desconocido:', slug);
  process.exit(1);
}

const url = `https://www.mauriciostradaphotography.com/lang/es/galerias/${urlSlug}`;

const browser = await puppeteer.launch({ headless: true });
const page = await browser.newPage();
await page.setViewport({ width: 1280, height: 900 });
await page.goto(url, { waitUntil: 'networkidle2', timeout: 120000 });

// Esperar primer lote
await page.waitForSelector('.infinite-galeria .galeria-gal-columns img', { timeout: 60000 });

// Scroll hasta cargar todo
let prev = 0;
let stable = 0;
for (let i = 0; i < 80; i++) {
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await new Promise((r) => setTimeout(r, 800));
  const count = await page.evaluate(
    () => document.querySelectorAll('.infinite-galeria .galeria-gal-columns img').length
  );
  if (count === prev) {
    stable += 1;
    if (stable >= 4) break;
  } else {
    stable = 0;
    prev = count;
  }
}

const order = await page.evaluate(() => {
  const cols = [
    ...document.querySelectorAll('.infinite-galeria .galeria-gal-columns'),
  ];

  return cols
    .map((col) => {
      const img = col.querySelector('img');
      const src = img
        ? img.currentSrc || img.src || img.getAttribute('data-src') || ''
        : '';
      return {
        dataId: parseInt(col.getAttribute('data-id') || '0', 10),
        src,
        alt: img ? img.alt || '' : '',
        colClass: col.className || '',
      };
    })
    .sort((a, b) => a.dataId - b.dataId)
    .map((item, i) => {
      const col = item.colClass || '';
      let url_name = '';
      const showMatch = col.match(/dinashow-([^\s]+)/);
      if (showMatch) {
        url_name = showMatch[1];
      } else {
        const srcMatch = item.src.match(/\/gal\/\d+\/([^/]+?)_\d{14}/i);
        if (srcMatch) url_name = srcMatch[1];
      }
      if (!url_name) url_name = `unknown-${i}`;
      return {
        i,
        dataId: item.dataId,
        url_name,
        alt: item.alt,
        src: item.src,
      };
    });
});

await browser.close();

console.log(JSON.stringify({ slug, total: order.length, order }, null, 2));
