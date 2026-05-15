import path from 'path';
import { createRequire } from 'module';
import type { IncomingMessage, ServerResponse } from 'http';
import { defineConfig, loadEnv, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';

const require = createRequire(import.meta.url);

const localApiRoutes: Record<string, string> = {
  '/api/maxicash/deposit/initiate': '/api/maxicash-deposit-initiate.js',
  '/api/maxicash/deposit/status': '/api/maxicash-deposit-status.js',
  '/api/maxicash/withdraw/mobile-money': '/api/maxicash-withdraw-mobile-money.js',
  '/api/paypal/link/start': '/api/paypal-link-start.js',
  '/api/paypal/link/complete': '/api/paypal-link-complete.js',
  '/api/paypal/payout/create': '/api/paypal-payout-create.js',
};

async function readRequestBody(req: IncomingMessage) {
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  const rawBody = Buffer.concat(chunks).toString('utf8');
  if (!rawBody) return {};

  const contentType = String(req.headers['content-type'] || '');
  if (contentType.includes('application/json')) {
    return JSON.parse(rawBody);
  }

  return rawBody;
}

function createApiResponse(res: ServerResponse) {
  return {
    setHeader: (name: string, value: string | string[]) => res.setHeader(name, value),
    status: (code: number) => {
      res.statusCode = code;
      return {
        json: (body: any) => {
          if (!res.headersSent) {
            res.setHeader('Content-Type', 'application/json; charset=utf-8');
          }
          res.end(JSON.stringify(body));
        },
        end: () => res.end(),
      };
    },
  };
}

function localApiPlugin(): Plugin {
  return {
    name: 'moni-local-api',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const pathname = new URL(req.url || '/', 'http://localhost').pathname;
        const modulePath = localApiRoutes[pathname];
        if (!modulePath) return next();

        try {
          const body = await readRequestBody(req);
          const absoluteModulePath = path.resolve(__dirname, modulePath.replace(/^\//, ''));
          let apiModule: any;

          if (modulePath.endsWith('.js')) {
            delete require.cache[require.resolve(absoluteModulePath)];
            apiModule = require(absoluteModulePath);
          } else {
            apiModule = await server.ssrLoadModule(modulePath);
          }

          const handler = apiModule.default || apiModule;

          if (typeof handler !== 'function') {
            throw new Error(`Aucun handler API pour ${pathname}`);
          }

          await handler(
            {
              method: req.method,
              headers: req.headers,
              body,
            },
            createApiResponse(res)
          );
        } catch (error: any) {
          console.error(`Erreur API locale ${pathname}:`, error);
          if (!res.headersSent) {
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json; charset=utf-8');
            res.end(JSON.stringify({ success: false, error: error?.message || 'Erreur API locale.' }));
          }
        }
      });
    },
  };
}

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    Object.entries(env).forEach(([key, value]) => {
      process.env[key] ||= value;
    });

    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      plugins: [localApiPlugin(), react()],
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});
