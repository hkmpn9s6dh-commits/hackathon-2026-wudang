import { defineConfig } from 'vite';

// One page, one bundle, no runtime network. `base: './'` so the same build runs
// from a domain root or from /hackathon-2026-wudang/ on GitHub Pages.
export default defineConfig({
  base: './',
  build: {
    target: 'es2022',
    assetsInlineLimit: 0,
    cssCodeSplit: false,
    reportCompressedSize: true,
  },
});
