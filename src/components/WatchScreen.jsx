import { useState, useRef, useEffect } from 'react';
import { db } from '../services/firebase';
import { doc, getDoc, updateDoc, deleteDoc } from 'firebase/firestore';

export default function WatchScreen({ clipId, onBack }) {
  const [copied, setCopied] = useState(false);
  const [clipData, setClipData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [visitorIp, setVisitorIp] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  
  const videoRef = useRef(null);

  useEffect(() => {
    fetch('https://api.ipify.org?format=json')
      .then(res => res.json())
      .then(data => setVisitorIp(data.ip))
      .catch(e => console.warn("Could not fetch visitor IP"));
  }, []);

  useEffect(() => {
    async function fetchClip() {
      if (!clipId) {
        setError('ID do clipe não fornecido.');
        setLoading(false);
        return;
      }
      try {
        const docRef = doc(db, 'clips', clipId);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
          setClipData(docSnap.data());
        } else {
          setError('Clipe não encontrado ou foi removido.');
        }
      } catch (err) {
        console.error(err);
        setError('Erro ao carregar o clipe.');
      } finally {
        setLoading(false);
      }
    }
    fetchClip();
  }, [clipId]);

  const shareLink = `${window.location.origin}/clips/watch/${clipId}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareLink).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }).catch(err => {
      console.error('Falha ao copiar:', err);
      alert('Não foi possível copiar o link.');
    });
  };

  const handleTogglePrivacy = async () => {
    if (!clipId || !clipData) return;
    try {
      const newPrivacy = !clipData.privacy;
      await updateDoc(doc(db, 'clips', clipId), {
        privacy: newPrivacy
      });
      setClipData(prev => ({ ...prev, privacy: newPrivacy }));
    } catch (err) {
      console.error(err);
      alert('Erro ao atualizar privacidade.');
    }
  };

  const confirmDeleteClip = async () => {
    if (!clipId) return;
    setIsDeleting(true);
    try {
      await deleteDoc(doc(db, 'clips', clipId));
      window.location.href = '/clips';
    } catch (err) {
      console.error(err);
      alert('Erro ao excluir clipe.');
      setIsDeleting(false);
      setShowDeleteModal(false);
    }
  };

  if (loading) {
    return (
      <div className="editor-layout" style={{ justifyContent: 'center', alignItems: 'center' }}>
        <div className="loading-spinner" />
        <p style={{ marginTop: '1rem', color: '#fff' }}>Carregando clipe...</p>
      </div>
    );
  }

  if (error || !clipData) {
    return (
      <div className="editor-layout" style={{ justifyContent: 'center', alignItems: 'center' }}>
        <h2 style={{ color: '#ef4444', marginBottom: '1rem' }}>Oops!</h2>
        <p style={{ color: '#a0a0a0', marginBottom: '2rem' }}>{error}</p>
        <button className="btn btn-primary" onClick={onBack}>Voltar para o Início</button>
      </div>
    );
  }

  // To trigger download, dropbox uses dl=1
  const downloadUrl = clipData.url.replace('raw=1', 'dl=1');

  return (
    <div className="editor-layout" style={{ justifyContent: 'center' }}>
      <div className="editor-header">
        <span className="logo" onClick={onBack} style={{ cursor: 'pointer' }}>
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

      <div className="editor-body" style={{ alignItems: 'center', overflowY: 'auto', padding: '2rem 1rem' }}>
        <div className="editor-main" style={{ maxWidth: '900px', width: '100%', margin: 'auto' }}>
          
          <h2 style={{ textAlign: 'center', color: '#fff', marginBottom: '1rem', fontSize: '1.8rem', fontWeight: 'bold' }}>{clipData.title}</h2>
          
          <div className="video-container" style={{ borderRadius: '12px', overflow: 'hidden', boxShadow: '0 8px 24px rgba(0,0,0,0.5)', height: 'auto', minHeight: 'auto', background: 'transparent' }}>
            <video
              ref={videoRef}
              src={clipData.url}
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
              href={downloadUrl}
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

          {visitorIp === clipData.ip && (
            <div style={{ marginTop: '3rem', padding: '1.5rem', background: 'rgba(255,255,255,0.05)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)' }}>
              <h3 style={{ color: '#fff', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                ⚙️ Configurações do Criador
              </h3>
              <p style={{ color: '#a0a0a0', fontSize: '0.9rem', marginBottom: '1.5rem' }}>Você está vendo isso porque criou este clipe.</p>
              
              <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                <button 
                  className="btn btn-secondary" 
                  onClick={handleTogglePrivacy}
                  style={{ flex: 1, minWidth: '200px' }}
                >
                  {clipData.privacy ? '🔒 Tornar Não Listado (Apenas Link)' : '🌍 Tornar Público (Aparecer no Feed)'}
                </button>
                <button 
                  className="btn" 
                  onClick={() => setShowDeleteModal(true)}
                  style={{ flex: 1, minWidth: '200px', background: 'rgba(239, 68, 68, 0.2)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.4)' }}
                >
                  🗑️ Excluir Clipe
                </button>
              </div>
            </div>
          )}

        </div>
      </div>

      {showDeleteModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '450px', textAlign: 'center', padding: '2rem' }}>
            <h2 style={{ color: '#ef4444', marginBottom: '1rem', fontSize: '1.5rem' }}>⚠️ Confirmar Exclusão</h2>
            <p style={{ color: '#fff', marginBottom: '1rem' }}>
              Você tem certeza que deseja deletar este clipe?
            </p>
            <p style={{ color: '#a0a0a0', fontSize: '0.9rem', marginBottom: '2rem' }}>
              Ele será removido do Feed e os links pararão de funcionar imediatamente.
              <br /><br />
              <strong style={{ color: '#f59e0b' }}>Aviso:</strong> O arquivo de vídeo físico <strong>não será apagado</strong> da sua conta pessoal do Dropbox.
            </p>
            <div style={{ display: 'flex', gap: '16px' }}>
              <button 
                className="btn btn-secondary" 
                style={{ flex: 1 }} 
                onClick={() => setShowDeleteModal(false)}
                disabled={isDeleting}
              >
                Cancelar
              </button>
              <button 
                className="btn btn-primary" 
                style={{ flex: 1, background: '#ef4444' }} 
                onClick={confirmDeleteClip}
                disabled={isDeleting}
              >
                {isDeleting ? 'Excluindo...' : 'Sim, Excluir'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
