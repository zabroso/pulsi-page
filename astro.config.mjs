import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';

export default defineConfig({
  site: 'https://pulsi-2e80d.web.app',
  integrations: [tailwind()],
});
