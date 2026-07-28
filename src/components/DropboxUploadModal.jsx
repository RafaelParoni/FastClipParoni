import { useRef, useState } from 'react';

export default function DropboxUploadModal({ 
  status, // 'metadata', 'connecting', 'uploading', 'generating', 'success', 'error'
  progress, // 0 to 100
  link, // generated link
  errorMessage,
  onClose,
  onStartUpload
}) {
  const linkInputRef = useRef(null);
  const [title, setTitle] = useState('');
  const [isPublic, setIsPublic] = useState(true);

  const copyToClipboard = () => {
    if (linkInputRef.current) {
      linkInputRef.current.select();
      document.execCommand('copy');
    }
  };

  const handleStart = () => {
    if (!title.trim()) {
      alert('Por favor, insira um título para o vídeo.');
      return;
    }
    if (onStartUpload) {
      onStartUpload(title, isPublic);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <h2>Compartilhar Vídeo</h2>
          {status !== 'uploading' && status !== 'generating' && (
             <button className="btn btn-secondary" onClick={onClose}>✕</button>
          )}
        </div>
        
        <div className="modal-body" style={{ textAlign: 'center', padding: '2rem 1rem' }}>
          {status === 'metadata' && (
            <div style={{ textAlign: 'left', maxWidth: '400px', margin: '0 auto' }}>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Título do Vídeo:</label>
                <input 
                  type="text" 
                  value={title} 
                  onChange={(e) => setTitle(e.target.value)} 
                  placeholder="Ex: Minha Gameplay Épica"
                  style={{ width: '100%', padding: '0.8rem', borderRadius: '4px', border: '1px solid #444', background: '#111', color: '#fff' }}
                />
              </div>
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Privacidade:</label>
                <select 
                  value={isPublic ? 'true' : 'false'} 
                  onChange={(e) => setIsPublic(e.target.value === 'true')}
                  style={{ width: '100%', padding: '0.8rem', borderRadius: '4px', border: '1px solid #444', background: '#111', color: '#fff' }}
                >
                  <option value="true">Público (Qualquer um com o link)</option>
                  <option value="false">Não Listado (Apenas quem tem o link)</option>
                </select>
              </div>
              <button className="btn btn-primary" style={{ width: '100%', padding: '1rem', backgroundColor: '#0061FE' }} onClick={handleStart}>
                Iniciar Upload
              </button>
            </div>
          )}

          {status === 'connecting' && (
            <div>
              <div className="loading-spinner" style={{ margin: '0 auto 1rem', borderColor: 'rgba(255,255,255,0.2)', borderTopColor: '#0061FE' }} />
              <p>Conectando ao Dropbox...</p>
            </div>
          )}

          {status === 'uploading' && (
            <div>
              <div className="loading-spinner" style={{ margin: '0 auto 1rem', borderColor: 'rgba(255,255,255,0.2)', borderTopColor: '#0061FE' }} />
              <p>Enviando vídeo para o Dropbox... {Math.round(progress)}%</p>
              <div className="progress-bar-container" style={{ marginTop: '1rem' }}>
                <div className="progress-bar-fill" style={{ width: `${progress}%`, backgroundColor: '#0061FE' }} />
              </div>
            </div>
          )}

          {status === 'generating' && (
            <div>
              <div className="loading-spinner" style={{ margin: '0 auto 1rem', borderColor: 'rgba(255,255,255,0.2)', borderTopColor: '#0061FE' }} />
              <p>Gerando link compartilhável...</p>
            </div>
          )}

          {status === 'error' && (
            <div>
              <span style={{ fontSize: '3rem', display: 'block', marginBottom: '1rem' }}>❌</span>
              <p style={{ color: '#ff4d4f' }}>Erro: {errorMessage}</p>
            </div>
          )}

          {status === 'success' && link && (
            <div>
              <span style={{ fontSize: '3rem', display: 'block', marginBottom: '1rem' }}>✅</span>
              <p>Vídeo enviado com sucesso!</p>
              <p style={{ fontSize: '0.9rem', color: '#888', marginBottom: '1rem' }}>Este link foi modificado para reprodução automática no Discord.</p>
              
              <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
                <input 
                  ref={linkInputRef}
                  type="text" 
                  value={link} 
                  readOnly 
                  style={{ 
                    flex: 1, 
                    padding: '0.5rem', 
                    borderRadius: '4px', 
                    border: '1px solid #444', 
                    backgroundColor: '#111', 
                    color: '#fff' 
                  }} 
                />
                <button className="btn btn-primary" onClick={copyToClipboard} style={{ backgroundColor: '#0061FE' }}>
                  Copiar Link
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
