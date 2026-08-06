import type { APIRoute } from 'astro';

export const GET: APIRoute = ({ site }) => {
  const origin = site ?? new URL('http://localhost:4321');

  return new Response([
    'User-agent: *',
    'Allow: /',
    `Sitemap: ${new URL('sitemap-index.xml', origin).href}`,
    '',
  ].join('\n'));
};
