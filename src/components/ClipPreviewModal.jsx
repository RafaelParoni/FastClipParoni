import { useRef, useEffect } from 'react';
import { formatTime } from './Timeline';
import { useLanguage } from '../contexts/LanguageContext';

export default function ClipPreviewModal({ clip, onClose, onDownload }) {
  const { t } = useLanguage();
  const videoRef = useRef(null);

  useEffect(() => {
    function handleEscape(e) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  if (!clip) return null;

  const blobUrl = URL.createObjectURL(clip.blob);

  function handleOverlayClick(e) {
    if (e.target === e.currentTarget) {
      onClose();
    }
  }

  return (
    <div className="modal-overlay" onClick={handleOverlayClick}>
      <div className="modal-content">
        <div className="modal-header">
          <h2>▶ {clip.name}</h2>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          <video
            ref={videoRef}
            src={blobUrl}
            controls
            autoPlay
            onLoadedData={() => {
              // Video ready
            }}
          />
          <div className="clip-item-meta" style={{ justifyContent: 'center' }}>
            <span>⏱ {t('preview.duration')} {formatTime(clip.duration)}</span>
            <span>📍 {formatTime(clip.startTime)} → {formatTime(clip.endTime)}</span>
          </div>
          <div className="modal-actions">
            <button className="btn btn-primary btn-lg" onClick={() => onDownload(clip)}>
              ⬇ {t('preview.download')}
            </button>
            <button className="btn btn-secondary btn-lg" onClick={onClose}>
              {t('preview.close')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
