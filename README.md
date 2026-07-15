# ⚡ FastClip Paroni

![FastClip UI Preview](./public/favicon.ico)

**FastClip Paroni** é uma aplicação web moderna e extremamente rápida para clipping de vídeos. Com ela, você pode fazer upload de vídeos longos (de minutos até horas), selecionar trechos em uma timeline interativa e criar pequenos cortes (clips) — **tudo rodando 100% no seu próprio navegador**.

Nenhum arquivo de vídeo é enviado para servidores externos, o que garante total privacidade e velocidade na edição graças ao poder do **WebAssembly (FFmpeg)**.

## ✨ Funcionalidades

- 🚀 **100% Client-Side:** Processamento de vídeo feito inteiramente no navegador do usuário sem depender de um backend.
- 💾 **Suporte a Vídeos Gigantes:** Graças ao uso do FileSystem virtual (`WORKERFS`), arquivos massivos (ex: 3GB+) são montados e lidos sob demanda, não estourando a memória RAM do navegador.
- ✂️ **Timeline Interativa:** Selecione facilmente o ponto de início e fim do seu clip visualmente.
- 📦 **Download em Lote:** Baixe seus clips um a um ou exporte todos de uma vez empacotados num arquivo `.zip`.
- 🎨 **Design Moderno:** UI baseada em glassmorphism com esquema de cores otimizado para produtividade (Dark/Navy Blue e Cyan).

## 🛠️ Tecnologias Utilizadas

- **[React.js](https://react.dev/)** + **[Vite](https://vitejs.dev/)** - Para a construção de uma interface ágil e componentizada.
- **[FFmpeg.wasm](https://ffmpegwasm.netlify.app/)** - O core de edição audiovisual compilado para a web.
- **[JSZip](https://stuk.github.io/jszip/)** - Para empacotamento de múltiplos clips.
- **CSS3 Puro (Vanilla)** - Estilização customizada focada em alta performance visual sem a necessidade de frameworks CSS adicionais.

## 🚀 Como rodar localmente

Siga o passo a passo abaixo para rodar o FastClip na sua própria máquina:

1. **Clone este repositório:**
   ```bash
   git clone https://github.com/RafaelParoni/FastClipParoni.git
   ```

2. **Acesse a pasta do projeto:**
   ```bash
   cd FastClipParoni
   ```

3. **Instale as dependências:**
   ```bash
   npm install
   ```

4. **Inicie o servidor de desenvolvimento:**
   ```bash
   npm run dev
   ```

5. **Abra no seu navegador:**
   O aplicativo estará rodando em `http://localhost:5173`.

## 👨‍💻 Autor

Criado e mantido por **Rafael Paroni**.

- 📸 [Instagram: @rafael_paroni](https://www.instagram.com/rafael_paroni)
- 🐙 [GitHub: RafaelParoni](https://github.com/RafaelParoni)
