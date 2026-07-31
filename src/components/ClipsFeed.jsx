import { useState, useEffect } from 'react';
import { db } from '../services/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';

export default function ClipsFeed({ onBack }) {
  const [myClips, setMyClips] = useState([]);
  const [publicClips, setPublicClips] = useState([]);
  const [loading, setLoading] = useState(true);

  const [myClipsPage, setMyClipsPage] = useState(1);
  const [publicClipsPage, setPublicClipsPage] = useState(1);
  
  // Filtros
  const [sortOrder, setSortOrder] = useState('newest');
  const [dateStart, setDateStart] = useState('');
  const [dateEnd, setDateEnd] = useState('');
  const [selectedGame, setSelectedGame] = useState('Todos');
  
  const MY_CLIPS_PER_PAGE = 10;
  const PUBLIC_CLIPS_PER_PAGE = 15;

  useEffect(() => {
    async function fetchClips() {
      try {
        setLoading(true);
        // 1. Buscar o IP do usuário
        let userIp = '0.0.0.0';
        try {
          const res = await fetch('https://api.ipify.org?format=json');
          const data = await res.json();
          userIp = data.ip;
        } catch (e) {
          console.warn("Could not fetch IP for Feed");
        }

        const clipsRef = collection(db, 'clips');

        // 2. Buscar Meus Clips (por IP)
        const myClipsQuery = query(clipsRef, where('ip', '==', userIp));
        const myClipsSnap = await getDocs(myClipsQuery);
        let myClipsData = [];
        myClipsSnap.forEach(doc => {
          myClipsData.push({ id: doc.id, ...doc.data() });
        });

        // 3. Buscar Clips Públicos
        const publicQuery = query(clipsRef, where('privacy', '==', true));
        const publicSnap = await getDocs(publicQuery);
        let publicData = [];
        publicSnap.forEach(doc => {
          // Evita duplicar se o vídeo público for do próprio usuário
          if (doc.data().ip !== userIp) {
            publicData.push({ id: doc.id, ...doc.data() });
          }
        });

        // Ordenar localmente por data de criação (evita exigir Índices complexos no Firebase)
        myClipsData.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        publicData.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

        setMyClips(myClipsData);
        setPublicClips(publicData);
      } catch (error) {
        console.error("Erro ao buscar clips: ", error);
      } finally {
        setLoading(false);
      }
    }

    fetchClips();
  }, []);

  const handleCardClick = (id) => {
    window.location.href = `/clips/watch/${id}`;
  };

  // Cálculo de jogos disponíveis
  const allClips = [...myClips, ...publicClips];
  const availableGames = ['Todos', ...new Set(allClips.map(c => c.gameName || 'Desconhecido'))];

  // Função central de filtragem e ordenação
  const filterAndSortClips = (clips) => {
    let filtered = [...clips];
    
    if (selectedGame !== 'Todos') {
      filtered = filtered.filter(c => (c.gameName || 'Desconhecido') === selectedGame);
    }
    if (dateStart) {
      const start = new Date(dateStart).getTime();
      filtered = filtered.filter(c => new Date(c.createdAt).getTime() >= start);
    }
    if (dateEnd) {
      const end = new Date(dateEnd);
      end.setHours(23, 59, 59, 999);
      filtered = filtered.filter(c => new Date(c.createdAt).getTime() <= end.getTime());
    }
    
    filtered.sort((a, b) => {
      const timeA = new Date(a.createdAt).getTime();
      const timeB = new Date(b.createdAt).getTime();
      return sortOrder === 'newest' ? timeB - timeA : timeA - timeB;
    });
    
    return filtered;
  };

  // Aplicação dos filtros
  const filteredMyClips = filterAndSortClips(myClips);
  const filteredPublicClips = filterAndSortClips(publicClips);

  // Paginação com base nos resultados filtrados
  const totalMyPages = Math.ceil(filteredMyClips.length / MY_CLIPS_PER_PAGE);
  const currentMyClips = filteredMyClips.slice((myClipsPage - 1) * MY_CLIPS_PER_PAGE, myClipsPage * MY_CLIPS_PER_PAGE);

  const totalPublicPages = Math.ceil(filteredPublicClips.length / PUBLIC_CLIPS_PER_PAGE);
  const currentPublicClips = filteredPublicClips.slice((publicClipsPage - 1) * PUBLIC_CLIPS_PER_PAGE, publicClipsPage * PUBLIC_CLIPS_PER_PAGE);

  return (
    <div className="editor-layout" style={{ display: 'block', overflowY: 'auto' }}>
      <div className="editor-header">
        <span className="logo" onClick={onBack} style={{ cursor: 'pointer' }}>
          <img src="/favicon.ico" alt="Logo" className="site-icon" /> FastClip<span className="author-name">Paroni</span>
        </span>
        <nav className="header-nav">
          <a href="/">🏠 Início</a>
          <a href="/clips">🌍 Clips</a>
          <a href="/">✂️ Criar clip</a>
        </nav>
        <div className="header-actions">
          <div className="social-links-header">
            <a href="https://www.instagram.com/rafael_paroni" target="_blank" rel="noopener noreferrer" title="Instagram">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line></svg>
            </a>
            <a href="https://github.com/RafaelParoni" target="_blank" rel="noopener noreferrer" title="GitHub">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"></path></svg>
            </a>
          </div>
        </div>
      </div>

      <div className="feed-container" style={{ maxWidth: '1200px', margin: '0 auto', padding: '2rem' }}>
        <h1 style={{ color: '#fff', fontSize: '2.5rem', marginBottom: '2rem', textAlign: 'center' }}>Galeria de Clipes</h1>

        {/* Painel de Filtros */}
        <div style={{ 
          background: 'rgba(255, 255, 255, 0.05)', 
          padding: '1.5rem', 
          borderRadius: '12px', 
          marginBottom: '2.5rem',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          display: 'flex',
          flexWrap: 'wrap',
          gap: '1.5rem',
          alignItems: 'flex-end'
        }}>
          <div style={{ flex: '1 1 200px' }}>
            <label style={{ display: 'block', color: '#a0a0a0', marginBottom: '0.5rem', fontSize: '0.9rem' }}>🎮 Filtrar por Jogo:</label>
            <select 
              value={selectedGame} 
              onChange={(e) => { setSelectedGame(e.target.value); setMyClipsPage(1); setPublicClipsPage(1); }}
              style={{ width: '100%', padding: '0.8rem', borderRadius: '4px', border: '1px solid #444', background: '#111', color: '#fff' }}
            >
              {availableGames.map(game => (
                <option key={game} value={game}>{game}</option>
              ))}
            </select>
          </div>

          <div style={{ flex: '1 1 200px' }}>
            <label style={{ display: 'block', color: '#a0a0a0', marginBottom: '0.5rem', fontSize: '0.9rem' }}>📅 Ordenação:</label>
            <select 
              value={sortOrder} 
              onChange={(e) => { setSortOrder(e.target.value); setMyClipsPage(1); setPublicClipsPage(1); }}
              style={{ width: '100%', padding: '0.8rem', borderRadius: '4px', border: '1px solid #444', background: '#111', color: '#fff' }}
            >
              <option value="newest">Mais Novos Primeiro</option>
              <option value="oldest">Mais Antigos Primeiro</option>
            </select>
          </div>

          <div style={{ flex: '2 1 300px', display: 'flex', gap: '1rem' }}>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', color: '#a0a0a0', marginBottom: '0.5rem', fontSize: '0.9rem' }}>De:</label>
              <input 
                type="date" 
                value={dateStart} 
                onChange={(e) => { setDateStart(e.target.value); setMyClipsPage(1); setPublicClipsPage(1); }}
                style={{ width: '100%', padding: '0.8rem', borderRadius: '4px', border: '1px solid #444', background: '#111', color: '#fff', colorScheme: 'dark' }}
              />
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', color: '#a0a0a0', marginBottom: '0.5rem', fontSize: '0.9rem' }}>Até:</label>
              <input 
                type="date" 
                value={dateEnd} 
                onChange={(e) => { setDateEnd(e.target.value); setMyClipsPage(1); setPublicClipsPage(1); }}
                style={{ width: '100%', padding: '0.8rem', borderRadius: '4px', border: '1px solid #444', background: '#111', color: '#fff', colorScheme: 'dark' }}
              />
            </div>
          </div>
          
          <div style={{ flex: '0 0 auto' }}>
            <button 
              className="btn btn-secondary"
              onClick={() => {
                setSelectedGame('Todos');
                setSortOrder('newest');
                setDateStart('');
                setDateEnd('');
                setMyClipsPage(1);
                setPublicClipsPage(1);
              }}
              style={{ padding: '0.8rem 1.5rem', height: '100%' }}
            >
              Limpar Filtros
            </button>
          </div>
        </div>

        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: '4rem' }}>
             <div className="loading-spinner" />
             <p style={{ marginTop: '1rem', color: '#a0a0a0' }}>Carregando clipes maravilhosos...</p>
          </div>
        ) : (
          <>
            {/* Meus Clips Section */}
            {filteredMyClips.length > 0 && (
              <section style={{ marginBottom: '4rem' }}>
                <h2 style={{ color: '#4cb5ff', borderBottom: '2px solid rgba(76, 181, 255, 0.2)', paddingBottom: '0.5rem', marginBottom: '1.5rem' }}>
                  👤 Meus Clipes
                </h2>
                <div className="clip-grid">
                  {currentMyClips.map(clip => (
                    <div key={clip.id} className="clip-card" onClick={() => handleCardClick(clip.id)}>
                      <div className="clip-card-thumb" style={clip.thumbnail ? { backgroundImage: `url(${clip.thumbnail})`, backgroundSize: 'cover', backgroundPosition: 'center' } : {}}>
                        <span className="play-icon">▶</span>
                      </div>
                      <div className="clip-card-info">
                        <h3>{clip.title}</h3>
                        <p style={{ color: '#a0a0a0', fontSize: '0.8rem', marginBottom: '4px' }}>
                          🎮 {clip.gameName || 'Desconhecido'}
                        </p>
                        <p>{new Date(clip.createdAt).toLocaleDateString('pt-BR')}</p>
                        {!clip.privacy && <span className="badge badge-private">Não Listado</span>}
                        {clip.privacy && <span className="badge badge-public">Público</span>}
                      </div>
                    </div>
                  ))}
                </div>
                {totalMyPages > 1 && (
                  <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', marginTop: '1.5rem' }}>
                    <button className="btn btn-secondary" disabled={myClipsPage === 1} onClick={() => setMyClipsPage(p => p - 1)}>Anterior</button>
                    <span style={{ color: '#a0a0a0', alignSelf: 'center' }}>Página {myClipsPage} de {totalMyPages}</span>
                    <button className="btn btn-secondary" disabled={myClipsPage === totalMyPages} onClick={() => setMyClipsPage(p => p + 1)}>Próxima</button>
                  </div>
                )}
              </section>
            )}

            {/* Clips Públicos Section */}
            <section>
              <h2 style={{ color: '#f59e0b', borderBottom: '2px solid rgba(245, 158, 11, 0.2)', paddingBottom: '0.5rem', marginBottom: '1.5rem' }}>
                🌍 Explorar Clipes da Comunidade
              </h2>
              {filteredPublicClips.length === 0 ? (
                <p style={{ color: '#888' }}>Nenhum clipe público correspondente aos filtros foi encontrado.</p>
              ) : (
                <div className="clip-grid">
                  {currentPublicClips.map(clip => (
                    <div key={clip.id} className="clip-card" onClick={() => handleCardClick(clip.id)}>
                      <div className="clip-card-thumb public-thumb" style={clip.thumbnail ? { backgroundImage: `url(${clip.thumbnail})`, backgroundSize: 'cover', backgroundPosition: 'center' } : {}}>
                        <span className="play-icon">▶</span>
                      </div>
                      <div className="clip-card-info">
                        <h3>{clip.title}</h3>
                        <p style={{ color: '#a0a0a0', fontSize: '0.8rem', marginBottom: '4px' }}>
                          🎮 {clip.gameName || 'Desconhecido'}
                        </p>
                        <p>{new Date(clip.createdAt).toLocaleDateString('pt-BR')}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {totalPublicPages > 1 && (
                <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', marginTop: '1.5rem' }}>
                  <button className="btn btn-secondary" disabled={publicClipsPage === 1} onClick={() => setPublicClipsPage(p => p - 1)}>Anterior</button>
                  <span style={{ color: '#a0a0a0', alignSelf: 'center' }}>Página {publicClipsPage} de {totalPublicPages}</span>
                  <button className="btn btn-secondary" disabled={publicClipsPage === totalPublicPages} onClick={() => setPublicClipsPage(p => p + 1)}>Próxima</button>
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </div>
  );
}
