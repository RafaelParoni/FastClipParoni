import { useRef, useState, useEffect } from 'react';
import { db } from '../services/firebase';
import { collection, addDoc } from 'firebase/firestore';

export default function SubmitClipModal({ onClose, onSuccess, initialVideoFile = null }) {
  const [activeTab, setActiveTab] = useState(initialVideoFile ? 'file' : 'link');
  
  const [title, setTitle] = useState('');
  const [link, setLink] = useState('');
  const [videoFile, setVideoFile] = useState(initialVideoFile);
  const [isPublic, setIsPublic] = useState(true);
  
  const [cloudProvider, setCloudProvider] = useState(localStorage.getItem('app_storage') || 'dropbox');
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatus, setUploadStatus] = useState(''); // 'auth', 'uploading', 'generating', ''
  const [uploadError, setUploadError] = useState(null);
  const [createdClipId, setCreatedClipId] = useState(null);

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
        alert('Autenticação Dropbox falhou: ' + event.data.error);
        setIsSubmitting(false);
        setUploadStatus('');
      } else if (event.data.type === 'google-auth-success') {
        localStorage.setItem('google_token', event.data.token);
        if (pendingFileRef.current) {
          startGoogleDriveUpload(pendingFileRef.current, event.data.token);
          pendingFileRef.current = null;
        }
      } else if (event.data.type === 'google-auth-error') {
        alert('Autenticação Google falhou: ' + event.data.error);
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

  const generateThumbnailFromVideo = (file) => {
    return new Promise((resolve) => {
      const video = document.createElement('video');
      video.preload = 'metadata';
      video.src = URL.createObjectURL(file);
      video.muted = true;
      video.crossOrigin = 'anonymous';
      
      const handleSeeked = () => {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          URL.revokeObjectURL(video.src);
          resolve(canvas.toDataURL('image/jpeg', 0.7));
        } catch (e) {
          resolve(null);
        }
      };

      video.addEventListener('loadeddata', () => {
        video.currentTime = 0.5;
      });
      video.addEventListener('seeked', handleSeeked);
      video.addEventListener('error', () => resolve(null));
    });
  };

  const saveToFirebase = async (videoUrl, thumbnailBase64 = null) => {
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
        thumbnail: thumbnailBase64 || (meta.selectedGame ? meta.selectedGame.boxArt : null),
        privacy: meta.isPublic,
        createdAt: new Date().toISOString(),
        ip: userIp,
        gameId: meta.selectedGame ? meta.selectedGame.id : null,
        gameName: meta.selectedGame ? meta.selectedGame.name : null
      };

      const docRef = await addDoc(collection(db, 'clips'), clipData);
      setCreatedClipId(docRef.id);
      setUploadStatus('success');
    } catch (error) {
      console.error('Erro ao enviar clipe: ', error);
      setUploadError('Erro ao salvar clipe no banco de dados. Tente novamente.');
      setIsSubmitting(false);
      setUploadStatus('');
    }
  };

  const startDropboxUpload = (file, token) => {
    setUploadStatus('uploading');
    
    // Usa o título digitado pelo usuário como base para o nome do arquivo
    const baseName = title || 'clip';
    const safeName = baseName.replace(/[^a-z0-9]/gi, '_').toLowerCase();
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
    
    const gameFolderName = selectedGame ? selectedGame.name : 'Geral';
    const safeGameFolder = gameFolderName.replace(/[^a-z0-9 \-_]/gi, '').trim();

    const apiArg = {
      path: `/${safeGameFolder}/${safeName}.mp4`,
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

          let thumb = null;
          if (initialVideoFile) {
            thumb = await generateThumbnailFromVideo(file);
          }
          await saveToFirebase(rawUrl, thumb);
        } catch (e) {
          setUploadError('Erro ao gerar link compartilhável: ' + e.message);
          setIsSubmitting(false);
          setUploadStatus('');
        }
      } else {
        if (uploadReq.status === 401) {
          localStorage.removeItem('dropbox_token');
          setUploadError('Sessão do Dropbox expirou. Feche e tente novamente.');
        } else {
          setUploadError(`Erro no upload (${uploadReq.status})`);
        }
        setIsSubmitting(false);
        setUploadStatus('');
      }
    };
    
    uploadReq.onerror = () => {
      setUploadError('Falha na rede durante o upload.');
      setIsSubmitting(false);
      setUploadStatus('');
    };
    
    uploadReq.send(file);
  };

  const startGoogleDriveUpload = async (file, token) => {
    setUploadStatus('uploading');
    
    const fileName = title ? `${title}.mp4` : (file.name || 'video.mp4');

    let finalFolderId = null;
    const gameFolderName = selectedGame ? selectedGame.name : 'Geral';
    const safeQueryName = gameFolderName.replace(/'/g, "\\'"); // Evita quebrar a query

    try {
      // 1. Busca ou cria a pasta 'FastClip'
      let rootFolderId = null;
      const searchRootRes = await fetch(`https://www.googleapis.com/drive/v3/files?q=name='FastClip' and mimeType='application/vnd.google-apps.folder' and trashed=false&spaces=drive`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const searchRootData = await searchRootRes.json();
      
      if (searchRootData.files && searchRootData.files.length > 0) {
        rootFolderId = searchRootData.files[0].id;
      } else {
        const createRootRes = await fetch('https://www.googleapis.com/drive/v3/files', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            name: 'FastClip',
            mimeType: 'application/vnd.google-apps.folder'
          })
        });
        const createRootData = await createRootRes.json();
        rootFolderId = createRootData.id;
      }

      // 2. Busca ou cria a pasta do Jogo dentro de 'FastClip'
      if (rootFolderId) {
        const searchGameRes = await fetch(`https://www.googleapis.com/drive/v3/files?q=name='${safeQueryName}' and '${rootFolderId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false&spaces=drive`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const searchGameData = await searchGameRes.json();

        if (searchGameData.files && searchGameData.files.length > 0) {
          finalFolderId = searchGameData.files[0].id;
        } else {
          const createGameRes = await fetch('https://www.googleapis.com/drive/v3/files', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              name: gameFolderName,
              parents: [rootFolderId],
              mimeType: 'application/vnd.google-apps.folder'
            })
          });
          const createGameData = await createGameRes.json();
          finalFolderId = createGameData.id;
        }
      }
    } catch (e) {
      console.warn("Falha ao buscar ou criar as pastas no Google Drive", e);
    }

    const metadata = {
      name: fileName,
      mimeType: file.type || 'video/mp4'
    };

    if (finalFolderId) {
      metadata.parents = [finalFolderId];
    }

    const form = new FormData();
    form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
    form.append('file', file);
    
    const uploadReq = new XMLHttpRequest();
    
    uploadReq.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        const percentComplete = (event.loaded / event.total) * 100;
        setUploadProgress(percentComplete);
      }
    };
    
    uploadReq.open('POST', 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart');
    uploadReq.setRequestHeader('Authorization', `Bearer ${token}`);
    
    uploadReq.onload = async () => {
      if (uploadReq.status >= 200 && uploadReq.status < 300) {
        setUploadStatus('generating');
        try {
          const responseData = JSON.parse(uploadReq.responseText);
          const fileId = responseData.id;
          
          // Tornar o arquivo público
          await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}/permissions`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ type: 'anyone', role: 'reader' })
          });
          
          // Obter link direto
          const getReq = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?fields=webContentLink,webViewLink`, {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });
          const getData = await getReq.json();
          const rawUrl = getData.webContentLink || getData.webViewLink;
          
          let thumb = null;
          if (initialVideoFile) {
            thumb = await generateThumbnailFromVideo(file);
          }
          await saveToFirebase(rawUrl, thumb);
        } catch (e) {
          setUploadError('Erro ao processar Google Drive: ' + e.message);
          setIsSubmitting(false);
          setUploadStatus('');
        }
      } else {
        if (uploadReq.status === 401) {
          localStorage.removeItem('google_token');
          setUploadError('Sessão do Google expirou. Feche e tente novamente.');
        } else {
          setUploadError(`Erro no upload Google (${uploadReq.status})`);
        }
        setIsSubmitting(false);
        setUploadStatus('');
      }
    };
    
    uploadReq.onerror = () => {
      setUploadError('Falha na rede durante o upload.');
      setIsSubmitting(false);
      setUploadStatus('');
    };
    
    uploadReq.send(form);
  };

  const handleSubmit = async () => {
    setUploadError(null);
    if (!title.trim()) {
      setUploadError('Por favor, insira um título para o vídeo.');
      return;
    }

    if (activeTab === 'link') {
      if (!link.trim()) {
        setUploadError('Por favor, insira o link do vídeo.');
        return;
      }
      setIsSubmitting(true);
      await saveToFirebase(link);
    } else {
      if (!videoFile) {
        setUploadError('Por favor, selecione um arquivo de vídeo.');
        return;
      }
      


      if (cloudProvider === 'google-drive') {
        const token = localStorage.getItem('google_token');
        if (token) {
          setIsSubmitting(true);
          startGoogleDriveUpload(videoFile, token);
        } else {
          setIsSubmitting(true);
          setUploadStatus('auth');
          pendingFileRef.current = videoFile;
          const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
          if (!clientId) {
            setUploadError('Você precisa configurar o VITE_GOOGLE_CLIENT_ID no arquivo .env!');
            setIsSubmitting(false);
            setUploadStatus('');
            return;
          }
          const redirectUri = window.location.origin + '/oauth-callback.html';
          const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=token&scope=${encodeURIComponent('https://www.googleapis.com/auth/drive.file')}&state=google`;
          
          const width = 600;
          const height = 600;
          const left = window.screen.width / 2 - width / 2;
          const top = window.screen.height / 2 - height / 2;
          
          window.open(authUrl, 'Google Auth', `width=${width},height=${height},top=${top},left=${left}`);
        }
      } else if (cloudProvider === 'dropbox') {
        const token = localStorage.getItem('dropbox_token');
        if (token) {
          setIsSubmitting(true);
          startDropboxUpload(videoFile, token);
        } else {
          setIsSubmitting(true);
          setUploadStatus('auth');
          pendingFileRef.current = videoFile;
          const clientId = import.meta.env.VITE_DROPBOX_CLIENT_ID;
          if (!clientId) {
            setUploadError('Você precisa configurar o VITE_DROPBOX_CLIENT_ID no arquivo .env!');
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
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '450px', width: '90%', margin: '1rem', maxHeight: '90vh', overflowY: 'auto' }}>
        <div className="modal-header">
          <h2>Enviar Clip</h2>
          {!isSubmitting && (
             <button className="btn btn-secondary" onClick={onClose}>✕</button>
          )}
        </div>
        
        <div className="modal-body" style={{ padding: '1.5rem' }}>
          
          {uploadError && (
            <div style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', border: '1px solid #ef4444', color: '#ef4444', padding: '1rem', borderRadius: '8px', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
              {uploadError}
            </div>
          )}

          {uploadStatus === 'success' ? (
            <div style={{ textAlign: 'center', padding: '3rem 1rem' }}>
              <div style={{ width: '64px', height: '64px', backgroundColor: '#10b981', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem auto', boxShadow: '0 0 20px rgba(16, 185, 129, 0.4)' }}>
                <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
              </div>
              <h3 style={{ color: '#fff', marginBottom: '1rem', fontSize: '1.4rem' }}>Sucesso!</h3>
              <p style={{ color: '#a0a0a0', marginBottom: '2rem' }}>O clipe foi processado e publicado na nuvem.</p>
              <button 
                className="btn btn-primary" 
                style={{ width: '100%', padding: '1rem', backgroundColor: '#0061FE' }}
                onClick={() => onSuccess(createdClipId)}
              >
                Continuar
              </button>
            </div>
          ) : isSubmitting ? (
            <div style={{ textAlign: 'center', padding: '3rem 1rem' }}>
              <div className="loading-spinner" style={{ margin: '0 auto 1.5rem auto' }} />
              
              {uploadStatus === 'auth' && <p style={{ color: '#fff', fontSize: '1.1rem' }}>Aguardando autorização...</p>}
              
              {uploadStatus === 'uploading' && (
                <>
                  <p style={{ color: '#fff', fontSize: '1.1rem', marginBottom: '1rem' }}>Enviando vídeo para nuvem... {Math.round(uploadProgress)}%</p>
                  <div className="progress-bar-container" style={{ background: '#222', borderRadius: '8px', overflow: 'hidden', height: '12px' }}>
                    <div className="progress-bar-fill" style={{ width: `${uploadProgress}%`, backgroundColor: '#0061FE', height: '100%', transition: 'width 0.3s ease' }} />
                  </div>
                </>
              )}

              {uploadStatus === 'generating' && <p style={{ color: '#fff', fontSize: '1.1rem' }}>Gerando links públicos e metadados...</p>}
              
              {uploadStatus === '' && <p style={{ color: '#fff', fontSize: '1.1rem' }}>Salvando no banco de dados...</p>}
            </div>
          ) : (
            <div style={{ textAlign: 'left', margin: '0 auto' }}>
              
              {!initialVideoFile && (
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
                  {!initialVideoFile && (
                    <>
                      <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Arquivo de Vídeo (Máx: 2GB):</label>
                      <input 
                        type="file" 
                        accept="video/*"
                        onChange={(e) => setVideoFile(e.target.files[0])} 
                        style={{ width: '100%', padding: '0.8rem', borderRadius: '4px', border: '1px solid #444', background: '#111', color: '#fff' }}
                      />
                    </>
                  )}
                  {videoFile && <p style={{ fontSize: '0.8rem', color: '#4cb5ff', marginTop: '4px' }}>Arquivo selecionado: {videoFile.name || 'video_clip.mp4'}</p>}
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

              {activeTab === 'file' && (
                <div style={{ marginBottom: '1.5rem' }}>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Onde salvar o arquivo de vídeo?</label>
                  <select 
                    value={cloudProvider} 
                    onChange={(e) => setCloudProvider(e.target.value)}
                    style={{ width: '100%', padding: '0.8rem', borderRadius: '4px', border: '1px solid #444', background: '#111', color: '#fff' }}
                  >
                    <option value="dropbox">Dropbox</option>
                    <option value="google-drive">Google Drive</option>
                  </select>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginTop: '8px' }}>
                    PS: O vídeo será salvo na pasta /FastClip deste provedor e publicado na galeria.
                  </span>
                </div>
              )}

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
