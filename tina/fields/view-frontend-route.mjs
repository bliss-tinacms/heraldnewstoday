function cleanPath(value) {
  if (!value || typeof value !== 'string') return '';
  let result = value.trim();
  try { result = decodeURIComponent(result); } catch {}
  result = result.split('?')[0].split('#')[0].replace(/\\/g, '/');
  result = result.replace(/^https?:\/\/[^/]+/i, '');
  result = result.replace(/^\/+|\/+$/g, '');
  return result;
}

function stripContentExtension(value) {
  return value.replace(/\.(md|mdx|json)$/i, '').replace(/^\/+|\/+$/g, '');
}

export function slugifyFrontendPath(value) {
  return cleanPath(value)
    .split('/')
    .map((part) => part.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, ''))
    .filter(Boolean)
    .join('/');
}

/**
 * Tina's SPA keeps its collection route in location.hash, not location.pathname.
 * Resolve the saved document path from either form metadata or that hash before
 * ever falling back to a display title.
 */
export function resolveTinaDocumentSlug({ collection, values = {}, form = null, location = null }) {
  const metadataCandidates = [
    values?._sys?.relativePath,
    values?._sys?.filename,
    values?._sys?.basename,
    form?.finalForm?.getState?.()?.values?._sys?.relativePath,
    form?.finalForm?.getState?.()?.values?._sys?.filename,
  ];

  for (const candidate of metadataCandidates) {
    if (typeof candidate !== 'string' || !candidate.trim()) continue;
    let normalized = cleanPath(candidate);
    const contentMarker = `/content/${collection}/`;
    const markerIndex = (`/${normalized}`).toLowerCase().indexOf(contentMarker.toLowerCase());
    if (markerIndex >= 0) normalized = (`/${normalized}`).slice(markerIndex + contentMarker.length);
    normalized = stripContentExtension(normalized);
    if (normalized && normalized.toLowerCase() !== collection.toLowerCase()) return slugifyFrontendPath(normalized);
  }

  const routeSources = [form?.id, location?.hash, location?.pathname].filter(Boolean);
  for (const source of routeSources) {
    let route = String(source).replace(/^#/, '');
    try { route = decodeURIComponent(route); } catch {}
    route = route.split('?')[0].replace(/\\/g, '/');

    const collectionEdit = route.match(new RegExp(`/collections/(?:edit|duplicate)/${collection}/(.+)$`, 'i'));
    if (collectionEdit?.[1]) {
      const slug = slugifyFrontendPath(stripContentExtension(collectionEdit[1]));
      if (slug) return slug;
    }

    const contentFile = route.match(new RegExp(`/content/${collection}/(.+?)\\.(?:md|mdx|json)(?:/|$)`, 'i'));
    if (contentFile?.[1]) {
      const slug = slugifyFrontendPath(contentFile[1]);
      if (slug) return slug;
    }
  }

  return '';
}

/** @param {{ collection?: string, values?: Record<string, any>, form?: any, location?: Location | null }} options */
export function resolveFrontendHref({ collection, values = {}, form = null, location = null }) {
  const explicitPermalink = cleanPath(values?.permalink || '');
  const documentSlug = resolveTinaDocumentSlug({ collection, values, form, location });
  const fallbackTitle = slugifyFrontendPath(values?.title || values?.name || '');
  const slug = slugifyFrontendPath(explicitPermalink) || documentSlug || fallbackTitle;

  if (collection === 'page') return !slug || slug === 'home' || slug === 'index' ? '/' : `/${slug}/`;
  if (collection === 'blog') return slug ? `/${slug.replace(/^blog\//, '')}/` : '/blog/';
  if (collection === 'category') return slug ? `/${slug}/` : '/blog/';
  if (collection === 'user') return slug ? `/author/${slug}/` : '/';
  return slug ? `/${slug}/` : '/';
}
