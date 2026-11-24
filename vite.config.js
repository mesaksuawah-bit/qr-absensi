import { defineConfig } from 'vite';
// base './' + hash routing => berjalan di GitHub Pages dengan nama repo apa pun
export default defineConfig({ base: './', build: { target: 'es2022' } });
