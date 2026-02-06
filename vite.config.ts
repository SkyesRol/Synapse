import { defineConfig } from 'vite';
import electron from 'vite-plugin-electron/simple';
import react from '@vitejs/plugin-react';
import path from 'path';
import SourcePath from './plugins/babel-plugin-add-source';
export default defineConfig({
  plugins: [
    react({
      babel: {
        plugins: [SourcePath],
      },

    }),
    electron({
      main: {
        entry: 'src/main/main.ts',
      },
      preload: {
        input: 'src/main/preload.ts',
      },
      renderer: {},
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  }
});
