import { useState, useRef, useCallback, useEffect } from 'react';

export default function Timeline({
  duration,
  currentTime,
  clipStart,
  clipEnd,
  onClipStartChange,
  onClipEndChange,
  onSeek,
}) {
  const trackRef = useRef(null);
  const [dragging, setDragging] = useState(null); // 'start' | 'end' | 'playhead' | null

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

  const handleMouseDown = useCallback((e, type) => {
    e.preventDefault();
    e.stopPropagation();
    setDragging(type);
  }, []);

  const handleTrackClick = useCallback((e) => {
    if (dragging) return;
    const time = getTimeFromPosition(e.clientX);
    onSeek(time);
  }, [dragging, getTimeFromPosition, onSeek]);

  useEffect(() => {
    if (!dragging) return;

    function handleMouseMove(e) {
      const time = getTimeFromPosition(e.clientX);

      if (dragging === 'start') {
        const newStart = Math.max(0, Math.min(time, clipEnd - 0.5));
        onClipStartChange(newStart);
      } else if (dragging === 'end') {
        const newEnd = Math.min(duration, Math.max(time, clipStart + 0.5));
        onClipEndChange(newEnd);
      } else if (dragging === 'playhead') {
        onSeek(Math.max(0, Math.min(duration, time)));
      }
    }

    function handleMouseUp() {
      setDragging(null);
    }

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [dragging, clipStart, clipEnd, duration, getTimeFromPosition, onClipStartChange, onClipEndChange, onSeek]);

  const clipDuration = clipEnd - clipStart;

  return (
    <div className="timeline-section">
      <div className="timeline-header">
        <h3>✂️ Selecionar Clip</h3>
        <div className="time-inputs">
          <div className="time-input-group">
            <label>Início</label>
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
            <label>Fim</label>
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

      <div
        className="timeline-track-wrapper"
        ref={trackRef}
        onClick={handleTrackClick}
      >
        <div className="timeline-track">
          {/* Current progress */}
          <div
            className="timeline-progress"
            style={{ width: `${getPositionPercent(currentTime)}%` }}
          />

          {/* Selection range */}
          <div
            className="timeline-selection"
            style={{
              left: `${getPositionPercent(clipStart)}%`,
              width: `${getPositionPercent(clipEnd) - getPositionPercent(clipStart)}%`,
            }}
          />

          {/* Playhead */}
          <div
            className="timeline-playhead"
            style={{ left: `${getPositionPercent(currentTime)}%` }}
            onMouseDown={(e) => handleMouseDown(e, 'playhead')}
          />

          {/* Start handle */}
          <div
            className={`timeline-handle handle-start ${dragging === 'start' ? 'dragging' : ''}`}
            style={{ left: `${getPositionPercent(clipStart)}%` }}
            onMouseDown={(e) => handleMouseDown(e, 'start')}
          />

          {/* End handle */}
          <div
            className={`timeline-handle handle-end ${dragging === 'end' ? 'dragging' : ''}`}
            style={{ left: `${getPositionPercent(clipEnd)}%` }}
            onMouseDown={(e) => handleMouseDown(e, 'end')}
          />
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
