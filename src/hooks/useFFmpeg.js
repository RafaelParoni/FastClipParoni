import { useState, useRef, useCallback } from 'react';
import { FFmpeg } from '@ffmpeg/ffmpeg';
import watermarkImg from '../assets/WaterMark.png';

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

  const createClip = useCallback(async (videoFile, startTime, endTime, clipName, useWatermark = false) => {
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
      console.log(`Creating clip: ${startTime.toFixed(2)}s -> ${endTime.toFixed(2)}s (${duration.toFixed(2)}s). Watermark: ${useWatermark}`);

      let ffmpegArgs = [];

      if (useWatermark) {
        // Fetch and write the watermark image to FFmpeg filesystem
        const res = await fetch(watermarkImg);
        const buf = await res.arrayBuffer();
        await ffmpeg.writeFile('watermark.png', new Uint8Array(buf));
        
        setProcessingMessage(`Cortando vídeo...`);
        
        ffmpegArgs = [
          '-ss', String(startTime),
          '-i', inputName,
          '-i', 'watermark.png',
          '-t', String(duration),
          '-filter_complex', '[1:v]scale=-1:60[wm];[0:v][wm]overlay=W-w-20:H-h-20', // Scale to 60px height, bottom right
          '-c:v', 'libx264',
          '-preset', 'ultrafast',
          '-c:a', 'copy',
          '-avoid_negative_ts', 'make_zero',
          '-y',
          outputName
        ];
      } else {
        ffmpegArgs = [
          '-ss', String(startTime),
          '-i', inputName,
          '-t', String(duration),
          '-c', 'copy',
          '-avoid_negative_ts', 'make_zero',
          '-y',
          outputName
        ];
      }

      await ffmpeg.exec(ffmpegArgs);

      const data = await ffmpeg.readFile(outputName);
      console.log(`Clip created: ${data.length} bytes`);

      const blob = new Blob([data], { type: 'video/mp4' });

      // Cleanup
      try {
        await ffmpeg.deleteFile(outputName);
        if (useWatermark) await ffmpeg.deleteFile('watermark.png');
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
