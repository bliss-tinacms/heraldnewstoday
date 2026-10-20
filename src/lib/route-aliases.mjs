export const ROUTE_ALIASES = Object.freeze({
  'why-editorial-independence-and-financial-sustainability-both-matter': '/editorial-independence-and-sustainability/',
});

export function getRouteAlias(route) {
  const normalized = String(route || '').trim().toLowerCase().replace(/^\/+|\/+$/g, '');
  return ROUTE_ALIASES[normalized] || null;
}
