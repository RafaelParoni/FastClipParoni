import { useRef } from 'react';

export default function DropboxUploadModal({ 
  status, // 'connecting', 'uploading', 'generating', 'success', 'error'
  progress, // 0 to 100
  link, // generated link
  errorMessage,
  onClose
}) {
  const linkInputRef = useRef(null);

  const copyToClipboard = () => {
    if (linkInputRef.current) {
      linkInputRef.current.select();
      document.execCommand('copy');
      // optional visual feedback could be added here
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <h2>Salvar no Dropbox</h2>
          {status !== 'uploading' && status !== 'generating' && (
             <button className="btn btn-secondary" onClick={onClose}>✕</button>
          )}
        </div>
        
        <div className="modal-body" style={{ textAlign: 'center', padding: '2rem 1rem' }}>
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
