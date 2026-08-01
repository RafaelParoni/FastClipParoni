import React from 'react';

export default function PrivacyPolicy({ onBack }) {
  return (
    <div className="editor-layout" style={{ overflowY: 'auto', display: 'block' }}>
      <div className="editor-header">
        <span className="logo" onClick={onBack} style={{ cursor: 'pointer' }}>
          <img src="/favicon.ico" alt="Logo" className="site-icon" /> FastClip<span className="author-name">Paroni</span>
        </span>
        <nav className="header-nav">
          <a href="/" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>
            Início
          </a>
        </nav>
      </div>

      <div style={{ maxWidth: '800px', margin: '0 auto', padding: '3rem 2rem', color: '#e0e0e0', lineHeight: '1.6' }}>
        <h1 style={{ color: '#fff', fontSize: '2.5rem', marginBottom: '2rem', textAlign: 'center' }}>Política de Privacidade</h1>
        
        <p style={{ marginBottom: '1.5rem', fontSize: '1.1rem' }}>
          A sua privacidade é levada muito a sério no <strong>FastClip</strong>. Abaixo, explicamos como lidamos com os seus dados, vídeos e contas.
        </p>

        <h2 style={{ color: '#4cb5ff', marginTop: '2rem', marginBottom: '1rem' }}>1. Onde meus vídeos são salvos?</h2>
        <p style={{ marginBottom: '1rem' }}>
          Todo o processamento e recorte de vídeos é feito <strong>localmente no seu navegador</strong>. O arquivo de vídeo original que você arrasta para a tela nunca é enviado para nenhum servidor nosso.
        </p>
        <p style={{ marginBottom: '1.5rem' }}>
          Quando você opta por publicar um clipe (criar um link), o vídeo finalizado é salvo <strong>diretamente na sua conta pessoal do Dropbox</strong>, dentro da pasta <code>Aplicativos/FastClipParoni</code>. Nós não temos acesso para ler ou deletar os seus outros arquivos pessoais do Dropbox.
        </p>

        <h2 style={{ color: '#4cb5ff', marginTop: '2rem', marginBottom: '1rem' }}>2. Dados salvos no Firebase</h2>
        <p style={{ marginBottom: '1.5rem' }}>
          Para que a "Galeria de Clipes" funcione e para que as pessoas possam assistir ao seu vídeo através de um link rápido, salvamos algumas informações públicas em nosso banco de dados no Google Firebase:
        </p>
        <ul style={{ marginBottom: '1.5rem', paddingLeft: '1.5rem' }}>
          <li style={{ marginBottom: '0.5rem' }}>O título que você deu ao clipe.</li>
          <li style={{ marginBottom: '0.5rem' }}>A URL oficial pública do arquivo no seu Dropbox.</li>
          <li style={{ marginBottom: '0.5rem' }}>A imagem de miniatura (thumbnail) e o jogo selecionado.</li>
          <li style={{ marginBottom: '0.5rem' }}>Uma cópia anônima do seu Endereço IP apenas para permitir que você gerencie ou exclua seus próprios clipes depois.</li>
        </ul>

        <h2 style={{ color: '#4cb5ff', marginTop: '2rem', marginBottom: '1rem' }}>3. Controle e Exclusão</h2>
        <p style={{ marginBottom: '1.5rem' }}>
          Se você acessar a página do seu próprio clipe a partir do mesmo dispositivo/rede em que o criou, você verá opções para <strong>Torná-lo Não Listado</strong> (escondendo da galeria pública) ou <strong>Excluí-lo</strong> completamente do nosso sistema de links.
        </p>
        <p style={{ marginBottom: '1.5rem', padding: '1rem', background: 'rgba(239, 68, 68, 0.1)', borderLeft: '4px solid #ef4444', borderRadius: '4px' }}>
          <strong>Aviso Importante:</strong> Se você excluir um clipe pelo FastClip, ele apenas removerá o link do nosso feed público. O arquivo de vídeo físico em formato <code>.mp4</code> <strong>continuará existindo no seu Dropbox</strong> até que você vá lá e o apague manualmente.
        </p>

        <div style={{ marginTop: '4rem', textAlign: 'center' }}>
          <button className="btn btn-primary" onClick={onBack} style={{ padding: '0.8rem 2rem' }}>Voltar para o Início</button>
        </div>
      </div>
    </div>
  );
}
