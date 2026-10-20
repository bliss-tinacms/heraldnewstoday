import assert from 'node:assert/strict';
import { resolveFrontendHref } from '../tina/fields/view-frontend-route.mjs';

const articleTitle = 'Why Editorial Independence and Financial Sustainability Both Matter';

const cases = [
  {
    name: 'Tina hash edit route beats title fallback',
    input: {
      collection: 'blog',
      values: { title: articleTitle },
      location: {
        pathname: '/admin/index.html',
        hash: '#/collections/edit/blog/editorial-independence-and-sustainability',
      },
    },
    expected: '/editorial-independence-and-sustainability/',
  },
  {
    name: 'encoded nested Tina hash route resolves',
    input: {
      collection: 'blog',
      values: { title: articleTitle },
      location: {
        pathname: '/admin/',
        hash: '#/collections/edit/blog/news%2Feditorial-independence-and-sustainability.mdx?mode=edit',
      },
    },
    expected: '/news/editorial-independence-and-sustainability/',
  },
  {
    name: 'saved _sys filename beats title fallback',
    input: {
      collection: 'blog',
      values: { title: articleTitle, _sys: { filename: 'editorial-independence-and-sustainability' } },
      location: { pathname: '/admin/', hash: '' },
    },
    expected: '/editorial-independence-and-sustainability/',
  },
  {
    name: 'saved permalink intentionally overrides filename',
    input: {
      collection: 'blog',
      values: {
        title: articleTitle,
        permalink: '/custom-editorial-route/',
        _sys: { filename: 'editorial-independence-and-sustainability' },
      },
      location: { pathname: '/admin/', hash: '' },
    },
    expected: '/custom-editorial-route/',
  },
  {
    name: 'form document id resolves content path',
    input: {
      collection: 'blog',
      values: { title: articleTitle },
      form: { id: 'src/content/blog/editorial-independence-and-sustainability.mdx' },
      location: { pathname: '/admin/', hash: '' },
    },
    expected: '/editorial-independence-and-sustainability/',
  },
  {
    name: 'page home resolves root',
    input: {
      collection: 'page',
      values: { title: 'Home', _sys: { filename: 'home' } },
      location: { pathname: '/admin/', hash: '' },
    },
    expected: '/',
  },
];

for (const testCase of cases) {
  assert.equal(resolveFrontendHref(testCase.input), testCase.expected, testCase.name);
  console.log(`PASS ${testCase.name}`);
}

assert.notEqual(
  resolveFrontendHref(cases[0].input),
  '/why-editorial-independence-and-financial-sustainability-both-matter/',
  'regression: shortcut must not use display title when Tina hash identifies the document',
);
console.log('FRONTEND_SHORTCUT_ROUTE_REGRESSION_PASS');
