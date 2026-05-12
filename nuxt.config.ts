export default defineNuxtConfig({
  modules: ["@nuxt/ui"],
  css: ["~/assets/css/main.css"],

  compatibilityDate: "2025-05-12",

  runtimeConfig: {
    digestDir: ".digest",
  },

  typescript: {
    strict: true,
  },
});
