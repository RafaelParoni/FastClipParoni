export default function handler(req, res) {
  const { path, rlkey } = req.query;

  if (!path) {
    return res.status(400).send("Caminho do arquivo não fornecido");
  }

  // Monta a URL oficial do Dropbox
  const dropboxUrl = `https://dl.dropboxusercontent.com/scl/fi/${path}?rlkey=${rlkey}&raw=1`;

  // HTML com as Open Graph Meta Tags pro Discord
  const html = `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Clipe - FastClip</title>
    
    <!-- Open Graph / Discord Meta Tags -->
    <meta property="og:title" content="Novo Clipe Criado!" />
    <meta property="og:site_name" content="FastClip" />
    <meta property="og:description" content="Crie seu clipe gratuitamente em fast-clip.vercel.app!" />
    <meta property="og:video" content="${dropboxUrl}" />
    <meta property="og:video:secure_url" content="${dropboxUrl}" />
    <meta property="og:video:type" content="video/mp4" />
    <meta property="og:type" content="video.other" />
    
    <meta name="theme-color" content="#40afff" /> <!-- Cor do embed no Discord (Azul) -->

    <!-- Redirecionamento Automático para o app para usuários reais clicarem -->
    <meta http-equiv="refresh" content="0; url=/?watch=${encodeURIComponent(path)}&rlkey=${rlkey}" />
    
    <style>
      body {
        background-color: #1a1a1a;
        color: white;
        font-family: 'Inter', sans-serif;
        display: flex;
        justify-content: center;
        align-items: center;
        height: 100vh;
        margin: 0;
      }
    </style>
</head>
<body>
    <div>
        <h2>Carregando clipe...</h2>
        <p>Se você não for redirecionado automaticamente, <a href="/?watch=${encodeURIComponent(path)}&rlkey=${rlkey}" style="color: #40afff;">clique aqui</a>.</p>
    </div>
</body>
</html>
  `;

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.status(200).send(html);
}
