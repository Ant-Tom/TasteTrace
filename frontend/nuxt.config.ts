export default defineNuxtConfig({
  compatibilityDate: "2026-10-01",
  devtools: { enabled: false },
  modules: ["@nuxtjs/tailwindcss", "@pinia/nuxt"],
  css: ["~/assets/css/main.css"],

  runtimeConfig: {
    // URL бэкенда для SSR-запросов изнутри Docker-сети (например, http://backend:8080).
    // Если не задан, сервер ходит по публичному адресу.
    apiUrlServer: "",
    public: {
      apiUrl: "http://localhost:8080",
      // Векторные тайлы OpenFreeMap: бесплатно, без ключа и без лимитов на продакшен-трафик.
      mapStyleUrl: "https://tiles.openfreemap.org/styles/dark"
    }
  },

  app: {
    head: {
      htmlAttrs: { lang: "ru" },
      title: "TasteTrace — гастрокарта Казани",
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
        { rel: "preconnect", href: "https://tiles.openfreemap.org", crossorigin: "" },
        { rel: "preconnect", href: "https://fonts.googleapis.com" },
        { rel: "preconnect", href: "https://fonts.gstatic.com", crossorigin: "" },
        {
          rel: "stylesheet",
          href: "https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;1,9..40,400&family=Syne:wght@600;700;800&display=swap"
        }
      ]
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
