import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite'

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, process.cwd(), '');
    const gaId = env.VITE_GA_ID || '';
    const ymId = env.VITE_YM_ID || '';

    // GA4 snippet — only injected when VITE_GA_ID is set
    const ga4Script = gaId ? `
    <!-- Google Analytics 4 -->
    <script async src="https://www.googletagmanager.com/gtag/js?id=${gaId}"></script>
    <script>
      window.dataLayer = window.dataLayer || [];
      function gtag(){dataLayer.push(arguments);}
      gtag('js', new Date());
      gtag('config', '${gaId}');
    </script>` : '';

    // Yandex Metrica snippet — only injected when VITE_YM_ID is set
    const ymScript = ymId ? `
    <!-- Yandex Metrica -->
    <script type="text/javascript">
      (function(m,e,t,r,i,k,a){m[i]=m[i]||function(){(m[i].a=m[i].a||[]).push(arguments)};
      m[i].l=1*new Date();
      for(var j=0;j<document.scripts.length;j++){if(document.scripts[j].src===r){return;}}
      k=e.createElement(t),a=e.getElementsByTagName(t)[0],k.async=1,k.src=r,a.parentNode.insertBefore(k,a)})
      (window, document, "script", "https://mc.yandex.ru/metrika/tag.js", "ym");
      ym(${ymId}, "init", {
        clickmap: true,
        trackLinks: true,
        accurateTrackBounce: true,
        webvisor: true
      });
    </script>
    <noscript><div><img src="https://mc.yandex.ru/watch/${ymId}" style="position:absolute; left:-9999px;" alt="" /></div></noscript>` : '';

    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      plugins: [react(), tailwindcss()],
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      },
      // Inject analytics scripts into the built index.html
      ...(ga4Script || ymScript ? {
        transformIndexHtml: {
          order: 'post' as const,
          handler(html: string) {
            return html.replace(
              '<!-- GA4 is injected at build time via env var; script is omitted if VITE_GA_ID is not set -->',
              ga4Script.trim()
            ).replace(
              '<!-- Yandex Metrica is injected at build time via env var; script is omitted if VITE_YM_ID is not set -->',
              ymScript.trim()
            );
          }
        }
      } : {})
    };
});
