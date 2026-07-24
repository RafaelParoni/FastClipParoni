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

  const ffmpeg = useFFmpeg();

  function handleVideoSelected(file) {
    setVideoFile(file);
    // Limpa a rota watch ao fazer upload de um vídeo novo
    if (watchParams) {
       window.history.pushState({}, '', '/');
       setWatchParams(null);
    }
  }

  function handleBack() {
    setVideoFile(null);
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
