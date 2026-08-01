import { useState, useEffect } from 'react';
import UploadScreen from './components/UploadScreen';
import VideoEditor from './components/VideoEditor';
import WatchScreen from './components/WatchScreen';
import ClipsFeed from './components/ClipsFeed';
import PrivacyPolicy from './components/PrivacyPolicy';
import { useFFmpeg } from './hooks/useFFmpeg';

function App() {
  const [videoFile, setVideoFile] = useState(null);
  
  // Roteamento para Tela de Watch via ID do Firestore
  const [watchId, setWatchId] = useState(null);
  
  useEffect(() => {
    const path = window.location.pathname;
    if (path.startsWith('/clips/watch/')) {
      const id = path.split('/clips/watch/')[1];
      // Mesmo se for vazio, definimos para engatilhar a tela de Watch (que mostrará o erro)
      setWatchId(id || '');
    }
  }, []);

  useEffect(() => {
    const handlePopState = () => {
      // Se voltarmos e não tivermos mais a rota /editor (estamos em /), limpa o vídeo
      if (window.location.pathname === '/' || window.location.pathname === '') {
        setVideoFile(null);
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Força redirecionamento para '/' se estiver em '/editor' sem arquivo de vídeo
  useEffect(() => {
    if (window.location.pathname === '/editor' && !videoFile) {
      window.history.replaceState({}, '', '/');
    }
  }, [videoFile]);

  const ffmpeg = useFFmpeg();

  function handleVideoSelected(file) {
    setVideoFile(file);
    window.history.pushState({}, '', '/editor');
    // Limpa a rota watch ao fazer upload de um vídeo novo
    if (watchId) {
       setWatchId(null);
    }
  }

  function handleBack() {
    setVideoFile(null);
    window.history.pushState({}, '', '/');
  }
  
  function handleBackFromWatch() {
    window.history.pushState({}, '', '/');
    setWatchId(null);
  }

  if (watchId !== null && !videoFile) {
    return <WatchScreen clipId={watchId} onBack={handleBackFromWatch} />;
  }

  if (window.location.pathname === '/clips' || window.location.pathname === '/clips/') {
    return <ClipsFeed onBack={handleBackFromWatch} />;
  }

  if (window.location.pathname === '/privacidade' || window.location.pathname === '/privacidade/') {
    return <PrivacyPolicy onBack={handleBackFromWatch} />;
  }

  if (!videoFile) {
    return <UploadScreen onVideoSelected={handleVideoSelected} />;
  }

  return (
    <VideoEditor
      videoFile={videoFile}
      onBack={handleBack}
      ffmpeg={ffmpeg}
    />
  );
}

export default App;
