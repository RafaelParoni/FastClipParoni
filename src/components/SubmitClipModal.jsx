import { useRef, useState, useEffect } from 'react';
import { db } from '../services/firebase';
import { collection, addDoc } from 'firebase/firestore';

export default function SubmitClipModal({ onClose, onSuccess }) {
  const [activeTab, setActiveTab] = useState('link'); // 'link' | 'file'
  
  const [title, setTitle] = useState('');
  const [link, setLink] = useState('');
  const [videoFile, setVideoFile] = useState(null);
  const [isPublic, setIsPublic] = useState(true);
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatus, setUploadStatus] = useState(''); // 'auth', 'uploading', 'generating', ''

  // Estados para busca de jogo
  const [gameSearch, setGameSearch] = useState('');
  const [gameResults, setGameResults] = useState([]);
  const [selectedGame, setSelectedGame] = useState(null);
  const [isSearchingGame, setIsSearchingGame] = useState(false);
  const searchTimeoutRef = useRef(null);

  const pendingFileRef = useRef(null);
  const metadataRef = useRef({ title, selectedGame, isPublic });

  useEffect(() => {
    metadataRef.current = { title, selectedGame, isPublic };
  }, [title, selectedGame, isPublic]);

  // Escuta o retorno do OAuth do Dropbox
  useEffect(() => {
    function handleMessage(event) {
      if (event.origin !== window.location.origin) return;
      if (event.data.type === 'dropbox-auth-success') {
        localStorage.setItem('dropbox_token', event.data.token);
        if (pendingFileRef.current) {
          startDropboxUpload(pendingFileRef.current, event.data.token);
          pendingFileRef.current = null;
        }
      } else if (event.data.type === 'dropbox-auth-error') {
        alert('Autenticação falhou: ' + event.data.error);
        setIsSubmitting(false);
        setUploadStatus('');
      }
    }
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

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
    setSelectedGame(null);
    
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    
    searchTimeoutRef.current = setTimeout(() => {
      searchGames(val);
    }, 500);
  };

  const handleSelectGame = (game) => {
    setSelectedGame(game);
    setGameSearch(game.name);
    setGameResults([]);
  };

  const saveToFirebase = async (videoUrl) => {
    try {
      let userIp = '0.0.0.0';
      try {
        const res = await fetch('https://api.ipify.org?format=json');
        const data = await res.json();
        userIp = data.ip;
      } catch (e) {
        console.warn("Could not fetch IP", e);
      }

      const meta = metadataRef.current;

      const clipData = {
        title: meta.title,
        url: videoUrl,
        thumbnail: meta.selectedGame ? meta.selectedGame.boxArt : null,
        privacy: meta.isPublic,
        createdAt: new Date().toISOString(),
        ip: userIp,
        gameId: meta.selectedGame ? meta.selectedGame.id : null,
        gameName: meta.selectedGame ? meta.selectedGame.name : null
      };

      const docRef = await addDoc(collection(db, 'clips'), clipData);
      onSuccess(docRef.id);
    } catch (error) {
      console.error('Erro ao enviar clipe: ', error);
      alert('Erro ao salvar clipe no banco de dados. Tente novamente.');
      setIsSubmitting(false);
      setUploadStatus('');
    }
  };

  const startDropboxUpload = (file, token) => {
    setUploadStatus('uploading');
    
    const safeName = file.name.replace(/[^a-z0-9.]/gi, '_').toLowerCase();
    const uploadReq = new XMLHttpRequest();
    
    uploadReq.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        const percentComplete = (event.loaded / event.total) * 100;
        setUploadProgress(percentComplete);
      }
    };
    
    uploadReq.open('POST', 'https://content.dropboxapi.com/2/files/upload');
    uploadReq.setRequestHeader('Authorization', `Bearer ${token}`);
    uploadReq.setRequestHeader('Content-Type', 'application/octet-stream');
    
    const apiArg = {
      path: `/FastClipParoni/${safeName}_${Date.now()}.mp4`,
      autorename: true
    };
    
    uploadReq.setRequestHeader('Dropbox-API-Arg', unescape(encodeURIComponent(JSON.stringify(apiArg))));

    uploadReq.onload = async () => {
      if (uploadReq.status >= 200 && uploadReq.status < 300) {
        setUploadStatus('generating');
        try {
          const shareRes = await fetch('https://api.dropboxapi.com/2/sharing/create_shared_link_with_settings', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ path: apiArg.path, settings: { requested_visibility: "public" } })
          });
          
          if (!shareRes.ok) {
            throw new Error('Falha ao gerar link do Dropbox');
          }
          const shareData = await shareRes.json();
          let rawUrl = shareData.url.replace('www.dropbox.com', 'dl.dropboxusercontent.com').replace('dl=0', 'raw=1');
          if (!rawUrl.includes('raw=1')) {
            rawUrl += '&raw=1';
          }

          await saveToFirebase(rawUrl);
        } catch (e) {
          alert('Erro ao gerar link compartilhável: ' + e.message);
          setIsSubmitting(false);
          setUploadStatus('');
        }
      } else {
        if (uploadReq.status === 401) {
          localStorage.removeItem('dropbox_token');
          alert('Sessão expirou. Tente novamente.');
        } else {
          alert(`Erro no upload (${uploadReq.status})`);
        }
        setIsSubmitting(false);
        setUploadStatus('');
      }
    };
    
    uploadReq.onerror = () => {
      alert('Falha na rede durante o upload.');
      setIsSubmitting(false);
      setUploadStatus('');
    };
    
    uploadReq.send(file);
  };

  const handleSubmit = async () => {
    if (!title.trim()) {
      alert('Por favor, insira um título para o vídeo.');
      return;
    }

    if (activeTab === 'link') {
      if (!link.trim()) {
        alert('Por favor, insira o link do vídeo.');
        return;
      }
      setIsSubmitting(true);
      await saveToFirebase(link);
    } else {
      if (!videoFile) {
        alert('Por favor, selecione um arquivo de vídeo.');
        return;
      }
      
      setIsSubmitting(true);
      const token = localStorage.getItem('dropbox_token');
      if (token) {
        startDropboxUpload(videoFile, token);
      } else {
        setUploadStatus('auth');
        pendingFileRef.current = videoFile;
        const clientId = import.meta.env.VITE_DROPBOX_CLIENT_ID;
        if (!clientId) {
          alert('Você precisa configurar o VITE_DROPBOX_CLIENT_ID no arquivo .env!');
          setIsSubmitting(false);
          setUploadStatus('');
          return;
        }
        const redirectUri = window.location.origin + '/oauth-callback.html';
        const authUrl = `https://www.dropbox.com/oauth2/authorize?client_id=${clientId}&response_type=token&redirect_uri=${encodeURIComponent(redirectUri)}`;
        
        const width = 600;
        const height = 600;
        const left = window.screen.width / 2 - width / 2;
        const top = window.screen.height / 2 - height / 2;
        
        window.open(authUrl, 'Dropbox Auth', `width=${width},height=${height},top=${top},left=${left}`);
      }
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '450px' }}>
        <div className="modal-header">
          <h2>Enviar Clip</h2>
          {!isSubmitting && (
             <button className="btn btn-secondary" onClick={onClose}>✕</button>
          )}
        </div>
        
        <div className="modal-body" style={{ padding: '1.5rem' }}>
          
          {/* Tabs */}
          {!isSubmitting && (
            <div style={{ display: 'flex', marginBottom: '1.5rem', borderBottom: '1px solid #333' }}>
              <button 
                onClick={() => setActiveTab('link')} 
                style={{ flex: 1, padding: '0.8rem', background: 'transparent', border: 'none', borderBottom: activeTab === 'link' ? '2px solid #0061FE' : '2px solid transparent', color: activeTab === 'link' ? '#fff' : '#888', cursor: 'pointer', fontWeight: 'bold' }}
              >
                🔗 Colar Link
              </button>
              <button 
                onClick={() => setActiveTab('file')} 
                style={{ flex: 1, padding: '0.8rem', background: 'transparent', border: 'none', borderBottom: activeTab === 'file' ? '2px solid #0061FE' : '2px solid transparent', color: activeTab === 'file' ? '#fff' : '#888', cursor: 'pointer', fontWeight: 'bold' }}
              >
                🎬 Enviar Arquivo
              </button>
            </div>
          )}

          {isSubmitting ? (
            <div style={{ textAlign: 'center', padding: '2rem 0' }}>
              <div className="loading-spinner" style={{ margin: '0 auto 1rem', borderColor: 'rgba(255,255,255,0.2)', borderTopColor: '#0061FE' }} />
              
              {uploadStatus === 'auth' && <p>Aguardando login no Dropbox...</p>}
              
              {uploadStatus === 'uploading' && (
                <>
                  <p>Enviando vídeo... {Math.round(uploadProgress)}%</p>
                  <div className="progress-bar-container" style={{ marginTop: '1rem', background: '#222', borderRadius: '4px', overflow: 'hidden' }}>
                    <div className="progress-bar-fill" style={{ width: `${uploadProgress}%`, backgroundColor: '#0061FE', height: '6px' }} />
                  </div>
                </>
              )}

              {uploadStatus === 'generating' && <p>Gerando link compartilhável...</p>}
              
              {uploadStatus === '' && <p>Salvando clipe na galeria...</p>}
            </div>
          ) : (
            <div style={{ textAlign: 'left', margin: '0 auto' }}>
              
              {activeTab === 'link' ? (
                <div style={{ marginBottom: '1.5rem' }}>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Link do Vídeo (Dropbox, etc):</label>
                  <input 
                    type="text" 
                    value={link} 
                    onChange={(e) => setLink(e.target.value)} 
                    placeholder="Ex: https://www.dropbox.com/s/..."
                    style={{ width: '100%', padding: '0.8rem', borderRadius: '4px', border: '1px solid #444', background: '#111', color: '#fff' }}
                  />
                </div>
              ) : (
                <div style={{ marginBottom: '1.5rem' }}>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Arquivo de Vídeo (Máx: 2GB):</label>
                  <input 
                    type="file" 
                    accept="video/*"
                    onChange={(e) => setVideoFile(e.target.files[0])} 
                    style={{ width: '100%', padding: '0.8rem', borderRadius: '4px', border: '1px solid #444', background: '#111', color: '#fff' }}
                  />
                  {videoFile && <p style={{ fontSize: '0.8rem', color: '#4cb5ff', marginTop: '4px' }}>Arquivo selecionado: {videoFile.name}</p>}
                </div>
              )}

              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Título do Vídeo:</label>
                <input 
                  type="text" 
                  value={title} 
                  onChange={(e) => setTitle(e.target.value)} 
                  placeholder="Ex: Minha Gameplay Épica"
                  style={{ width: '100%', padding: '0.8rem', borderRadius: '4px', border: '1px solid #444', background: '#111', color: '#fff' }}
                />
              </div>

              <div style={{ marginBottom: '1.5rem', position: 'relative' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Jogo (Twitch):</label>
                <input 
                  type="text" 
                  value={gameSearch} 
                  onChange={handleGameSearchChange} 
                  placeholder="Busque o nome do jogo..."
                  style={{ width: '100%', padding: '0.8rem', borderRadius: '4px', border: selectedGame ? '1px solid #0061FE' : '1px solid #444', background: '#111', color: '#fff' }}
                />
                
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
                  <div style={{ fontSize: '0.8rem', color: '#0061FE', marginTop: '0.3rem' }}>✅ A imagem do jogo será usada como capa</div>
                )}
              </div>

              <div style={{ marginBottom: '2rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Privacidade:</label>
                <select 
                  value={isPublic ? 'true' : 'false'} 
                  onChange={(e) => setIsPublic(e.target.value === 'true')}
                  style={{ width: '100%', padding: '0.8rem', borderRadius: '4px', border: '1px solid #444', background: '#111', color: '#fff' }}
                >
                  <option value="true">Público (Aparecer na Galeria)</option>
                  <option value="false">Não Listado (Apenas por Link Direto)</option>
                </select>
              </div>

              <button className="btn btn-primary" style={{ width: '100%', padding: '1rem', backgroundColor: '#0061FE' }} onClick={handleSubmit}>
                {activeTab === 'link' ? 'Enviar para Galeria' : 'Upload & Publicar'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
