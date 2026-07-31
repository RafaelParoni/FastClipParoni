import { useRef, useState } from 'react';

export default function DropboxUploadModal({ 
  status, // 'metadata', 'connecting', 'uploading', 'generating', 'success', 'error'
  progress, // 0 to 100
  link, // generated link
  errorMessage,
  onClose,
  onStartUpload
}) {
  const linkInputRef = useRef(null);
  const [title, setTitle] = useState('');
  const [isPublic, setIsPublic] = useState(true);

  // Estados para busca de jogo
  const [gameSearch, setGameSearch] = useState('');
  const [gameResults, setGameResults] = useState([]);
  const [selectedGame, setSelectedGame] = useState(null);
  const [isSearchingGame, setIsSearchingGame] = useState(false);
  const searchTimeoutRef = useRef(null);

  const searchGames = async (query) => {
    if (!query) {
      setGameResults([]);
      return;
    }
    setIsSearchingGame(true);
    try {
      const res = await fetch(`/api/twitch?q=${encodeURIComponent(query)}`);
      if (res.ok) {
        const data = await res.json();
        setGameResults(data.games || []);
      }
    } catch (err) {
      console.error('Erro ao buscar jogos', err);
    } finally {
      setIsSearchingGame(false);
    }
  };

  const handleGameSearchChange = (e) => {
    const val = e.target.value;
    setGameSearch(val);
    setSelectedGame(null); // Reseta a seleção se ele voltar a digitar
    
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    
    searchTimeoutRef.current = setTimeout(() => {
      searchGames(val);
    }, 500); // Debounce de 500ms
  };

  const handleSelectGame = (game) => {
    setSelectedGame(game);
    setGameSearch(game.name);
    setGameResults([]); // Esconde a lista
  };

  const copyToClipboard = () => {
    if (linkInputRef.current) {
      linkInputRef.current.select();
      document.execCommand('copy');
    }
  };

  const handleStart = () => {
    if (!title.trim()) {
      alert('Por favor, insira um título para o vídeo.');
      return;
    }
    if (onStartUpload) {
      onStartUpload(title, isPublic, selectedGame);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <h2>Compartilhar Vídeo</h2>
          {status !== 'uploading' && status !== 'generating' && (
             <button className="btn btn-secondary" onClick={onClose}>✕</button>
          )}
        </div>
        
        <div className="modal-body" style={{ textAlign: 'center', padding: '2rem 1rem' }}>
          {status === 'metadata' && (
            <div style={{ textAlign: 'left', maxWidth: '400px', margin: '0 auto' }}>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Título do Vídeo:</label>
                <input 
                  type="text" 
                  value={title} 
                  onChange={(e) => setTitle(e.target.value)} 
                  placeholder="Ex: Minha Gameplay Épica"
                  style={{ width: '100%', padding: '0.8rem', borderRadius: '4px', border: '1px solid #444', background: '#111', color: '#fff' }}
                />
              </div>

              <div style={{ marginBottom: '1rem', position: 'relative' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Jogo (Twitch):</label>
                <input 
                  type="text" 
                  value={gameSearch} 
                  onChange={handleGameSearchChange} 
                  placeholder="Ex: Valorant"
                  style={{ width: '100%', padding: '0.8rem', borderRadius: '4px', border: selectedGame ? '1px solid #0061FE' : '1px solid #444', background: '#111', color: '#fff' }}
                />
                
                {/* Lista de Autocomplete */}
                {gameSearch && !selectedGame && (
                  <div style={{ 
                    position: 'absolute', top: '100%', left: 0, right: 0, 
                    backgroundColor: '#1a1a1a', border: '1px solid #444', 
                    borderRadius: '4px', marginTop: '4px', zIndex: 10,
                    maxHeight: '200px', overflowY: 'auto',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.5)'
                  }}>
                    {isSearchingGame ? (
                      <div style={{ padding: '1rem', textAlign: 'center', color: '#888' }}>Buscando...</div>
                    ) : gameResults.length > 0 ? (
                      gameResults.map(game => (
                        <div 
                          key={game.id} 
                          onClick={() => handleSelectGame(game)}
                          style={{ 
                            display: 'flex', alignItems: 'center', gap: '10px', 
                            padding: '0.5rem 1rem', cursor: 'pointer', borderBottom: '1px solid #333'
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#333'}
                          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                        >
                          <img src={game.boxArt} alt={game.name} style={{ width: '32px', height: '43px', objectFit: 'cover', borderRadius: '4px' }} />
                          <span style={{ fontSize: '0.9rem' }}>{game.name}</span>
                        </div>
                      ))
                    ) : (
                      <div style={{ padding: '1rem', textAlign: 'center', color: '#888' }}>Nenhum jogo encontrado.</div>
                    )}
                  </div>
                )}
                {selectedGame && (
                  <div style={{ fontSize: '0.8rem', color: '#0061FE', marginTop: '0.3rem' }}>✅ Jogo Selecionado</div>
                )}
              </div>
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Privacidade:</label>
                <select 
                  value={isPublic ? 'true' : 'false'} 
                  onChange={(e) => setIsPublic(e.target.value === 'true')}
                  style={{ width: '100%', padding: '0.8rem', borderRadius: '4px', border: '1px solid #444', background: '#111', color: '#fff' }}
                >
                  <option value="true">Público (Qualquer um com o link)</option>
                  <option value="false">Não Listado (Apenas quem tem o link)</option>
                </select>
              </div>
              <button className="btn btn-primary" style={{ width: '100%', padding: '1rem', backgroundColor: '#0061FE' }} onClick={handleStart}>
                Iniciar Upload
              </button>
            </div>
          )}

          {status === 'connecting' && (
            <div>
              <div className="loading-spinner" style={{ margin: '0 auto 1rem', borderColor: 'rgba(255,255,255,0.2)', borderTopColor: '#0061FE' }} />
              <p>Conectando ao Dropbox...</p>
            </div>
          )}

          {status === 'uploading' && (
            <div>
              <div className="loading-spinner" style={{ margin: '0 auto 1rem', borderColor: 'rgba(255,255,255,0.2)', borderTopColor: '#0061FE' }} />
              <p>Enviando vídeo para o Dropbox... {Math.round(progress)}%</p>
              <div className="progress-bar-container" style={{ marginTop: '1rem' }}>
                <div className="progress-bar-fill" style={{ width: `${progress}%`, backgroundColor: '#0061FE' }} />
              </div>
            </div>
          )}

          {status === 'generating' && (
            <div>
              <div className="loading-spinner" style={{ margin: '0 auto 1rem', borderColor: 'rgba(255,255,255,0.2)', borderTopColor: '#0061FE' }} />
              <p>Gerando link compartilhável...</p>
            </div>
          )}

          {status === 'error' && (
            <div>
              <span style={{ fontSize: '3rem', display: 'block', marginBottom: '1rem' }}>❌</span>
              <p style={{ color: '#ff4d4f' }}>Erro: {errorMessage}</p>
            </div>
          )}

          {status === 'success' && link && (
            <div>
              <span style={{ fontSize: '3rem', display: 'block', marginBottom: '1rem' }}>✅</span>
              <p>Vídeo enviado com sucesso!</p>
              <p style={{ fontSize: '0.9rem', color: '#888', marginBottom: '1rem' }}>Este link foi modificado para reprodução automática no Discord.</p>
              
              <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
                <input 
                  ref={linkInputRef}
                  type="text" 
                  value={link} 
                  readOnly 
                  style={{ 
                    flex: 1, 
                    padding: '0.5rem', 
                    borderRadius: '4px', 
                    border: '1px solid #444', 
                    backgroundColor: '#111', 
                    color: '#fff' 
                  }} 
                />
                <button className="btn btn-primary" onClick={copyToClipboard} style={{ backgroundColor: '#0061FE' }}>
                  Copiar Link
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
