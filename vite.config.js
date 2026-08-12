import { defineConfig } from 'vite'
import react, { reactCompilerPreset } from '@vitejs/plugin-react'
import babel from '@rolldown/plugin-babel'

// https://vite.dev/config/
export default defineConfig({
  base:
    globalThis.process?.env?.VITE_BASE_PATH || '/Hamster-Cloners/',
  plugins: [
    react(),
    babel({ presets: [reactCompilerPreset()] })
  ],
})
