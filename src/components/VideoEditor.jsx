import { useState, useRef, useCallback, useEffect } from 'react';
import Timeline, { formatTime } from './Timeline';
import ClipList from './ClipList';
import ClipPreviewModal from './ClipPreviewModal';
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
      const blob = await ffmpeg.createClip(videoFile, clipStart, clipEnd, name);

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
            <a href="https://www.instagram.com/rafael_paroni" target="_blank" rel="noopener noreferrer">Instagram</a>
            <a href="https://github.com/RafaelParoni" target="_blank" rel="noopener noreferrer">GitHub</a>
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
