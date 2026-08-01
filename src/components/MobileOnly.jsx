import React from 'react';
import { useLanguage } from '../contexts/LanguageContext';

export default function MobileOnly() {
  const { t } = useLanguage();
  return (
    <div className="editor-layout" style={{ justifyContent: 'center', alignItems: 'center', padding: '2rem', textAlign: 'center' }}>
      <div style={{ maxWidth: '400px', backgroundColor: 'var(--bg-card)', padding: '2rem', borderRadius: '16px', border: '1px solid var(--border-glass)', boxShadow: 'var(--shadow-lg)' }}>
        <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="var(--warning)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: '1rem', color: 'var(--warning)' }}><rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect><line x1="8" y1="21" x2="16" y2="21"></line><line x1="12" y1="17" x2="12" y2="21"></line></svg>
        <h1 style={{ color: 'var(--text-primary)', fontSize: '1.5rem', marginBottom: '1rem' }}>{t('mobile.restrictedAccess')}</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', lineHeight: '1.5', marginBottom: '1.5rem' }}>
          {t('mobile.description1')}
        </p>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', lineHeight: '1.5', marginBottom: '2rem' }}>
          {t('mobile.description2')}
        </p>
        <a href="/clips" className="btn btn-primary" style={{ width: '100%', display: 'inline-block', textDecoration: 'none' }}>
          {t('mobile.viewGallery')}
        </a>
      </div>
    </div>
  );
}
