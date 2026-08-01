import { useState, useEffect } from 'react';
import { formatTime } from './Timeline';
import SubmitClipModal from './SubmitClipModal';
import { useLanguage } from '../contexts/LanguageContext';

export default function ClipList({ clips, onPreview, onDownload, onDelete, onDownloadAll, onDropboxUpload }) {
  const { t } = useLanguage();
  const [publishClip, setPublishClip] = useState(null);
  const [isPreparingModal, setIsPreparingModal] = useState(null);

  return (
    <div className="clip-sidebar">
      <div className="clip-sidebar-header">
        <h2>
          {t('cliplist.title')}
          {clips.length > 0 && <span className="clip-count">{clips.length}</span>}
        </h2>
      </div>

      <div className="clip-list">
        {clips.length === 0 ? (
          <div className="clip-list-empty">
            <span className="empty-icon">✂️</span>
            <p dangerouslySetInnerHTML={{ __html: t('cliplist.empty') }}></p>
          </div>
        ) : (
          clips.map((clip, index) => (
            <div key={clip.id} className="clip-item">
              <div className="clip-item-header">
                <span className="clip-name">{clip.name}</span>
                <span className="clip-number">#{index + 1}</span>
              </div>
              <div className="clip-item-meta">
                <span>⏱ {formatTime(clip.duration)}</span>
                <span>📍 {formatTime(clip.startTime)} → {formatTime(clip.endTime)}</span>
              </div>
              <div className="clip-item-actions" style={{ flexDirection: 'column', gap: '10px' }}>
                <div style={{ display: 'flex', gap: '8px', width: '100%' }}>
                  <button
                    className="btn btn-secondary"
                    onClick={() => onPreview(clip)}
                    title={t('cliplist.preview')}
                    style={{ flex: 1 }}
                  >
                    {t('cliplist.preview')}
                  </button>
                  <button
                    className="btn btn-primary"
                    onClick={() => onDownload(clip)}
                    title={t('cliplist.download')}
                    style={{ flex: 1 }}
                  >
                    {t('cliplist.download')}
                  </button>
                  <button
                    className="btn btn-danger"
                    onClick={() => onDelete(clip.id)}
                    title="Delete clip"
                    style={{ padding: '0 12px' }}
                  >
                    ✕
                  </button>
                </div>
                
                <div style={{ marginTop: '8px' }}>
                  <button
                    className="btn btn-primary"
                    onClick={() => {
                      setIsPreparingModal(clip.id);
                      setTimeout(() => {
                        setPublishClip(clip);
                        setIsPreparingModal(null);
                      }, 300);
                    }}
                    disabled={isPreparingModal === clip.id}
                    title={t('cliplist.publish')}
                    style={{ width: '100%', backgroundColor: '#0061FE', borderColor: '#0061FE', opacity: isPreparingModal === clip.id ? 0.7 : 1 }}
                  >
                    {isPreparingModal === clip.id ? t('cliplist.loading') : t('cliplist.publish')}
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {publishClip && (
        <SubmitClipModal 
          initialVideoFile={new File([publishClip.blob], publishClip.name || 'clip.mp4', { type: publishClip.blob?.type || 'video/mp4' })}
          onClose={() => setPublishClip(null)}
          onSuccess={() => {
            setPublishClip(null);
          }}
        />
      )}

      {clips.length > 1 && (
        <div className="clip-sidebar-footer">
          <button
            className="btn btn-primary btn-lg"
            onClick={onDownloadAll}
          >
            {t('cliplist.downloadAll')} ({clips.length} {t('cliplist.clips')})
          </button>
        </div>
      )}
    </div>
  );
}
