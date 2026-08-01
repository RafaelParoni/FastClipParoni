import { useState, useRef, useCallback, useEffect } from 'react';
import useVideoFrames from '../hooks/useVideoFrames';
import useAudioWaveform from '../hooks/useAudioWaveform';
import { useLanguage } from '../contexts/LanguageContext';

function AudioTrackContent({ track, index, getPositionPercent, handleMouseDown, dragState }) {
  const { waveformUrl } = useAudioWaveform(track.file, 'rgba(253, 224, 71, 0.8)');
  const { t } = useLanguage();
  
  return (
    <div className="track-row">
      <div className="track-content audio-track">
        <div 
          className="timeline-selection extra-audio-selection" 
          style={{ 
            left: `${getPositionPercent(track.offset)}%`, 
            width: `${getPositionPercent(track.trimEnd - track.trimStart)}%`,
            height: '100%',
            top: 0,
            cursor: 'grab',
            backgroundImage: waveformUrl ? `url(${waveformUrl})` : 'none',
            backgroundSize: '100% 100%',
            backgroundRepeat: 'no-repeat'
          }}
          onMouseDown={(e) => handleMouseDown(e, 'audio-move', track.id)}
        >
          <span className="track-label" style={{ background: 'rgba(0,0,0,0.5)', padding: '2px 4px', borderRadius: '4px' }} title={track.file.name}>🎵 {track.file.name}</span>
          <div
            className={`timeline-handle handle-start ${dragState?.type === 'audio-start' && dragState?.trackId === track.id ? 'dragging' : ''}`}
            style={{ left: 0 }}
            onMouseDown={(e) => handleMouseDown(e, 'audio-start', track.id)}
          />
          <div
            className={`timeline-handle handle-end ${dragState?.type === 'audio-end' && dragState?.trackId === track.id ? 'dragging' : ''}`}
            style={{ left: '100%' }}
            onMouseDown={(e) => handleMouseDown(e, 'audio-end', track.id)}
          />
        </div>
      </div>
    </div>
  );
}

