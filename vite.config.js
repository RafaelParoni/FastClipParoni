import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { pathToFileURL } from 'url'

// Plugin para rodar as funções Serverless da Vercel no ambiente local do Vite
const vercelApiPlugin = (env) => ({
  name: 'vercel-api-plugin',
  configureServer(server) {
    server.middlewares.use(async (req, res, next) => {
      if (req.url.startsWith('/api/twitch')) {
        try {
          // Carregar variáveis do .env no process.env para simular a Vercel
          process.env.TWITCH_CLIENT_ID = env.TWITCH_CLIENT_ID;
          process.env.TWITCH_CLIENT_SECRET = env.TWITCH_CLIENT_SECRET;
          
          const modulePath = path.resolve(process.cwd(), 'api/twitch.js');
          const moduleUrl = pathToFileURL(modulePath).href + '?t=' + Date.now();
          const module = await import(moduleUrl);
          const handler = module.default;
          
          const url = new URL(req.url, `http://${req.headers.host}`);
          req.query = Object.fromEntries(url.searchParams);
          
          // Simular helpers do Vercel
          res.status = (code) => { res.statusCode = code; return res; };
          res.json = (data) => {
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify(data));
          };
          
          await handler(req, res);
        } catch (e) {
          console.error('Erro na API Local:', e);
          res.statusCode = 500;
          res.end(JSON.stringify({ error: e.message }));
        }
        return;
      }
      next();
    });
  }
});

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  return {
    plugins: [react(), vercelApiPlugin(env)],
    optimizeDeps: {
      exclude: ['@ffmpeg/ffmpeg', '@ffmpeg/util'],
    },
  };
});
