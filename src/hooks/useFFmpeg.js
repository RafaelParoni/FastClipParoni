import { useState, useRef, useCallback } from 'react';
import { FFmpeg } from '@ffmpeg/ffmpeg';

export function useFFmpeg() {
  const ffmpegRef = useRef(null);
  const loadPromiseRef = useRef(null);
  const [loaded, setLoaded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [processing, setProcessing] = useState(false);
  const [processingMessage, setProcessingMessage] = useState('');

  const load = useCallback(async () => {
    if (loaded) return;
    if (loadPromiseRef.current) return loadPromiseRef.current;

    const promise = (async () => {
      setLoading(true);
      setProcessingMessage('Carregando FFmpeg...');

      try {
        const ffmpeg = new FFmpeg();
        ffmpegRef.current = ffmpeg;

        ffmpeg.on('log', ({ message }) => {
          console.log('[FFmpeg]', message);
        });

        ffmpeg.on('progress', ({ progress: p }) => {
          setProgress(Math.max(0, Math.min(100, Math.round(p * 100))));
        });

        // Use direct absolute URLs to the ESM files in the public directory.
        // The worker is spawned as a module worker, so it will use dynamic import()
        // on these URLs, which requires them to be valid ES modules.
        const baseURL = window.location.origin;
        await ffmpeg.load({
          coreURL: `${baseURL}/ffmpeg/ffmpeg-core.js`,
          wasmURL: `${baseURL}/ffmpeg/ffmpeg-core.wasm`,
        });

        setLoaded(true);
        console.log('FFmpeg loaded successfully!');
      } catch (error) {
        console.error('Erro ao carregar FFmpeg:', error);
        loadPromiseRef.current = null;
        throw error;
      } finally {
        setLoading(false);
        setProcessingMessage('');
      }
    })();

    loadPromiseRef.current = promise;
    return promise;
  }, [loaded]);

  const createClip = useCallback(async (videoFile, startTime, endTime, clipName) => {
    if (!ffmpegRef.current) {
      throw new Error('FFmpeg não carregado');
    }

    const ffmpeg = ffmpegRef.current;
    setProcessing(true);
    setProgress(0);
    setProcessingMessage(`Criando clip "${clipName}"...`);

    try {
      console.log(`Mounting input file via WORKERFS: ${videoFile.name} (${(videoFile.size / 1024 / 1024).toFixed(1)}MB)`);
      
      // Criar diretório de trabalho se não existir
      try {
        await ffmpeg.createDir('/work');
      } catch (e) {
        // Ignorar se já existir
      }

      // Montar o arquivo original sem carregar para a memória RAM!
      // Isso permite que o FFmpeg leia o arquivo de 3.4GB+ sob demanda.
      await ffmpeg.mount('WORKERFS', { files: [videoFile] }, '/work');
      
      // O arquivo estará disponível com o nome original dele dentro de /work
      const inputName = `/work/${videoFile.name}`;
      const outputName = clipName + '.mp4';

      const duration = endTime - startTime;
      console.log(`Creating clip: ${startTime.toFixed(2)}s -> ${endTime.toFixed(2)}s (${duration.toFixed(2)}s)`);

      await ffmpeg.exec([
        '-ss', String(startTime),
        '-i', inputName,
        '-t', String(duration),
        '-c', 'copy',
        '-avoid_negative_ts', 'make_zero',
        '-y',
        outputName,
      ]);

      const data = await ffmpeg.readFile(outputName);
      console.log(`Clip created: ${data.length} bytes`);

      const blob = new Blob([data], { type: 'video/mp4' });

      // Cleanup
      try {
        await ffmpeg.deleteFile(outputName);
        await ffmpeg.unmount('/work');
      } catch (e) {
        // Ignore cleanup errors
      }

      return blob;
    } catch (error) {
      console.error('Erro ao criar clip:', error);
      throw error;
    } finally {
      setProcessing(false);
      setProgress(0);
      setProcessingMessage('');
    }
  }, []);

  return {
    loaded,
    loading,
    progress,
    processing,
    processingMessage,
    load,
    createClip,
  };
}

function getExtension(filename) {
  const dot = filename.lastIndexOf('.');
  return dot >= 0 ? filename.substring(dot) : '.mp4';
}
