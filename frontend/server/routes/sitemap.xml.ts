// Карта сайта для поисковиков: главная и страница каждого заведения.
export default defineEventHandler(async (event) => {
  const origin = siteOrigin(event);
  const places = await $fetch<{ id: number }[]>(`${apiBaseUrl(event)}/api/establishments`);
  const urls = [`${origin}/`, ...places.map((place) => `${origin}/place/${place.id}`)];

  setHeader(event, "content-type", "application/xml; charset=utf-8");
  setHeader(event, "cache-control", "public, max-age=3600");
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...urls.map((url) => `  <url><loc>${url}</loc></url>`),
    "</urlset>",
    ""
  ].join("\n");
});
