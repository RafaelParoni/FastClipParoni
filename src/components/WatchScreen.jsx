import { useState, useRef, useEffect } from 'react';
import { db } from '../services/firebase';
import { doc, getDoc, updateDoc, deleteDoc, collection, query, where, getDocs, limit, orderBy } from 'firebase/firestore';

export default function WatchScreen({ clipId, onBack }) {
  const [copied, setCopied] = useState(false);
  const [clipData, setClipData] = useState(null);
  const [suggestedClips, setSuggestedClips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [visitorIp, setVisitorIp] = useState(null);
  
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [hasLiked, setHasLiked] = useState(false);
  
  const videoRef = useRef(null);

  useEffect(() => {
    fetch('https://api.ipify.org?format=json')
      .then(res => res.json())
      .then(data => setVisitorIp(data.ip))
      .catch(e => console.warn("Could not fetch visitor IP"));
      
    if (localStorage.getItem(`liked_${clipId}`)) {
      setHasLiked(true);
    }
  }, [clipId]);

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
          const data = docSnap.data();
          
          // Conta a visualização
          if (!localStorage.getItem(`viewed_${clipId}`)) {
            const newViews = (data.views || 0) + 1;
            updateDoc(docRef, { views: newViews }).catch(e => console.warn('Erro ao atualizar visualização', e));
            data.views = newViews;
            localStorage.setItem(`viewed_${clipId}`, 'true');
          }
          
          setClipData(data);
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

  useEffect(() => {
    async function fetchSuggested() {
      if (!clipData) return;
      try {
        let q;
        if (clipData.gameId) {
          q = query(collection(db, 'clips'), where('privacy', '==', true), where('gameId', '==', clipData.gameId), limit(10));
        } else {
          q = query(collection(db, 'clips'), where('privacy', '==', true), limit(10));
        }
        
        const snap = await getDocs(q);
        let clips = snap.docs.map(d => ({ id: d.id, ...d.data() })).filter(c => c.id !== clipId);
        
        // Se achou poucos daquele jogo, busca alguns recentes gerais para preencher
        if (clips.length < 3) {
           const generalQ = query(collection(db, 'clips'), where('privacy', '==', true), limit(10));
           const generalSnap = await getDocs(generalQ);
           const generalClips = generalSnap.docs.map(d => ({ id: d.id, ...d.data() })).filter(c => c.id !== clipId && !clips.find(ex => ex.id === c.id));
           clips = [...clips, ...generalClips].slice(0, 10);
        }
        
        setSuggestedClips(clips);
      } catch (err) {
        console.error("Erro ao carregar sugeridos", err);
      }
    }
    fetchSuggested();
  }, [clipData, clipId]);

  const handleCopyLink = () => {
    const shareLink = `${window.location.origin}/clips/watch/${clipId}`;
    navigator.clipboard.writeText(shareLink).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }).catch(err => {
      console.error('Falha ao copiar:', err);
      alert('Não foi possível copiar o link.');
    });
  };

  const handleLike = async () => {
    if (!clipData) return;
    try {
      let newLikes;
      if (hasLiked) {
        newLikes = Math.max(0, (clipData.likes || 0) - 1);
        await updateDoc(doc(db, 'clips', clipId), {
          likes: newLikes
        });
        setClipData(prev => ({ ...prev, likes: newLikes }));
        setHasLiked(false);
        localStorage.removeItem(`liked_${clipId}`);
      } else {
        newLikes = (clipData.likes || 0) + 1;
        await updateDoc(doc(db, 'clips', clipId), {
          likes: newLikes
        });
        setClipData(prev => ({ ...prev, likes: newLikes }));
        setHasLiked(true);
        localStorage.setItem(`liked_${clipId}`, 'true');
      }
    } catch (e) {
      console.error(e);
      alert('Erro ao registrar curtida.');
    }
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
        <a href="/clips" className="btn btn-primary" style={{ textDecoration: 'none' }}>Ir para a Galeria</a>
      </div>
    );
  }

  const downloadUrl = clipData.url.replace('raw=1', 'dl=1');

  return (
    <div className="editor-layout">
      {/* NAVBAR */}
      <div className="editor-header">
        <span className="logo" onClick={() => window.location.href = '/clips'} style={{ cursor: 'pointer' }}>
          <img src="/favicon.ico" alt="Logo" className="site-icon" /> FastClip<span className="author-name">Paroni</span>
        </span>
        <nav className="header-nav">
          <a href="/" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>
            Início
          </a>
          <a href="/clips" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1 4-10z"></path></svg>
            Clips
          </a>
          <a href="/" className="hide-on-mobile" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="6" cy="6" r="3"></circle><circle cx="6" cy="18" r="3"></circle><line x1="20" y1="4" x2="8.12" y2="15.88"></line><line x1="14.47" y1="14.48" x2="20" y2="20"></line><line x1="8.12" y1="8.12" x2="12" y2="12"></line></svg>
            Criar clip
          </a>
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

      <div className="editor-body" style={{ padding: '2rem', paddingBottom: '6rem', overflowY: 'auto', display: 'flex', justifyContent: 'center' }}>
      
      {/* Container Principal Estilo YouTube */}
      <div style={{ display: 'flex', gap: '2rem', maxWidth: '1400px', width: '100%', flexWrap: 'wrap', alignItems: 'flex-start' }}>
        
        {/* Coluna Esquerda: Vídeo Principal */}
        <div className="watch-main-column" style={{ flex: '1 1 800px', minWidth: '300px' }}>
          
          <div style={{ backgroundColor: 'var(--bg-glass)', backdropFilter: 'blur(12px)', borderRadius: '16px', overflow: 'hidden', boxShadow: 'var(--shadow-lg)', border: '1px solid var(--border-glass)' }}>
            
            {/* Player Colado nas Bordas Superiores */}
            <video
              ref={videoRef}
              src={clipData.url}
              controls
              autoPlay
              style={{ width: '100%', maxHeight: '75vh', display: 'block', backgroundColor: '#000' }}
            />
            
            {/* Informações Abaixo do Vídeo */}
            <div style={{ padding: '1.5rem' }}>
              <h1 style={{ color: '#fff', fontSize: '1.6rem', fontWeight: 'bold', margin: '0 0 1rem 0' }}>
                {clipData.title}
              </h1>
              
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
                
                {/* Info (Visualizações + Jogo) */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
                  
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-secondary)', fontSize: '0.95rem', fontWeight: '500' }}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                    {clipData.views || 0} visualizações
                  </div>

                  {/* Jogo */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '8px 16px', backgroundColor: 'var(--bg-glass)', borderRadius: '12px', border: '1px solid var(--border-glass)' }}>
                    {clipData.gameBoxArt ? (
                      <img src={clipData.gameBoxArt} alt={clipData.gameName} style={{ width: '28px', height: '38px', borderRadius: '4px', objectFit: 'cover' }} />
                    ) : (
                      <div style={{ width: '28px', height: '38px', borderRadius: '4px', backgroundColor: '#333', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem' }}>🎮</div>
                    )}
                    <div>
                      <span style={{ color: '#888', fontSize: '0.8rem', display: 'block', lineHeight: 1 }}>Jogando</span>
                      <strong style={{ color: '#fff', fontSize: '1rem' }}>{clipData.gameName || 'Desconhecido'}</strong>
                    </div>
                  </div>
                </div>

                {/* Ações (Like, Share, Download) */}
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  <button 
                    onClick={handleLike}
                    style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '0.6rem 1rem', borderRadius: '24px', border: '1px solid var(--border-glass)', background: hasLiked ? 'var(--bg-glass-hover)' : 'var(--bg-glass)', color: hasLiked ? 'var(--accent-primary)' : 'var(--text-primary)', cursor: 'pointer', fontWeight: '500', transition: 'all 0.2s' }}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill={hasLiked ? "var(--accent-primary)" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"></path></svg>
                    {clipData.likes || 0}
                  </button>

                  <button 
                    onClick={handleCopyLink}
                    style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '0.6rem 1rem', borderRadius: '24px', border: '1px solid var(--border-glass)', background: 'var(--bg-glass)', color: 'var(--text-primary)', cursor: 'pointer', fontWeight: '500', transition: 'all 0.2s' }}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"></path><polyline points="16 6 12 2 8 6"></polyline><line x1="12" y1="2" x2="12" y2="15"></line></svg>
                    {copied ? 'Copiado!' : 'Compartilhar'}
                  </button>

                  <a 
                    href={downloadUrl}
                    download
                    style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '0.6rem 1rem', borderRadius: '24px', border: 'none', background: 'var(--accent-primary)', color: '#fff', cursor: 'pointer', fontWeight: '500', textDecoration: 'none', transition: 'all 0.2s' }}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                    Baixar
                  </a>
                </div>
              </div>
            </div>

            {/* Painel do Criador */}
            {visitorIp === clipData.ip && (
              <div style={{ borderTop: '1px solid var(--border-subtle)', padding: '1.5rem', backgroundColor: 'var(--bg-glass)' }}>
                <h3 style={{ color: '#fff', fontSize: '1rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20a8 8 0 1 0 0-16 8 8 0 0 0 0 16Z"></path><path d="M12 14a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z"></path><path d="M12 2v2"></path><path d="M12 22v-2"></path><path d="m17 20.66-1-1.73"></path><path d="M11 10.27 7 3.34"></path><path d="m20.66 17-1.73-1"></path><path d="m3.34 7 1.73 1"></path><path d="M14 12h8"></path><path d="M2 12h2"></path><path d="m20.66 7-1.73 1"></path><path d="m3.34 17 1.73-1"></path><path d="m17 3.34-1 1.73"></path><path d="m11 13.73-4 6.93"></path></svg>
                  Opções do Criador
                </h3>
                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                  <button 
                    onClick={handleTogglePrivacy}
                    style={{ flex: 1, minWidth: '200px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '0.8rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', background: 'transparent', color: '#fff', cursor: 'pointer', fontWeight: '500' }}
                  >
                    {clipData.privacy ? (
                      <><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg> Deixar Privado (Não Listado)</>
                    ) : (
                      <><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path></svg> Deixar Público (Galeria)</>
                    )}
                  </button>
                  <button 
                    onClick={() => setShowDeleteModal(true)}
                    style={{ flex: 1, minWidth: '200px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '0.8rem', borderRadius: '8px', border: '1px solid rgba(239, 68, 68, 0.3)', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', cursor: 'pointer', fontWeight: '500' }}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                    Excluir Vídeo
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Coluna Direita: Sugeridos (Lateral Direita) */}
        <div className="watch-sidebar" style={{ flex: '1 1 350px', maxWidth: '400px', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
            <h3 style={{ color: 'var(--text-primary)', fontSize: '1.2rem', margin: 0 }}>Vídeos Sugeridos</h3>
            <a href="/clips" style={{ color: 'var(--accent-primary)', fontSize: '0.9rem', textDecoration: 'none' }}>Ver Galeria</a>
          </div>
          
          {suggestedClips.length === 0 ? (
            <div style={{ padding: '2rem', textAlign: 'center', backgroundColor: 'var(--bg-card)', borderRadius: '12px', border: '1px solid var(--border-glass)' }}>
              <p style={{ color: 'var(--text-secondary)', margin: 0 }}>Nenhum vídeo sugerido no momento.</p>
            </div>
          ) : (
            suggestedClips.map(sc => (
              <a 
                key={sc.id} 
                href={`/clips/watch/${sc.id}`}
                style={{ display: 'flex', gap: '12px', textDecoration: 'none', backgroundColor: 'var(--bg-card)', borderRadius: '8px', overflow: 'hidden', border: '1px solid var(--border-glass)', transition: 'background-color 0.2s' }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-card-hover)'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-card)'}
              >
                {/* Thumb Sugerido */}
                <div style={{ width: '120px', height: '80px', flexShrink: 0, position: 'relative', overflow: 'hidden', backgroundColor: 'var(--bg-tertiary)' }}>
                  {sc.thumbnail ? (
                    <img src={sc.thumbnail} alt={sc.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : sc.gameBoxArt ? (
                    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                      <img src={sc.gameBoxArt} alt={sc.gameName} style={{ width: '100%', minHeight: '100%', objectFit: 'cover', filter: 'blur(10px)', position: 'absolute' }} />
                      <img src={sc.gameBoxArt} alt={sc.gameName} style={{ height: '100%', position: 'relative', zIndex: 1, objectFit: 'contain' }} />
                    </div>
                  ) : (
                    <div style={{ width: '100%', height: '100%', background: 'var(--accent-gradient)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
                    </div>
                  )}
                </div>
                {/* Info Sugerido */}
                <div style={{ padding: '8px 8px 8px 0', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                  <h4 style={{ color: '#fff', fontSize: '0.95rem', margin: '0 0 6px 0', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                    {sc.title}
                  </h4>
                  <span style={{ color: '#888', fontSize: '0.8rem' }}>{sc.gameName || 'Desconhecido'}</span>
                  {sc.likes > 0 && <span style={{ color: '#888', fontSize: '0.75rem', marginTop: '2px' }}>{sc.likes} curtidas</span>}
                </div>
              </a>
            ))
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
    </div>
  );
}
