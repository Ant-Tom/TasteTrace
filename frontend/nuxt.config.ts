export default defineNuxtConfig({
  compatibilityDate: "2026-10-01",
  devtools: { enabled: false },
  modules: ["@nuxtjs/tailwindcss", "@pinia/nuxt", "@nuxt/fonts"],
  css: ["~/assets/css/main.css"],

  runtimeConfig: {
    // URL бэкенда для SSR-запросов изнутри Docker-сети (например, http://backend:8080).
    // Если не задан, сервер ходит по публичному адресу.
    apiUrlServer: "",
    public: {
      apiUrl: "http://localhost:8080",
      // Публичный адрес сайта для sitemap, канонических ссылок и превью (https://домен).
      // Пустой — берётся из запроса.
      siteUrl: "",
      // Векторные тайлы OpenFreeMap: бесплатно, без ключа и без лимитов на продакшен-трафик.
      mapStyleUrl: "https://tiles.openfreemap.org/styles/dark"
    }
  },

  app: {
    head: {
      htmlAttrs: { lang: "ru" },
      title: "Где поесть в Казани — карта кафе и ресторанов",
      meta: [
        { name: "viewport", content: "width=device-width, initial-scale=1" },
        { name: "theme-color", content: "#0c0c12" },
        {
          name: "description",
          content: "Кафе, рестораны и бары Казани на карте: рейтинги, отзывы и фото от посетителей."
        }
      ],
      link: [
        { rel: "icon", type: "image/svg+xml", href: "/favicon.svg" },
        { rel: "preconnect", href: "https://tiles.openfreemap.org", crossorigin: "" }
      ]
    }
  },

  // Шрифты скачиваются при сборке и отдаются с нашего домена: быстрее (нет запроса к Google),
  // работает при сбоях Google Fonts и не передаёт Google адреса посетителей.
  fonts: {
    defaults: {
      weights: [400, 500, 600, 700],
      styles: ["normal", "italic"],
      subsets: ["cyrillic", "latin"]
    }
  },

  devServer: {
    host: "0.0.0.0",
    port: 5173
  },

  tailwindcss: {
    cssPath: false
  }
});
