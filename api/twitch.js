let cachedToken = null;
let tokenExpiresAt = 0;

export default async function handler(req, res) {
  const { query } = req;
  const q = query.q;

  if (!q) {
    return res.status(400).json({ error: 'Faltando o parâmetro "q" de busca' });
  }

  const clientId = process.env.TWITCH_CLIENT_ID;
  const clientSecret = process.env.TWITCH_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    return res.status(500).json({ error: 'Credenciais da Twitch não configuradas no servidor (.env)' });
  }

  try {
    // 1. Obter ou reutilizar Token de Acesso da Twitch
    if (!cachedToken || Date.now() > tokenExpiresAt) {
      const tokenRes = await fetch(`https://id.twitch.tv/oauth2/token?client_id=${clientId}&client_secret=${clientSecret}&grant_type=client_credentials`, {
        method: 'POST'
      });
      
      const tokenData = await tokenRes.json();
      
      if (!tokenRes.ok) {
        throw new Error(tokenData.message || 'Erro ao autenticar com a Twitch');
      }

      cachedToken = tokenData.access_token;
      // Expira em (expires_in - 300 segundos) para dar margem de segurança
      tokenExpiresAt = Date.now() + ((tokenData.expires_in - 300) * 1000);
    }

    // 2. Buscar jogos (categorias)
    const searchRes = await fetch(`https://api.twitch.tv/helix/search/categories?query=${encodeURIComponent(q)}&first=10`, {
      headers: {
        'Client-ID': clientId,
        'Authorization': `Bearer ${cachedToken}`
      }
    });

    const searchData = await searchRes.json();

    if (!searchRes.ok) {
      throw new Error(searchData.message || 'Erro ao buscar jogos');
    }

    // 3. Formatamos os dados para enviar para o FrontEnd (ajustando o box art)
    const games = searchData.data.map(game => ({
      id: game.id,
      name: game.name,
      // O Twitch retorna "https://.../{width}x{height}.jpg", vamos trocar por algo padrão
      boxArt: game.box_art_url.replace('{width}', '144').replace('{height}', '192')
    }));

    return res.status(200).json({ games });

  } catch (error) {
    console.error('Twitch API Error:', error);
    return res.status(500).json({ error: error.message });
  }
}
