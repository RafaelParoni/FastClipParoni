import { useState, useRef, useCallback, useEffect } from 'react';
import Timeline, { formatTime } from './Timeline';
import ClipList from './ClipList';
import ClipPreviewModal from './ClipPreviewModal';
import DropboxUploadModal from './DropboxUploadModal';
import { saveAs } from 'file-saver';
import JSZip from 'jszip';

export default function VideoEditor({ videoFile, onBack, ffmpeg }) {
  const videoRef = useRef(null);
  const [videoUrl] = useState(() => URL.createObjectURL(videoFile));

  // Video state
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [volume, setVolume] = useState(1);

  // Clip selection
  const [clipStart, setClipStart] = useState(0);
  const [clipEnd, setClipEnd] = useState(0);

  // Clips list
  const [clips, setClips] = useState([]);
  const [clipCounter, setClipCounter] = useState(1);

  // Preview modal
  const [previewClip, setPreviewClip] = useState(null);

  // Dropbox upload modal state
  const [dropboxModalState, setDropboxModalState] = useState({
    isOpen: false,
    status: 'idle',
    progress: 0,
    link: '',
    errorMessage: ''
  });
  const pendingDropboxClipRef = useRef(null);

  // Loading state for download all
  const [downloadingAll, setDownloadingAll] = useState(false);

  // Video events
  function handleLoadedMetadata() {
    const video = videoRef.current;
    if (video) {
      setDuration(video.duration);
      setClipEnd(Math.min(video.duration, 30)); // Default 30s selection
    }
  }

  function handleTimeUpdate() {
    const video = videoRef.current;
    if (video) {
      setCurrentTime(video.currentTime);
    }
  }

  function togglePlay() {
    const video = videoRef.current;
    if (!video) return;
    if (playing) {
      video.pause();
    } else {
      video.play();
    }
    setPlaying(!playing);
  }

  function handleSeek(time) {
    const video = videoRef.current;
    if (video) {
      video.currentTime = time;
      setCurrentTime(time);
    }
  }

  function handleVolumeChange(e) {
    const v = parseFloat(e.target.value);
    setVolume(v);
    if (videoRef.current) {
      videoRef.current.volume = v;
    }
  }

  // Listen for play/pause events from the native video element
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);

    video.addEventListener('play', onPlay);
    video.addEventListener('pause', onPause);

    return () => {
      video.removeEventListener('play', onPlay);
      video.removeEventListener('pause', onPause);
    };
  }, []);

  // Listen for Dropbox OAuth messages
  useEffect(() => {
    function handleMessage(event) {
      if (event.origin !== window.location.origin) return;
      if (event.data.type === 'dropbox-auth-success') {
        localStorage.setItem('dropbox_token', event.data.token);
        if (pendingDropboxClipRef.current) {
          startDropboxUpload(pendingDropboxClipRef.current, event.data.token);
          pendingDropboxClipRef.current = null;
        }
      } else if (event.data.type === 'dropbox-auth-error') {
        setDropboxModalState(prev => ({ ...prev, status: 'error', errorMessage: 'Autenticação falhou: ' + event.data.error }));
      }
    }
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  // Create clip
  const handleCreateClip = useCallback(async () => {
    if (clipEnd <= clipStart) {
      alert('O fim do clip deve ser depois do início.');
      return;
    }

    try {
      // Ensure FFmpeg is loaded
      if (!ffmpeg.loaded) {
        await ffmpeg.load();
      }

      const name = `clip_${clipCounter}`;
      const blob = await ffmpeg.createClip(videoFile, clipStart, clipEnd, name, true); // True força a marca d'água

      const newClip = {
        id: Date.now().toString(),
        name,
        blob,
        startTime: clipStart,
        endTime: clipEnd,
        duration: clipEnd - clipStart,
      };

      setClips((prev) => [...prev, newClip]);
      setClipCounter((prev) => prev + 1);
    } catch (error) {
      console.error('Erro ao criar clip:', error);
      alert('Erro ao criar clip. Tente novamente.');
    }
  }, [clipStart, clipEnd, clipCounter, videoFile, ffmpeg]);

  // Download single clip
  function handleDownloadClip(clip) {
    downloadBlob(clip.blob, `${clip.name}.mp4`);
  }

  // Download all clips as ZIP
  async function handleDownloadAll() {
    if (clips.length === 0) return;

    setDownloadingAll(true);
    try {
      const zip = new JSZip();

      clips.forEach((clip) => {
        zip.file(`${clip.name}.mp4`, clip.blob);
      });

      const zipBlob = await zip.generateAsync({ type: 'blob' });
      downloadBlob(zipBlob, 'fastclip_clips.zip');
    } catch (error) {
      console.error('Erro ao criar ZIP:', error);
      alert('Erro ao baixar clips. Tente novamente.');
    } finally {
      setDownloadingAll(false);
    }
  }

  // Helper function for native download
  function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.style.display = 'none';
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    
    // Cleanup
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 100);
  }

  // Dropbox Logic
  const handleDropboxUploadClick = (clip) => {
    const clientId = import.meta.env.VITE_DROPBOX_CLIENT_ID;
    if (!clientId || clientId === 'COLOQUE_SEU_CLIENT_ID_AQUI') {
      alert('Você precisa configurar o VITE_DROPBOX_CLIENT_ID no arquivo .env!');
      return;
    }

    const token = localStorage.getItem('dropbox_token');
    if (!token) {
      pendingDropboxClipRef.current = clip;
      setDropboxModalState({ isOpen: true, status: 'connecting', progress: 0, link: '', errorMessage: '' });
      
      const redirectUri = `${window.location.origin}/oauth-callback.html`;
      const authUrl = `https://www.dropbox.com/oauth2/authorize?client_id=${clientId}&response_type=token&redirect_uri=${encodeURIComponent(redirectUri)}`;
      window.open(authUrl, 'dropbox-auth', 'width=600,height=800,menubar=no,toolbar=no');
    } else {
      startDropboxUpload(clip, token);
    }
  };

  const startDropboxUpload = async (clip, token) => {
    setDropboxModalState({ isOpen: true, status: 'uploading', progress: 0, link: '', errorMessage: '' });
    
    try {
      const safeName = clip.name.replace(/[^a-z0-9]/gi, '_').toLowerCase();
      const path = `/FastClipParoni/${safeName}_${Date.now()}.mp4`;
      
      const uploadReq = new XMLHttpRequest();
      
      uploadReq.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          const percentComplete = (event.loaded / event.total) * 100;
          setDropboxModalState(prev => ({ ...prev, progress: percentComplete }));
        }
      };
      
      uploadReq.open('POST', 'https://content.dropboxapi.com/2/files/upload');
      uploadReq.setRequestHeader('Authorization', `Bearer ${token}`);
      uploadReq.setRequestHeader('Content-Type', 'application/octet-stream');
      
      const apiArg = {
        path: `/${safeName}_${Date.now()}.mp4`,
        autorename: true
      };
      
      // Dropbox exige que o header seja compatível com caracteres não-latinos
      // Usando uma abordagem mais segura para o encoding se houver acentos (embora safeName já filtre isso)
      const encodedApiArg = unescape(encodeURIComponent(JSON.stringify(apiArg)));
      uploadReq.setRequestHeader('Dropbox-API-Arg', encodedApiArg);

      uploadReq.onload = async () => {
        if (uploadReq.status >= 200 && uploadReq.status < 300) {
           setDropboxModalState(prev => ({ ...prev, status: 'generating' }));
           
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
                const errJson = await shareRes.json();
                throw new Error(errJson.error_summary || 'Falha ao gerar link');
             }
             const shareData = await shareRes.json();
             
             const originalUrl = new URL(shareData.url);
             // originalUrl.pathname costuma ser "/scl/fi/[id_do_arquivo]/[nome_do_arquivo]"
             const pathPart = originalUrl.pathname.replace('/scl/fi/', '');
             const rlkey = originalUrl.searchParams.get('rlkey');
             
             // Gera o link usando a URL da própria aplicação
             const customUrl = `${window.location.origin}/v/${pathPart}?rlkey=${rlkey}`;
             
             setDropboxModalState(prev => ({ ...prev, status: 'success', link: customUrl }));
           } catch (e) {
             setDropboxModalState(prev => ({ ...prev, status: 'error', errorMessage: e.message }));
           }
        } else {
           let errMsg = `Erro ${uploadReq.status}`;
           if (uploadReq.responseText) {
              console.error("Resposta do Dropbox:", uploadReq.responseText);
              try {
                 const errJson = JSON.parse(uploadReq.responseText);
                 errMsg += ': ' + (errJson.error_summary || errJson.error);
              } catch(e) {
                 errMsg += ' - Ocorreu um erro no servidor.';
              }
           }
           if (uploadReq.status === 401 || (uploadReq.responseText && uploadReq.responseText.includes('scope'))) {
              errMsg = 'Por conta das novas permissões, sua sessão expirou. Feche esta janela, clique em Dropbox novamente e refaça o login!';
              localStorage.removeItem('dropbox_token');
           }
           setDropboxModalState(prev => ({ ...prev, status: 'error', errorMessage: errMsg }));
        }
      };
      
      uploadReq.onerror = () => {
        setDropboxModalState(prev => ({ ...prev, status: 'error', errorMessage: 'Falha na rede durante o upload.' }));
      };
      
      uploadReq.send(clip.blob);
    } catch (err) {
       console.error(err);
       setDropboxModalState(prev => ({ ...prev, status: 'error', errorMessage: err.message }));
    }
  };

  // Delete clip
  function handleDeleteClip(id) {
    setClips((prev) => prev.filter((c) => c.id !== id));
  }

  return (
    <div className="editor-layout">
      {/* Header */}
      <div className="editor-header">
        <span className="logo">
          <img src="/favicon.ico" alt="Logo" className="site-icon" /> FastClip<span className="author-name">Paroni</span>
        </span>
        <span className="file-name" title={videoFile.name}>📁 {videoFile.name}</span>
        <div className="header-actions">
          <div className="social-links-header">
            <a href="https://www.instagram.com/rafael_paroni" target="_blank" rel="noopener noreferrer" title="Instagram">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line></svg>
            </a>
            <a href="https://github.com/RafaelParoni" target="_blank" rel="noopener noreferrer" title="GitHub">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"></path></svg>
            </a>
          </div>
          <button className="btn btn-secondary" onClick={onBack}>
            ← Novo Vídeo
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="editor-body">
        {/* Main area */}
        <div className="editor-main">
          {/* Video player */}
          <div className="video-container">
            <video
              ref={videoRef}
              src={videoUrl}
              onLoadedMetadata={handleLoadedMetadata}
              onTimeUpdate={handleTimeUpdate}
              onClick={togglePlay}
            />
          </div>

          {/* Controls */}
          <div className="video-controls">
            <button className="play-btn" onClick={togglePlay}>
              {playing ? '⏸' : '▶'}
            </button>
            <span className="time-display">
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>
            <div className="volume-control">
              <span>{volume > 0 ? '🔊' : '🔇'}</span>
              <input
                type="range"
                className="volume-slider"
                min="0"
                max="1"
                step="0.05"
                value={volume}
                onChange={handleVolumeChange}
              />
            </div>
          </div>

          {/* Timeline */}
          <Timeline
            duration={duration}
            currentTime={currentTime}
            clipStart={clipStart}
            clipEnd={clipEnd}
            onClipStartChange={setClipStart}
            onClipEndChange={setClipEnd}
            onSeek={handleSeek}
          />

          {/* Create clip button */}
          <div className="create-clip-area">
            <button
              className="btn btn-primary btn-lg"
              onClick={handleCreateClip}
              disabled={ffmpeg.processing || clipEnd <= clipStart}
            >
              ✂️ Criar Clip ({formatTime(clipEnd - clipStart)})
            </button>
            
            <button
              className="btn btn-secondary"
              onClick={() => {
                setClipStart(currentTime);
              }}
              title="Marcar início no tempo atual"
            >
              📍 Marcar Início
            </button>
            <button
              className="btn btn-secondary"
              onClick={() => {
                setClipEnd(currentTime);
              }}
              title="Marcar fim no tempo atual"
            >
              🏁 Marcar Fim
            </button>
          </div>
        </div>

        {/* Clip sidebar */}
        <ClipList
          clips={clips}
          onPreview={setPreviewClip}
          onDownload={handleDownloadClip}
          onDelete={handleDeleteClip}
          onDownloadAll={handleDownloadAll}
          onDropboxUpload={handleDropboxUploadClick}
        />
      </div>

      {/* Preview modal */}
      {previewClip && (
        <ClipPreviewModal
          clip={previewClip}
          onClose={() => setPreviewClip(null)}
          onDownload={handleDownloadClip}
        />
      )}

      {/* Dropbox upload modal */}
      {dropboxModalState.isOpen && (
        <DropboxUploadModal
          status={dropboxModalState.status}
          progress={dropboxModalState.progress}
          link={dropboxModalState.link}
          errorMessage={dropboxModalState.errorMessage}
          onClose={() => setDropboxModalState(prev => ({ ...prev, isOpen: false }))}
        />
      )}

      {/* Loading overlays */}
      {(ffmpeg.loading || ffmpeg.processing) && (
        <div className="loading-overlay">
          <div className="loading-spinner" />
          <p>{ffmpeg.processingMessage || 'Processando...'}</p>
          {ffmpeg.progress > 0 && (
            <>
              <div className="progress-bar-container">
                <div className="progress-bar-fill" style={{ width: `${ffmpeg.progress}%` }} />
              </div>
              <span className="progress-text">{ffmpeg.progress}%</span>
            </>
          )}
        </div>
      )}

      {downloadingAll && (
        <div className="loading-overlay">
          <div className="loading-spinner" />
          <p>Empacotando clips em ZIP...</p>
        </div>
      )}
    </div>
  );
}
