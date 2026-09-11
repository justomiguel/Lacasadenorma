/**
 * Tailwind 4 en Next usa el plugin de PostCSS, no el de Vite.
 * La configuración de tokens vive en app/globals.css (`@theme`): en Tailwind 4
 * no hay tailwind.config.js, y si alguien lo crea no se descubre solo.
 */
const config = {
  plugins: {
    "@tailwindcss/postcss": {},
  },
};

export default config;
