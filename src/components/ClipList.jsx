import { formatTime } from './Timeline';

export default function ClipList({ clips, onPreview, onDownload, onDelete, onDownloadAll, onDropboxUpload }) {
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
              <div className="clip-item-actions">
                <button
                  className="btn btn-secondary"
                  onClick={() => onPreview(clip)}
                  title="Visualizar clip"
                >
                  ▶ Ver
                </button>
                <button
                  className="btn btn-primary"
                  onClick={() => onDownload(clip)}
                  title="Baixar clip"
                >
                  ⬇ Baixar
                </button>
                <button
                  className="btn btn-secondary"
                  onClick={() => onDropboxUpload(clip)}
                  title="Salvar no Dropbox"
                  style={{ backgroundColor: '#0061FE', borderColor: '#0061FE', color: '#fff' }}
                >
                  ☁️ Dropbox
                </button>
                <button
                  className="btn btn-danger"
                  onClick={() => onDelete(clip.id)}
                  title="Deletar clip"
                >
                  ✕
                </button>
              </div>
            </div>
          ))
        )}
      </div>

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
