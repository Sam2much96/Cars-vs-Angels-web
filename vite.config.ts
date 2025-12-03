import { defineConfig } from 'vite';

export default defineConfig({
    base: './',
    server: {
        open: true
    },
    resolve: {
        extensions: [".ts", ".js"]
    }
});
