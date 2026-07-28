export default async function handler(req, res) {
  // O Vercel passa o :id da URL para req.query.id por causa da config no vercel.json
  const { id } = req.query;

  const protocol = req.headers['x-forwarded-proto'] || 'http';
  const host = req.headers['x-forwarded-host'] || req.headers.host;
  const baseUrl = `${protocol}://${host}`;

  async function getFallbackHtml() {
    try {
      const resp = await fetch(`${baseUrl}/index.html`);
      return await resp.text();
    } catch (e) {
      return `<html><body>Erro ao carregar o aplicativo.</body></html>`;
    }
  }

  if (!id) {
    const html = await getFallbackHtml();
    return res.status(200).send(html);
  }

  try {
    // Busca dados do Firestore REST API usando o ID do clipe
    const projectId = 'paroni-fastclip';
    const firestoreUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/clips/${id}`;
    
    const dbRes = await fetch(firestoreUrl);
    
    if (!dbRes.ok) {
      const html = await getFallbackHtml();
      return res.status(200).send(html);
    }
    
    const data = await dbRes.json();
    const fields = data.fields;
    
    if (!fields) {
      const html = await getFallbackHtml();
      return res.status(200).send(html);
    }
    
    const videoUrl = fields.url ? fields.url.stringValue : '';
    const title = fields.title ? fields.title.stringValue : 'Clipe de FastClip';
    const thumbnail = fields.thumbnail ? fields.thumbnail.stringValue : '';
    
    // Busca o index.html real para manter o React App funcionando
    let html = await getFallbackHtml();
    
    // Injeta as meta tags de vídeo do Discord
    const metaTags = `
    <!-- Open Graph / Discord Meta Tags -->
    <meta property="og:title" content="${title.replace(/"/g, '&quot;')}" />
    <meta property="og:site_name" content="FastClip" />
    <meta property="og:description" content="Assista a este clipe incrível criado direto no navegador com FastClip!" />
    <meta property="og:video" content="${videoUrl}" />
    <meta property="og:video:secure_url" content="${videoUrl}" />
    <meta property="og:video:type" content="video/mp4" />
    <meta property="og:video:width" content="1280" />
    <meta property="og:video:height" content="720" />
    <meta property="og:type" content="video.other" />
    ${thumbnail ? `<meta property="og:image" content="${thumbnail}" />` : ''}
    <meta name="theme-color" content="#40afff" />
    <meta name="twitter:card" content="player" />
    <meta name="twitter:player" content="${videoUrl}" />
    `;
    
    // Injeta antes de fechar a head
    html = html.replace('</head>', `${metaTags}\n</head>`);
    // Também podemos substituir o <title> genérico pelo título do clipe
    html = html.replace('<title>Vite + React</title>', `<title>${title} - FastClip</title>`);
    
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.status(200).send(html);
  } catch (error) {
    console.error(error);
    const fallbackHtml = await getFallbackHtml();
    res.status(200).send(fallbackHtml);
  }
}
