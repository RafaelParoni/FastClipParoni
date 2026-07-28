import { useState, useRef } from 'react';

export default function UploadScreen({ onVideoSelected }) {
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef(null);

  const ACCEPTED_TYPES = ['video/mp4', 'video/webm', 'video/quicktime', 'video/x-msvideo', 'video/x-matroska'];
  const ACCEPTED_EXTENSIONS = '.mp4,.webm,.mov,.avi,.mkv';

  function handleDragOver(e) {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(true);
  }

  function handleDragLeave(e) {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
  }

  function handleDrop(e) {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      processFile(files[0]);
    }
  }

  function handleFileChange(e) {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
  }

  function processFile(file) {
    if (ACCEPTED_TYPES.includes(file.type) || file.name.match(/\.(mp4|webm|mov|avi|mkv)$/i)) {
      onVideoSelected(file);
    } else {
      alert('Formato de vídeo não suportado. Use: MP4, WebM, MOV, AVI ou MKV.');
    }
  }

  return (
    <div className="editor-layout">
      <div className="editor-header">
        <span className="logo">
          <img src="/favicon.ico" alt="Logo" className="site-icon" /> FastClip<span className="author-name">Paroni</span>
        </span>
        <nav className="header-nav">
          <a href="/">🏠 Início</a>
          <a href="/clips">🌍 Clips</a>
          <a href="/">✂️ Criar clip</a>
        </nav>
        <div className="header-actions">
          <div className="social-links-header">
            <a href="https://www.instagram.com/rafael_paroni" target="_blank" rel="noopener noreferrer" title="Instagram">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line></svg>
            </a>
            <a href="https://github.com/RafaelParoni" target="_blank" rel="noopener noreferrer" title="GitHub">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"></path></svg>
            </a>
          </div>
        </div>
      </div>
      <div className="upload-screen">
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <p style={{ color: '#a0a0a0', fontSize: '1.2rem', maxWidth: '600px', margin: '0 auto' }}>Faça upload do seu vídeo e crie clips incríveis direto no navegador. Rápido, simples e sem servidor.</p>
        </div>

      <div className="mobile-only" style={{ textAlign: 'center', padding: '2rem', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '12px' }}>
        <h3>Computador Necessário 🖥️</h3>
        <p style={{ marginTop: '8px' }}>A criação e edição de clipes consome muito processamento e só está disponível na versão para computador.</p>
      </div>

      <div
        className={`upload-zone desktop-only ${dragOver ? 'drag-over' : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        <span className="upload-icon">🎬</span>
        <h3>Arraste seu vídeo aqui</h3>
        <p>ou clique para selecionar um arquivo</p>
        <span className="formats">MP4 · WebM · MOV · AVI · MKV</span>

        <input
          ref={fileInputRef}
          type="file"
          accept={ACCEPTED_EXTENSIONS}
          onChange={handleFileChange}
        />
      </div>
    </div>
    </div>
  );
}
