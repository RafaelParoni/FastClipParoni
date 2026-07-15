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
    <div className="upload-screen">
      <div className="logo-area">
        <h1>
          <img src="/favicon.ico" alt="Logo" className="site-icon" /> FastClip<span className="author-name">Paroni</span>
        </h1>
        <div className="social-links">
          <a href="https://www.instagram.com/rafael_paroni" target="_blank" rel="noopener noreferrer">Instagram</a>
          <a href="https://github.com/RafaelParoni" target="_blank" rel="noopener noreferrer">GitHub</a>
        </div>
        <p>Faça upload do seu vídeo e crie clips incríveis direto no navegador. Rápido, simples e sem servidor.</p>
      </div>

      <div
        className={`upload-zone ${dragOver ? 'drag-over' : ''}`}
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
  );
}
