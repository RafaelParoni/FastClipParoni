import { useState, useEffect } from 'react';
import UploadScreen from './components/UploadScreen';
import VideoEditor from './components/VideoEditor';
import WatchScreen from './components/WatchScreen';
import { useFFmpeg } from './hooks/useFFmpeg';

function App() {
  const [videoFile, setVideoFile] = useState(null);
  
  // Roteamento simples via query parameters
  const [watchParams, setWatchParams] = useState(null);
  
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const watchPath = params.get('watch');
    const rlkey = params.get('rlkey');
    
    if (watchPath && rlkey) {
      setWatchParams({ path: watchPath, rlkey });
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
    if (watchParams) {
       setWatchParams(null);
    }
  }

  function handleBack() {
    setVideoFile(null);
    window.history.pushState({}, '', '/');
  }
  
  function handleBackFromWatch() {
    window.history.pushState({}, '', '/');
    setWatchParams(null);
  }

  if (watchParams && !videoFile) {
    return <WatchScreen path={watchParams.path} rlkey={watchParams.rlkey} onBack={handleBackFromWatch} />;
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
