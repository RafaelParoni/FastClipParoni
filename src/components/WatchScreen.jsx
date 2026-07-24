import { useState, useRef, useEffect } from 'react';

export default function WatchScreen({ path, rlkey, onBack }) {
  const [copied, setCopied] = useState(false);
  const videoRef = useRef(null);

  // Reconstrói o link oficial do Dropbox e o link de compartilhamento
  const dropboxUrl = `https://dl.dropboxusercontent.com/scl/fi/${path}?rlkey=${rlkey}&raw=1`;
  const shareLink = `${window.location.origin}/v/${path}?rlkey=${rlkey}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareLink).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }).catch(err => {
      console.error('Falha ao copiar:', err);
      alert('Não foi possível copiar o link.');
    });
  };

  return (
    <div className="editor-layout" style={{ justifyContent: 'center' }}>
      <div className="editor-header">
        <span className="logo" onClick={onBack} style={{ cursor: 'pointer' }}>
          <img src="/favicon.ico" alt="Logo" className="site-icon" /> FastClip<span className="author-name">Paroni</span>
        </span>
        <div className="header-actions">
          <button className="btn btn-primary desktop-only" onClick={onBack}>
            ✂️ Criar o meu Clipe
          </button>
        </div>
      </div>

      <div className="editor-body" style={{ alignItems: 'center', justifyContent: 'center' }}>
        <div className="editor-main" style={{ maxWidth: '900px', width: '100%' }}>
          
          <div className="video-container" style={{ borderRadius: '12px', overflow: 'hidden', boxShadow: '0 8px 24px rgba(0,0,0,0.5)', height: 'auto', minHeight: 'auto', background: 'transparent' }}>
            <video
              ref={videoRef}
              src={dropboxUrl}
              controls
              autoPlay
              style={{ width: '100%', maxHeight: '70vh', display: 'block' }}
            />
          </div>

          <p style={{ textAlign: 'center', marginTop: '16px', color: '#a0a0a0', fontSize: '0.9rem' }}>
            ℹ️ Este clipe foi salvo diretamente no Dropbox do usuário que o criou.
          </p>

          <div style={{ display: 'flex', justifyContent: 'center', marginTop: '24px', gap: '16px', flexWrap: 'wrap' }}>
            <button 
              className={`btn ${copied ? 'btn-primary' : 'btn-secondary'}`} 
              onClick={handleCopyLink}
              style={{ minWidth: '200px' }}
            >
              {copied ? '✅ Copiado!' : '🔗 Copiar Link'}
            </button>
            <a 
              href={`https://dl.dropboxusercontent.com/scl/fi/${path}?rlkey=${rlkey}&dl=1`}
              className="btn btn-secondary"
              style={{ minWidth: '200px', textDecoration: 'none' }}
              download
            >
              ⬇️ Baixar Clipe
            </a>
            <button className="btn btn-primary" onClick={onBack}>
              🎬 Quero criar um clipe também!
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}
