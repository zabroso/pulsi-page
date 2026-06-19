import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';

export default defineConfig({
  site: 'https://zabroso.github.io',
  base: process.env.GITHUB_ACTIONS ? '/pulsi-page' : undefined,
  integrations: [tailwind()],
});
