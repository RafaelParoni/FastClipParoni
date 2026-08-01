import React, { useState, useEffect } from 'react';
import { useLanguage } from '../contexts/LanguageContext';

export default function SettingsScreen({ onBack }) {
  const { language, setLanguage, t } = useLanguage();
  const [theme, setTheme] = useState(localStorage.getItem('app_theme') || 'dark');
  const [storage, setStorage] = useState(localStorage.getItem('app_storage') || 'dropbox');

  useEffect(() => {
    localStorage.setItem('app_theme', theme);
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);



  useEffect(() => {
    localStorage.setItem('app_storage', storage);
  }, [storage]);

  return (
    <div className="editor-layout" style={{ display: 'block', overflowY: 'auto' }}>
      <div className="editor-header">
        <span className="logo" onClick={onBack} style={{ cursor: 'pointer' }}>
          <img src="/favicon.ico" alt="Logo" className="site-icon" /> FastClip<span className="author-name">Paroni</span>
        </span>
        <nav className="header-nav">
          <a href="/" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>
            {t('nav.home')}
          </a>
          <a href="/clips" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1 4-10z"></path></svg>
            {t('nav.clips')}
          </a>
        </nav>
      </div>

      <div className="feed-container" style={{ maxWidth: '800px', margin: '0 auto', padding: '2rem' }}>
        <h1 style={{ fontSize: '2.5rem', marginBottom: '2.5rem', color: 'var(--text-primary)' }}>{t('settings.title')}</h1>

        <div style={{ backgroundColor: 'var(--bg-card)', padding: '2rem', borderRadius: '12px', border: '1px solid var(--border-glass)', marginBottom: '1.5rem', boxShadow: 'var(--shadow-sm)' }}>
          <h2 style={{ fontSize: '1.3rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-primary)' }}>
            {t('settings.theme')}
          </h2>
          <select 
            value={theme} 
            onChange={e => setTheme(e.target.value)}
            style={{ width: '100%', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border-glass)', background: 'var(--bg-tertiary)', color: 'var(--text-primary)', fontSize: '1rem' }}
          >
            <option value="dark">{t('settings.theme.dark')}</option>
            <option value="light">{t('settings.theme.light')}</option>
          </select>
        </div>

        <div style={{ backgroundColor: 'var(--bg-card)', padding: '2rem', borderRadius: '12px', border: '1px solid var(--border-glass)', marginBottom: '1.5rem', boxShadow: 'var(--shadow-sm)' }}>
          <h2 style={{ fontSize: '1.3rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-primary)' }}>
            {t('settings.language')}
          </h2>
          <select 
            value={language} 
            onChange={e => setLanguage(e.target.value)}
            style={{ width: '100%', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border-glass)', background: 'var(--bg-tertiary)', color: 'var(--text-primary)', fontSize: '1rem' }}
          >
            <option value="pt">{t('settings.language.pt')}</option>
            <option value="en">{t('settings.language.en')}</option>
            <option value="es">{t('settings.language.es')}</option>
          </select>
        </div>

        <div style={{ backgroundColor: 'var(--bg-card)', padding: '2rem', borderRadius: '12px', border: '1px solid var(--border-glass)', marginBottom: '1.5rem', boxShadow: 'var(--shadow-sm)' }}>
          <h2 style={{ fontSize: '1.3rem', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-primary)' }}>
            {t('settings.storage')}
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', marginBottom: '1.5rem' }}>
            {t('settings.storage.desc')}
          </p>
          <select 
            value={storage} 
            onChange={e => setStorage(e.target.value)}
            style={{ width: '100%', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border-glass)', background: 'var(--bg-tertiary)', color: 'var(--text-primary)', fontSize: '1rem' }}
          >
            <option value="dropbox">{t('settings.storage.dropbox')}</option>
            <option value="google-drive">{t('settings.storage.gdrive')}</option>
          </select>
        </div>
      </div>
    </div>
  );
}
