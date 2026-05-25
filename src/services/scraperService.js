import axios from 'axios';
import * as cheerio from 'cheerio';

const TIMEOUT = 15000;
const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

function fetchHtml(url) {
  return axios.get(url, {
    timeout: TIMEOUT,
    headers: { 'User-Agent': USER_AGENT },
  });
}

function extractMetaContent($, name) {
  return (
    $(`meta[property="og:${name}"]`).attr('content') ||
    $(`meta[name="${name}"]`).attr('content') ||
    ''
  );
}

function cleanText(text) {
  return text.replace(/\s+/g, ' ').trim();
}

function extractListItems($, selector) {
  const items = [];
  $(selector).each((_, el) => {
    const text = cleanText($(el).text());
    if (text) items.push(text);
  });
  return items;
}

function scrapeNefisYemekTarifleri($) {
  const title =
    cleanText($('h1').first().text()) ||
    extractMetaContent($, 'title');

  const ingredients = extractListItems($, '.recipe-ingredients li, [class*="malzeme"] li, ul.ingredients li, .tarif-malzemeler li');

  const instructions = extractListItems($, '.recipe-steps li, [class*="yapilis"] li, .directions li, .tarif-yapilis p, .recipe-directions li');

  const imageUrl =
    $('img[class*="featured"]').first().attr('src') ||
    $('img[class*="hero"]').first().attr('src') ||
    $('.recipe-image img').first().attr('src') ||
    extractMetaContent($, 'image');

  return { title, ingredients, instructions, imageUrl };
}

function scrapeYemekCom($) {
  const title =
    cleanText($('h1').first().text()) ||
    extractMetaContent($, 'title');

  const ingredients = extractListItems($, '.recipe-ingredients li, [class*="ingredient"] li, ul.ingredients-list li, .tarif-malzemeler li');

  const instructions = extractListItems($, '.recipe-steps li, [class*="direction"] li, .recipe-directions li, .tarif-yapilis li, .steps li');

  const imageUrl =
    $('img[class*="featured"]').first().attr('src') ||
    $('img[class*="hero"]').first().attr('src') ||
    $('.recipe-image img').first().attr('src') ||
    $('figure img').first().attr('src') ||
    extractMetaContent($, 'image');

  return { title, ingredients, instructions, imageUrl };
}

function detectSite(url) {
  const hostname = new URL(url).hostname.toLowerCase();
  if (hostname.includes('nefisyemektarifleri')) return 'nefisyemektarifleri';
  if (hostname.includes('yemek.com') || hostname.includes('yemekseparator')) return 'yemek.com';
  return 'generic';
}

function scrapeGeneric($) {
  const title =
    cleanText($('h1').first().text()) ||
    extractMetaContent($, 'title');

  const ingredients = extractListItems($, '[class*="ingredient"] li, [class*="malzeme"] li, ul li');

  const instructions = extractListItems($, '[class*="direction"] li, [class*="step"] li, [class*="yapilis"] li, [class*="instruction"] li, ol li');

  const imageUrl =
    $('img[class*="featured"]').first().attr('src') ||
    $('img[class*="hero"]').first().attr('src') ||
    extractMetaContent($, 'image');

  return { title, ingredients, instructions, imageUrl };
}

const scrapers = {
  nefisyemektarifleri: scrapeNefisYemekTarifleri,
  'yemek.com': scrapeYemekCom,
  generic: scrapeGeneric,
};

export async function scrapeRecipe(url) {
  const response = await fetchHtml(url);
  const $ = cheerio.load(response.data);
  const site = detectSite(url);
  const scraper = scrapers[site] || scrapers.generic;

  const data = scraper($);

  const ingredients = Array.isArray(data.ingredients)
    ? data.ingredients.filter(Boolean)
    : typeof data.ingredients === 'string'
      ? data.ingredients.split('\n').filter(Boolean)
      : [];

  const instructions = Array.isArray(data.instructions)
    ? data.instructions.filter(Boolean).join('\n')
    : typeof data.instructions === 'string'
      ? data.instructions
      : '';

  const imageUrl = data.imageUrl || '';

  const fullImageUrl = imageUrl.startsWith('//')
    ? `https:${imageUrl}`
    : imageUrl.startsWith('/')
      ? `${new URL(url).origin}${imageUrl}`
      : imageUrl;

  return {
    title: data.title || '',
    ingredients: ingredients.join('\n'),
    instructions,
    imageUrl: fullImageUrl,
  };
}
