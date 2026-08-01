export default async function handler(req, res) {
  const { id } = req.query;

  if (!id) {
    return res.status(400).send("ID não fornecido");
  }

  try {
    const projectId = 'paroni-fastclip';
    const firestoreUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/clips/${id}`;
    
    const dbRes = await fetch(firestoreUrl);
    
    if (!dbRes.ok) {
      return res.status(404).send("Clipe não encontrado");
    }
    
    const data = await dbRes.json();
    const fields = data.fields;
    
    if (!fields) {
      return res.status(404).send("Clipe vazio");
    }
    
    let videoUrl = fields.url ? fields.url.stringValue : '';
    
    // Truque para o Discord: forçar a extensão .mp4 no Google Drive para o crawler não barrar o embed
    if (videoUrl.includes('drive.google.com') && !videoUrl.endsWith('.mp4')) {
       videoUrl += '&ext=.mp4';
    }
    
    const title = fields.title ? fields.title.stringValue : 'Clipe de FastClip';
    const thumbnail = fields.thumbnail ? fields.thumbnail.stringValue : '';
    
    const html = `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <title>${title.replace(/"/g, '&quot;')} - FastClip</title>
    
    <!-- Open Graph / Discord Meta Tags -->
    <meta property="og:title" content="${title.replace(/"/g, '&quot;')}" />
    <meta property="og:site_name" content="FastClip" />
    <meta property="og:description" content="Assista a este clipe incrível criado direto no navegador com FastClip!" />
    <meta property="og:video" content="${videoUrl}" />
    <meta property="og:video:secure_url" content="${videoUrl}" />
    <meta property="og:video:type" content="video/mp4" />
    <meta property="og:type" content="video.other" />
    ${thumbnail ? `<meta property="og:image" content="${thumbnail}" />` : ''}
    <meta name="theme-color" content="#40afff" />
    
    <meta name="twitter:card" content="player" />
    <meta name="twitter:player" content="${videoUrl}" />
</head>
<body>
    <p>Acesse o FastClip para assistir a este vídeo!</p>
</body>
</html>
    `;
    
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.status(200).send(html);
  } catch (error) {
    console.error(error);
    res.status(500).send("Erro no servidor");
  }
}