export default function Timeline({
  duration,
  currentTime,
  clipStart,
  clipEnd,
  onClipStartChange,
  onClipEndChange,
  onSeek,
  audioTracks = [],
  onAudioLeftDrag,
  onAudioRightDrag,
  onAudioOffsetChange,
  videoVolume,
  onVideoVolumeChange,
  onRemoveAudioTrack,
  onUpdateAudioTrack,
  videoFile,
  onAddAudioTrack,
}) {
  const { t } = useLanguage();
  const trackRef = useRef(null);
  const [dragState, setDragState] = useState(null);

  const { frames } = useVideoFrames(videoFile, 15);

  const getPositionPercent = useCallback((time) => {
    if (!duration) return 0;
    return (time / duration) * 100;
  }, [duration]);

  const getTimeFromPosition = useCallback((clientX) => {
    if (!trackRef.current || !duration) return 0;
    const rect = trackRef.current.getBoundingClientRect();
    const percent = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    return percent * duration;
  }, [duration]);

  const handleMouseDown = useCallback((e, type, trackId = null) => {
    e.preventDefault();
    e.stopPropagation();
    const time = getTimeFromPosition(e.clientX);
    const track = trackId ? audioTracks.find(t => t.id === trackId) : null;
    setDragState({
      type,
      trackId,
      initialTime: time,
      initialClipStart: clipStart,
      initialClipEnd: clipEnd,
      initialAudioOffset: track ? track.offset : 0
    });
  }, [getTimeFromPosition, clipStart, clipEnd, audioTracks]);

  const handleTrackClick = useCallback((e) => {
    if (dragState) return;
    const time = getTimeFromPosition(e.clientX);
    onSeek(time);
  }, [dragState, getTimeFromPosition, onSeek]);

  useEffect(() => {
    if (!dragState) return;

    function handleMouseMove(e) {
      const time = getTimeFromPosition(e.clientX);

      if (dragState.type === 'start') {
        const newStart = Math.max(0, Math.min(time, clipEnd - 0.5));
        onClipStartChange(newStart);
      } else if (dragState.type === 'end') {
        const newEnd = Math.min(duration, Math.max(time, clipStart + 0.5));
        onClipEndChange(newEnd);
      } else if (dragState.type === 'playhead') {
        onSeek(Math.max(0, Math.min(duration, time)));
      } else if (dragState.type === 'audio-start') {
        if (onAudioLeftDrag) onAudioLeftDrag(dragState.trackId, time);
      } else if (dragState.type === 'audio-end') {
        if (onAudioRightDrag) onAudioRightDrag(dragState.trackId, time);
      } else if (dragState.type === 'video-move') {
        const delta = time - dragState.initialTime;
        const clipDuration = dragState.initialClipEnd - dragState.initialClipStart;
        let newStart = dragState.initialClipStart + delta;
        let newEnd = dragState.initialClipEnd + delta;
        if (newStart < 0) {
          newStart = 0;
          newEnd = clipDuration;
        }
        if (newEnd > duration) {
          newEnd = duration;
          newStart = duration - clipDuration;
        }
        onClipStartChange(newStart);
        onClipEndChange(newEnd);
      } else if (dragState.type === 'audio-move') {
        const delta = time - dragState.initialTime;
        let newOffset = dragState.initialAudioOffset + delta;
        if (newOffset < 0) newOffset = 0;
        if (onAudioOffsetChange) onAudioOffsetChange(dragState.trackId, newOffset);
      }
    }

    function handleMouseUp() {
      setDragState(null);
    }

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [dragState, clipStart, clipEnd, duration, getTimeFromPosition, onClipStartChange, onClipEndChange, onSeek, onAudioLeftDrag, onAudioRightDrag, onAudioOffsetChange]);

  const clipDuration = clipEnd - clipStart;

  return (
    <div className="timeline-section">
      <div className="timeline-header">
        <h3>{t('timeline.selectClip')}</h3>
        <div className="time-inputs">
          <div className="time-input-group">
            <label>{t('timeline.start')}</label>
            <input
              type="text"
              value={formatTime(clipStart)}
              onChange={(e) => {
                const t = parseTime(e.target.value);
                if (t !== null && t < clipEnd) onClipStartChange(Math.max(0, t));
              }}
            />
          </div>
          <div className="time-input-group">
            <label>{t('timeline.end')}</label>
            <input
              type="text"
              value={formatTime(clipEnd)}
              onChange={(e) => {
                const t = parseTime(e.target.value);
                if (t !== null && t > clipStart) onClipEndChange(Math.min(duration, t));
              }}
            />
          </div>
          <span className="duration-badge">
            ⏱ {formatTime(clipDuration)}
          </span>
        </div>
      </div>

      <div className="timeline-layout">
        {/* Track Headers (Left Column) */}
        <div className="timeline-headers">
          <div className="track-header">
            <label title="Clip">{t('timeline.clipLabel')}</label>
            <div className="track-volume-container">
              <span className="volume-percent">{Math.round(videoVolume * 100)}%</span>
              <input type="range" min="0" max="1" step="0.01" value={videoVolume} onChange={onVideoVolumeChange} className="vertical-slider" />
            </div>
          </div>
          
          {audioTracks.map((track, index) => (
            <div key={track.id} className="track-header">
              <button className="delete-track-btn" onClick={() => onRemoveAudioTrack(track.id)}>{t('timeline.remove')}</button>
              <label title={track.file.name}>{t('timeline.audioLabel')} {index + 1}</label>
              <div className="track-volume-container">
                <span className="volume-percent">{Math.round(track.volume * 100)}%</span>
                <input type="range" min="0" max="1" step="0.01" value={track.volume} onChange={(e) => onUpdateAudioTrack(track.id, { volume: parseFloat(e.target.value) })} className="vertical-slider" />
              </div>
            </div>
          ))}

          {/* Empty header for Add Audio Row */}
          {audioTracks.length < 5 && (
            <div className="track-header" style={{ border: 'none', background: 'transparent' }}>
            </div>
          )}
        </div>

        {/* Timeline Tracks Area (Right Column) */}
        <div className="timeline-tracks-area" ref={trackRef} onClick={handleTrackClick}>
          {/* Video Track */}
          <div className="track-row">
            <div className="track-content video-track" style={{ display: 'flex', overflow: 'hidden' }}>
              {frames.map((src, i) => (
                <img key={i} src={src} alt="frame" style={{ flexGrow: 1, height: '100%', objectFit: 'cover', minWidth: 0, opacity: 0.6 }} />
              ))}
              <div className="timeline-progress" style={{ width: '100%', borderRadius: '15px' }} />
              <div
                className="timeline-selection split-video-selection"
                style={{
                  left: `${getPositionPercent(clipStart)}%`,
                  width: `${getPositionPercent(clipEnd) - getPositionPercent(clipStart)}%`,
                  cursor: 'grab'
                }}
                onMouseDown={(e) => handleMouseDown(e, 'video-move')}
              />
              <div
                className="timeline-playhead"
                style={{ left: `${getPositionPercent(currentTime)}%` }}
                onMouseDown={(e) => handleMouseDown(e, 'playhead')}
              />
              <div
                className={`timeline-handle handle-start ${dragState?.type === 'start' ? 'dragging' : ''}`}
                style={{ left: `${getPositionPercent(clipStart)}%` }}
                onMouseDown={(e) => handleMouseDown(e, 'start')}
              />
              <div
                className={`timeline-handle handle-end ${dragState?.type === 'end' ? 'dragging' : ''}`}
                style={{ left: `${getPositionPercent(clipEnd)}%` }}
                onMouseDown={(e) => handleMouseDown(e, 'end')}
              />
            </div>
          </div>

          {/* Extra Audio Tracks */}
          {audioTracks.map((track, index) => (
            <AudioTrackContent 
              key={track.id} 
              track={track} 
              index={index} 
              getPositionPercent={getPositionPercent} 
              handleMouseDown={handleMouseDown} 
              dragState={dragState} 
            />
          ))}

          {/* Add New Audio Track Row */}
          {audioTracks.length < 5 && (
            <div className="track-row">
              <label 
                className="track-content" 
                style={{ 
                  border: '2px dashed var(--border-subtle)', 
                  background: 'rgba(255, 255, 255, 0.02)', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  cursor: 'pointer',
                  color: 'var(--text-muted)'
                }}
              >
                <span>{t('timeline.addAudio')}</span>
                <input 
                  type="file" 
                  accept="audio/*, video/mp4, video/quicktime" 
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) onAddAudioTrack(e.target.files[0]);
                    e.target.value = '';
                  }}
                  style={{ display: 'none' }} 
                />
              </label>
            </div>
          )}
        </div>
      </div>

      <div className="timeline-time-labels">
        <span>00:00:00</span>
        <span>{formatTime(duration)}</span>
      </div>
    </div>
  );
}

export function formatTime(seconds) {
  if (!seconds || seconds < 0) return '00:00:00';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  return `${pad(h)}:${pad(m)}:${pad(s)}`;
}

function pad(n) {
  return String(n).padStart(2, '0');
}

function parseTime(str) {
  const parts = str.split(':').map(Number);
  if (parts.length === 3 && parts.every((p) => !isNaN(p))) {
    return parts[0] * 3600 + parts[1] * 60 + parts[2];
  }
  if (parts.length === 2 && parts.every((p) => !isNaN(p))) {
    return parts[0] * 60 + parts[1];
  }
  return null;
}
