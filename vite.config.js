import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Production build is deployed to https://<user>.github.io/<repo>/
// (set base to match the repository name for GitHub Pages “project site”.)
// https://vite.dev/guide/static-deploy.html#github-pages
export default defineConfig(({ mode }) => ({
  plugins: [react()],
  base: mode === 'development' ? '/' : '/v7-onboarding-flow/',
}))
