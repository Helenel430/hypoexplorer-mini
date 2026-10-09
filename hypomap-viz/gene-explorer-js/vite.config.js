import { defineConfig } from 'vite';
import { createReadStream } from 'node:fs';
import { cp, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

const exportDirectory = fileURLToPath(new URL('../../navigation_export/', import.meta.url));
export default defineConfig({
  plugins: [{
    name: 'navigation-export',
    configureServer(server) {
      server.middlewares.use('/navigation_export', (req, res, next) => {
        const name = (req.url || '').split('?')[0].slice(1);
        if (!/^(manifest\.json|[a-z0-9-]+\.json\.gz)$/.test(name)) return next();
        // Serve compressed bytes without Content-Encoding; the client detects gzip.
        const stream = createReadStream(resolve(exportDirectory, name));
        stream.on('error', () => { res.statusCode = 404; res.end('Export file not found'); });
        stream.pipe(res);
      });
    },
    async closeBundle() {
      await mkdir('dist/navigation_export', { recursive: true });
      await cp(exportDirectory, 'dist/navigation_export', { recursive: true });
      await cp(fileURLToPath(new URL('./gene-descriptions.mjs', import.meta.url)), 'dist/gene-descriptions.mjs');
    },
  }],
});
