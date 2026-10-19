#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import matter from 'gray-matter';

const root = path.resolve(import.meta.dirname, '..');
const failures = [];
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const exists = (p) => fs.existsSync(path.join(root, p));
const blogDir = path.join(root, 'src/content/blog');
const pageDir = path.join(root, 'src/content/page');
const userDir = path.join(root, 'src/content/user');
const categoryDir = path.join(root, 'src/content/category');
const blogs = fs.readdirSync(blogDir).filter((name) => name.endsWith('.mdx'));
const pages = fs.readdirSync(pageDir).filter((name) => name.endsWith('.mdx'));
const users = fs.readdirSync(userDir).filter((name) => name.endsWith('.json'));
const categories = fs.readdirSync(categoryDir).filter((name) => name.endsWith('.json'));

if (blogs.length < 6) failures.push(`Expected at least six destination articles, found ${blogs.length}`);
if (!pages.includes('home.mdx') || !pages.includes('editorial-guidelines.mdx')) failures.push('Required page records are missing');
if (!users.includes('admin.json')) failures.push('Publisher user record is missing');
if (categories.length < 7) failures.push(`Expected seven category records, found ${categories.length}`);

const categoryCardinalities = [];
for (const name of blogs) {
  const file = path.join(blogDir, name);
  const parsed = matter(fs.readFileSync(file, 'utf8'));
  const data = parsed.data;
  if (!data.title || !data.description || !data.author) failures.push(`${name}: title, description, or author missing`);
  if (!Array.isArray(data.categories)) failures.push(`${name}: categories must be a zero-to-many array`);
  categoryCardinalities.push((data.categories || []).length);
  for (const reference of data.categories || []) if (!exists(reference)) failures.push(`${name}: category reference missing: ${reference}`);
  if (data.author && !exists(data.author)) failures.push(`${name}: author reference missing: ${data.author}`);
  if (data.heroImage && !/^https:\/\/res\.cloudinary\.com\//.test(data.heroImage)) failures.push(`${name}: heroImage is not an HTTPS Cloudinary URL`);
}
if (!categoryCardinalities.includes(0) || !categoryCardinalities.includes(1) || !categoryCardinalities.some((count) => count > 1)) failures.push(`MULTICAT fixtures must cover zero, one, and multiple categories; got ${categoryCardinalities.join(',')}`);

for (const name of users) {
  const data = JSON.parse(fs.readFileSync(path.join(userDir, name), 'utf8'));
  if (!data.name || !data.role || !data.bio) failures.push(`${name}: name, role, or bio missing`);
  if (data.avatar && !/^https:\/\/res\.cloudinary\.com\//.test(data.avatar)) failures.push(`${name}: avatar is not an HTTPS Cloudinary URL`);
}

const config = JSON.parse(read('src/content/config/config.json'));
if (config?.seo?.title !== 'Herald News Today') failures.push('Global site title must be Herald News Today');
for (const field of ['logo', 'footerLogo']) if (!/^https:\/\/res\.cloudinary\.com\//.test(config?.seo?.[field] || '')) failures.push(`Global seo.${field} must be a Cloudinary URL`);
if (!/^https:\/\/formspree\.io\/f\//.test(config?.contactForm?.formspreeEndpoint || '')) failures.push('Formspree endpoint is missing from Global Config');
for (const field of ['ctaEyebrow', 'ctaTitle', 'ctaText', 'ctaButtonText', 'ctaButtonHref']) if (!config?.footer?.[field]) failures.push(`Global footer.${field} is missing`);
for (const field of ['title', 'description', 'buttonText', 'buttonHref']) if (!config?.notFound?.[field]) failures.push(`Global notFound.${field} is missing`);

const visibleSources = [...blogs.map((x) => path.join(blogDir, x)), ...pages.map((x) => path.join(pageDir, x)), ...users.map((x) => path.join(userDir, x))];
const staleTerms = [
  ['First', 'ForNews'].join(''),
  ['First', ' For News'].join(''),
  ['Starter', ' Site'].join(''),
  ['lorem', ' ipsum'].join(''),
  ['hello', '@example.com'].join(''),
];
const forbidden = new RegExp(staleTerms.map((value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|'), 'i');
for (const file of visibleSources) if (forbidden.test(fs.readFileSync(file, 'utf8'))) failures.push(`${path.relative(root, file)} contains stale visible content`);

console.log(JSON.stringify({ blogs: blogs.length, pages: pages.length, users: users.length, categories: categories.length, failures }, null, 2));
if (failures.length) process.exit(1);
console.log('CONTENT_INTEGRITY_OK true');
