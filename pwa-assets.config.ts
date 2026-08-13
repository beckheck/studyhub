import { defineConfig, minimal2023Preset } from '@vite-pwa/assets-generator/config'

export default defineConfig({
  root: process.cwd(),
  images: ['public/hearticon.svg'],
  preset: minimal2023Preset,
})
