import { useState, useRef, useCallback, useEffect } from 'react';
import Timeline, { formatTime } from './Timeline';
import ClipList from './ClipList';
import ClipPreviewModal from './ClipPreviewModal';
import DropboxUploadModal from './DropboxUploadModal';
import { saveAs } from 'file-saver';
import JSZip from 'jszip';
import { db } from '../services/firebase';
import { collection, addDoc } from 'firebase/firestore';
import { useLanguage } from '../contexts/LanguageContext';

export default function VideoEditor({ videoFile, onBack, ffmpeg }) {
  const { t } = useLanguage();
  const videoRef = useRef(null);
  const [videoUrl] = useState(() => URL.createObjectURL(videoFile));

  // Video and Audio state
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [volume, setVolume] = useState(1);

  const audioRefs = useRef({});
  const [audioTracks, setAudioTracks] = useState([]);

  const audioTracksRef = useRef(audioTracks);
  useEffect(() => {
    audioTracksRef.current = audioTracks;
  }, [audioTracks]);

  // Cleanup URLs on unmount
  useEffect(() => {
    return () => {
      audioTracksRef.current.forEach(t => URL.revokeObjectURL(t.url));
    };
  }, []);

  const addAudioTrack = useCallback((file) => {
    setAudioTracks(prev => {
      if (prev.length >= 5) {
         alert(t('editor.maxAudioLimit'));
         return prev;
      }
      const newTrack = {
        id: Date.now().toString(),
        file,
        url: URL.createObjectURL(file),
        volume: 1,
        offset: 0,
        trimStart: 0,
        trimEnd: 0,
        duration: 0
      };
      return [...prev, newTrack];
    });
  }, []);

  const removeAudioTrack = (id) => {
    setAudioTracks(prev => {
      const track = prev.find(t => t.id === id);
      if (track) URL.revokeObjectURL(track.url);
      return prev.filter(t => t.id !== id);
    });
    if (audioRefs.current[id]) {
       delete audioRefs.current[id];
    }
  };

  const updateAudioTrack = (id, updates) => {
    setAudioTracks(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t));
  };

  // Sync volume for audio tracks
  useEffect(() => {
    audioTracks.forEach(track => {
      const el = audioRefs.current[track.id];
      if (el && el.volume !== track.volume) {
        el.volume = track.volume;
      }
    });
  }, [audioTracks]);

  // Global Drag and Drop for Audio Tracks
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const dragCounter = useRef(0);

  useEffect(() => {
    const handleDragEnter = (e) => {
      e.preventDefault();
      e.stopPropagation();
      dragCounter.current += 1;
      if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
        setIsDraggingOver(true);
      }
    };
    
    const handleDragLeave = (e) => {
      e.preventDefault();
      e.stopPropagation();
      dragCounter.current -= 1;
      if (dragCounter.current === 0) {
        setIsDraggingOver(false);
      }
    };
    
    const handleDragOver = (e) => {
      e.preventDefault();
      e.stopPropagation();
    };
    
    const handleDrop = (e) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDraggingOver(false);
      dragCounter.current = 0;
      
      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        const file = e.dataTransfer.files[0];
        const isAudioOrMp4 = file.type.startsWith('audio/') || file.name.toLowerCase().endsWith('.mp4');
        if (isAudioOrMp4) {
          addAudioTrack(file);
        } else {
          alert(t('editor.invalidAudio'));
        }
      }
    };
    
    window.addEventListener('dragenter', handleDragEnter);
    window.addEventListener('dragleave', handleDragLeave);
    window.addEventListener('dragover', handleDragOver);
    window.addEventListener('drop', handleDrop);
    
    return () => {
      window.removeEventListener('dragenter', handleDragEnter);
      window.removeEventListener('dragleave', handleDragLeave);
      window.removeEventListener('dragover', handleDragOver);
      window.removeEventListener('drop', handleDrop);
    };
  }, [addAudioTrack]);

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
      
      audioTracks.forEach(track => {
          const aRef = audioRefs.current[track.id];
          if (aRef) {
              const expectedAudioTime = video.currentTime - track.offset + track.trimStart;
              const isAudioActive = playing && (video.currentTime >= track.offset && expectedAudioTime <= track.trimEnd);
              
              if (isAudioActive) {
                 // Se estiver pausado, ajusta o tempo exatamente e dá play
                 if (aRef.paused) {
                     aRef.currentTime = expectedAudioTime;
                     aRef.play().catch(()=>{});
                 } else if (Math.abs(aRef.currentTime - expectedAudioTime) > 0.5) {
                     // Se desincronizar mais de 0.5s, força o seek (evita death spiral)
                     aRef.currentTime = expectedAudioTime;
                 }
              } else {
                 if (!aRef.paused) aRef.pause();
              }
          }
      });
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
      audioTracks.forEach(track => {
          const aRef = audioRefs.current[track.id];
          if (aRef) {
             const expectedAudioTime = time - track.offset + track.trimStart;
             aRef.currentTime = Math.max(track.trimStart, Math.min(expectedAudioTime, track.trimEnd));
          }
      });
    }
  }

  const handleAudioLeftDrag = useCallback((id, newOffset) => {
      setAudioTracks(prev => prev.map(t => {
         if (t.id !== id) return t;
         const delta = newOffset - t.offset;
         const newTrimStart = t.trimStart + delta;
         if (newTrimStart >= 0 && newTrimStart < t.trimEnd - 0.1) {
             return { ...t, offset: newOffset, trimStart: newTrimStart };
         }
         return t;
      }));
  }, []);

  const handleAudioRightDrag = useCallback((id, time) => {
      setAudioTracks(prev => prev.map(t => {
         if (t.id !== id) return t;
         const newTrimEnd = t.trimStart + (time - t.offset);
         if (newTrimEnd > t.trimStart + 0.1 && newTrimEnd <= t.duration) {
             return { ...t, trimEnd: newTrimEnd };
         }
         return t;
      }));
  }, []);
  
  const handleAudioOffsetChange = useCallback((id, newOffset) => {
      updateAudioTrack(id, { offset: newOffset });
  }, []);

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
    const onPlaying = () => setPlaying(true);
    
    const onPause = () => {
      setPlaying(false);
      audioTracks.forEach(t => {
        const aRef = audioRefs.current[t.id];
        if (aRef && !aRef.paused) aRef.pause();
      });
    };

    const onWaiting = () => {
      // Quando o vídeo trava pra carregar (buffering)
      audioTracks.forEach(t => {
        const aRef = audioRefs.current[t.id];
        if (aRef && !aRef.paused) aRef.pause();
      });
    };
    
    const onSeeking = () => {
      audioTracks.forEach(track => {
        const aRef = audioRefs.current[track.id];
        if (aRef) {
           const expectedAudioTime = video.currentTime - track.offset + track.trimStart;
           aRef.currentTime = Math.max(track.trimStart, Math.min(expectedAudioTime, track.trimEnd));
        }
      });
    };

    video.addEventListener('play', onPlay);
    video.addEventListener('playing', onPlaying);
    video.addEventListener('pause', onPause);
    video.addEventListener('waiting', onWaiting);
    video.addEventListener('seeking', onSeeking);

    return () => {
      video.removeEventListener('play', onPlay);
      video.removeEventListener('playing', onPlaying);
      video.removeEventListener('pause', onPause);
      video.removeEventListener('waiting', onWaiting);
      video.removeEventListener('seeking', onSeeking);
    };
  }, [audioTracks]);

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
      alert(t('editor.endBeforeStart'));
      return;
    }

    try {
      // Ensure FFmpeg is loaded
      if (!ffmpeg.loaded) {
        await ffmpeg.load();
      }

      const name = `clip_${clipCounter}`;
      const blob = await ffmpeg.createClip(videoFile, clipStart, clipEnd, name, true, audioTracks, volume); // True força a marca d'água

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
      alert(t('editor.createError'));
    }
  }, [clipStart, clipEnd, clipCounter, videoFile, ffmpeg, audioTracks, volume]);

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
      alert(t('editor.downloadError'));
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
  const pendingUploadMetadataRef = useRef(null);

  const handleDropboxUploadClick = (clip) => {
    const clientId = import.meta.env.VITE_DROPBOX_CLIENT_ID;
    if (!clientId || clientId === 'COLOQUE_SEU_CLIENT_ID_AQUI') {
      alert(t('editor.missingDropboxEnv'));
      return;
    }

    pendingDropboxClipRef.current = clip;
    setDropboxModalState({ isOpen: true, status: 'metadata', progress: 0, link: '', errorMessage: '' });
  };

  const startDropboxUploadFlow = (title, isPublic, game) => {
    pendingDropboxClipRef.current = { 
      ...pendingDropboxClipRef.current, 
      title, 
      isPublic,
      game 
    };
    pendingUploadMetadataRef.current = { title, isPublic };
    const clientId = import.meta.env.VITE_DROPBOX_CLIENT_ID;
    const token = localStorage.getItem('dropbox_token');

    if (!token) {
      setDropboxModalState(prev => ({ ...prev, status: 'connecting' }));
      const redirectUri = `${window.location.origin}/oauth-callback.html`;
      const authUrl = `https://www.dropbox.com/oauth2/authorize?client_id=${clientId}&response_type=token&redirect_uri=${encodeURIComponent(redirectUri)}`;
      window.open(authUrl, 'dropbox-auth', 'width=600,height=800,menubar=no,toolbar=no');
    } else {
      startDropboxUpload(pendingDropboxClipRef.current, token);
    }
  };

  const startDropboxUpload = async (clip, token) => {
    setDropboxModalState(prev => ({ ...prev, status: 'uploading', progress: 0, link: '', errorMessage: '' }));
    
    // Helper para gerar a thumbnail
    const generateThumbnail = (blob) => {
      return new Promise((resolve) => {
        const video = document.createElement('video');
        video.autoplay = false;
        video.muted = true;
        video.src = URL.createObjectURL(blob);
        video.onloadeddata = () => {
          video.currentTime = 0.5; // seek slightly forward to avoid black frame
        };
        video.onseeked = () => {
          const canvas = document.createElement('canvas');
          canvas.width = 320; 
          canvas.height = (video.videoHeight / video.videoWidth) * 320;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.6);
          URL.revokeObjectURL(video.src);
          resolve(dataUrl);
        };
        video.onerror = () => resolve(null);
      });
    };

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
             
             // Transforma o link compartilhável do Dropbox em um link direto (raw)
             // Ex: https://www.dropbox.com/scl/fi/xyz/arquivo.mp4?rlkey=abc&dl=0 -> https://dl.dropboxusercontent.com/scl/fi/xyz/arquivo.mp4?rlkey=abc&raw=1
             let rawUrl = shareData.url.replace('www.dropbox.com', 'dl.dropboxusercontent.com').replace('dl=0', 'raw=1');
             if (!rawUrl.includes('raw=1')) {
                // if it didn't have dl=0
                rawUrl += '&raw=1';
             }

             // Fetch IP
             let ip = '0.0.0.0';
             try {
               const res = await fetch('https://api.ipify.org?format=json');
               const data = await res.json();
               ip = data.ip;
             } catch (e) {
               console.warn("Could not fetch IP");
             }

             // Generate Thumbnail
             let thumbnailBase64 = null;
             try {
                thumbnailBase64 = await generateThumbnail(clip.blob);
             } catch (e) {
               console.warn("Could not generate thumbnail");
             }

             // Salvar no Firestore
             const docRef = await addDoc(collection(db, 'clips'), {
               title: clip.title,
               privacy: clip.isPublic,
               url: rawUrl,
               thumbnail: thumbnailBase64,
               createdAt: new Date().toISOString(),
               ip,
               gameName: clip.game?.name || null,
               gameId: clip.game?.id || null,
               gameBoxArt: clip.game?.boxArt || null,
               duration: clip.duration || null,
             });
             
             // Gera o link da aplicação usando o ID do Firestore
             const customUrl = `${window.location.origin}/clips/watch/${docRef.id}`;
             
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
        <nav className="header-nav">
          <a href="/" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>
            {t('nav.home')}
          </a>
          <a href="/clips" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1 4-10z"></path></svg>
            {t('nav.clips')}
          </a>
          <a href="/" className="hide-on-mobile" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="6" cy="6" r="3"></circle><circle cx="6" cy="18" r="3"></circle><line x1="20" y1="4" x2="8.12" y2="15.88"></line><line x1="14.47" y1="14.48" x2="20" y2="20"></line><line x1="8.12" y1="8.12" x2="12" y2="12"></line></svg>
            {t('nav.createClip')}
          </a>
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

          {/* Controls are now partially handled inside the timeline header */}
          <div className="video-controls">
            <button className="play-btn" onClick={togglePlay}>
              {playing ? '⏸' : '▶'}
            </button>
            <span className="time-display">
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>
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
            audioTracks={audioTracks}
            onAudioLeftDrag={handleAudioLeftDrag}
            onAudioRightDrag={handleAudioRightDrag}
            onAudioOffsetChange={handleAudioOffsetChange}
            videoVolume={volume}
            onVideoVolumeChange={handleVolumeChange}
            onRemoveAudioTrack={removeAudioTrack}
            onUpdateAudioTrack={updateAudioTrack}
            videoFile={videoFile}
            onAddAudioTrack={addAudioTrack}
          />

          {/* Add Audio Button Area (now mostly handled in Timeline) */}
          <div className="audio-track-area">
             {/* Hidden audio players for playback sync */}
             {audioTracks.map(track => (
                <audio 
                  key={track.id} 
                  ref={el => audioRefs.current[track.id] = el} 
                  src={track.url}
                  onLoadedMetadata={(e) => {
                     if (track.duration === 0) {
                        updateAudioTrack(track.id, { duration: e.target.duration, trimEnd: e.target.duration });
                     }
                  }}
                />
             ))}
          </div>

          {/* Create clip button */}
          <div className="create-clip-area">
            <button
              className="btn btn-primary btn-lg"
              onClick={handleCreateClip}
              disabled={ffmpeg.processing || clipEnd <= clipStart}
            >
              {t('editor.createClipBtn')} ({formatTime(clipEnd - clipStart)})
            </button>
            
            <button
              className="btn btn-secondary"
              onClick={() => {
                setClipStart(currentTime);
              }}
              title={t('editor.markStartTitle')}
            >
              {t('editor.markStartBtn')}
            </button>
            <button
              className="btn btn-secondary"
              onClick={() => {
                setClipEnd(currentTime);
              }}
              title={t('editor.markEndTitle')}
            >
              {t('editor.markEndBtn')}
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
          onStartUpload={startDropboxUploadFlow}
        />
      )}

      {/* Loading overlays */}
      {(ffmpeg.loading || ffmpeg.processing) && (
        <div className="loading-overlay">
          <div className="loading-spinner" />
          <p>{ffmpeg.processingMessage || t('editor.processing')}</p>
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
          <p>{t('editor.zipping')}</p>
        </div>
      )}

      {isDraggingOver && (
        <div className="drag-overlay">
          <div className="drag-content">
            <h2>{t('editor.dropAudio')}</h2>
          </div>
        </div>
      )}
    </div>
  );
}
