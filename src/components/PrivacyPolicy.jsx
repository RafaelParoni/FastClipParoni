import React from 'react';
import { useLanguage } from '../contexts/LanguageContext';

export default function PrivacyPolicy({ onBack }) {
  const { t } = useLanguage();
  return (
    <div className="editor-layout" style={{ overflowY: 'auto', display: 'block' }}>
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
          <a href="/" className="hide-on-mobile" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="6" cy="6" r="3"></circle><circle cx="6" cy="18" r="3"></circle><line x1="20" y1="4" x2="8.12" y2="15.88"></line><line x1="14.47" y1="14.48" x2="20" y2="20"></line><line x1="8.12" y1="8.12" x2="12" y2="12"></line></svg>
            {t('nav.createClip')}
          </a>
        </nav>
      </div>

      <div style={{ maxWidth: '800px', margin: '0 auto', padding: '3rem 2rem', color: '#e0e0e0', lineHeight: '1.6' }}>
        <h1 style={{ color: '#fff', fontSize: '2.5rem', marginBottom: '2rem', textAlign: 'center' }}>{t('privacy.title')}</h1>
        
        <p style={{ marginBottom: '1.5rem', fontSize: '1.1rem' }} dangerouslySetInnerHTML={{ __html: t('privacy.intro') }} />

        <h2 style={{ color: '#4cb5ff', marginTop: '2rem', marginBottom: '1rem' }}>{t('privacy.section1Title')}</h2>
        <p style={{ marginBottom: '1rem' }} dangerouslySetInnerHTML={{ __html: t('privacy.section1Para1') }} />
        <p style={{ marginBottom: '1.5rem' }} dangerouslySetInnerHTML={{ __html: t('privacy.section1Para2') }} />

        <h2 style={{ color: '#4cb5ff', marginTop: '2rem', marginBottom: '1rem' }}>{t('privacy.section2Title')}</h2>
        <p style={{ marginBottom: '1.5rem' }}>
          {t('privacy.section2Para1')}
        </p>
        <ul style={{ marginBottom: '1.5rem', paddingLeft: '1.5rem' }}>
          <li style={{ marginBottom: '0.5rem' }}>{t('privacy.section2List1')}</li>
          <li style={{ marginBottom: '0.5rem' }}>{t('privacy.section2List2')}</li>
          <li style={{ marginBottom: '0.5rem' }}>{t('privacy.section2List3')}</li>
          <li style={{ marginBottom: '0.5rem' }}>{t('privacy.section2List4')}</li>
        </ul>

        <h2 style={{ color: '#4cb5ff', marginTop: '2rem', marginBottom: '1rem' }}>{t('privacy.section3Title')}</h2>
        <p style={{ marginBottom: '1.5rem' }} dangerouslySetInnerHTML={{ __html: t('privacy.section3Para1') }} />
        <p style={{ marginBottom: '1.5rem', padding: '1rem', background: 'rgba(239, 68, 68, 0.1)', borderLeft: '4px solid #ef4444', borderRadius: '4px' }} dangerouslySetInnerHTML={{ __html: t('privacy.section3Warning') }} />

        <div style={{ marginTop: '4rem', textAlign: 'center' }}>
          <button className="btn btn-primary" onClick={onBack} style={{ padding: '0.8rem 2rem' }}>{t('privacy.backHome')}</button>
        </div>
      </div>
    </div>
  );
}
