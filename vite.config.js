import { resolve } from 'node:path';
import { defineConfig } from 'vite';

export default defineConfig({
    build: {
        rollupOptions: {
            input: {
                index: resolve(__dirname, 'index.html'),
                'about/index': resolve(__dirname, 'about/index.html'),
                'careers/index': resolve(__dirname, 'careers/index.html'),
                'contact/index': resolve(__dirname, 'contact/index.html'),
                'news/index': resolve(__dirname, 'news/index.html'),
                'news/articles/industrial-tool-cabinet-configuration-guide/index': resolve(__dirname, 'news/articles/industrial-tool-cabinet-configuration-guide/index.html'),
                'oem-odm/index': resolve(__dirname, 'oem-odm/index.html'),
                'products/index': resolve(__dirname, 'products/index.html'),
                'products/detail': resolve(__dirname, 'products/detail.html'),
                'projects/index': resolve(__dirname, 'projects/index.html')
            }
        }
    }
});
