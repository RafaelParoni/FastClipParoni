import { useState } from 'react';
import UploadScreen from './components/UploadScreen';
import VideoEditor from './components/VideoEditor';
import { useFFmpeg } from './hooks/useFFmpeg';

function App() {
  const [videoFile, setVideoFile] = useState(null);
  const ffmpeg = useFFmpeg();

  function handleVideoSelected(file) {
    setVideoFile(file);
  }

  function handleBack() {
    setVideoFile(null);
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
