import { useState, useEffect } from 'react';
import { formatTime } from './Timeline';
import SubmitClipModal from './SubmitClipModal';

export default function ClipList({ clips, onPreview, onDownload, onDelete, onDownloadAll, onDropboxUpload }) {
  const [publishClip, setPublishClip] = useState(null);

  return (
    <div className="clip-sidebar">
      <div className="clip-sidebar-header">
        <h2>
          🎞️ Clips
          {clips.length > 0 && <span className="clip-count">{clips.length}</span>}
        </h2>
      </div>

      <div className="clip-list">
        {clips.length === 0 ? (
          <div className="clip-list-empty">
            <span className="empty-icon">✂️</span>
            <p>Nenhum clip criado ainda.<br />Selecione um trecho na timeline e clique em &quot;Criar Clip&quot;.</p>
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
                    title="Visualizar clip"
                    style={{ flex: 1 }}
                  >
                    ▶ Ver
                  </button>
                  <button
                    className="btn btn-primary"
                    onClick={() => onDownload(clip)}
                    title="Baixar clip"
                    style={{ flex: 1 }}
                  >
                    ⬇ Baixar
                  </button>
                  <button
                    className="btn btn-danger"
                    onClick={() => onDelete(clip.id)}
                    title="Deletar clip"
                    style={{ padding: '0 12px' }}
                  >
                    ✕
                  </button>
                </div>
                
                <div style={{ marginTop: '8px' }}>
                  <button
                    className="btn btn-primary"
                    onClick={() => setPublishClip(clip)}
                    title="Publicar Clip na Nuvem"
                    style={{ width: '100%', backgroundColor: '#0061FE', borderColor: '#0061FE' }}
                  >
                    ☁️ Publicar
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
            alert('Clipe publicado com sucesso na galeria!');
          }}
        />
      )}

      {clips.length > 1 && (
        <div className="clip-sidebar-footer">
          <button
            className="btn btn-primary btn-lg"
            onClick={onDownloadAll}
          >
            ⬇ Baixar Todos ({clips.length} clips)
          </button>
        </div>
      )}
    </div>
  );
}
