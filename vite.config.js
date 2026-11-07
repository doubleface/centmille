import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const inlineBundle = () => ({
  name: 'inline-bundle',
  apply: 'build',
  enforce: 'post',
  transformIndexHtml(html, { bundle }) {
    if (!bundle) return html
    let out = html
    for (const [fileName, chunk] of Object.entries(bundle)) {
      if (chunk.type === 'chunk' && fileName.endsWith('.js')) {
        out = out.replace(
          new RegExp(`<script[^>]*src="[./]*${fileName}"[^>]*></script>`),
          () =>
            `<script type="module">${chunk.code.replace(/<\/script>/gi, '<\\/script>')}</script>`
        )
        delete bundle[fileName]
      } else if (chunk.type === 'asset' && fileName.endsWith('.css')) {
        out = out.replace(
          new RegExp(`<link[^>]*href="[./]*${fileName}"[^>]*>`),
          () => `<style>${chunk.source}</style>`
        )
        delete bundle[fileName]
      }
    }
    return out
  },
})

export default defineConfig({
  base: './',
  plugins: [react(), inlineBundle()],
  preview: {
    allowedHosts: true,
    headers: {
      'Cache-Control': 'public, max-age=3600',
    },
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
})
