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

  const createClip = useCallback(async (videoFile, startTime, endTime, clipName, useWatermark = false, audioTracks = [], videoVolume = 1) => {
    if (!ffmpegRef.current) {
      throw new Error('FFmpeg não carregado');
    }

    const ffmpeg = ffmpegRef.current;
    setProcessing(true);
    setProgress(0);
    setProcessingMessage(`Criando clip "${clipName}"...`);

    try {
      console.log(`Mounting input files via WORKERFS`);
      
      try {
        await ffmpeg.createDir('/work');
      } catch (e) {
        // Ignorar
      }

      const mountFiles = [videoFile];
      audioTracks.forEach(track => mountFiles.push(track.file));
      
      await ffmpeg.mount('WORKERFS', { files: mountFiles }, '/work');
      
      const inputName = `/work/${videoFile.name}`;
      const outputName = clipName + '.mp4';
      const duration = endTime - startTime;

      let ffmpegArgs = [];
      let filters = [];
      let nextInputIndex = 1;
      let watermarkInputIndex = -1;

      ffmpegArgs.push('-ss', String(startTime), '-i', inputName);
      
      if (useWatermark) {
        const res = await fetch(watermarkImg);
        const buf = await res.arrayBuffer();
        await ffmpeg.writeFile('watermark.png', new Uint8Array(buf));
        ffmpegArgs.push('-i', 'watermark.png');
        watermarkInputIndex = nextInputIndex++;
        setProcessingMessage(`Processando vídeo com marca d'água...`);
      } else {
        setProcessingMessage(`Processando vídeo...`);
      }
      
      const validAudioInputs = [];
      
      audioTracks.forEach(track => {
          const relativeStart = track.offset - startTime;
          let actualAudioTrimStart = track.trimStart;
          let delayMs = 0;
          let audioDurationToRead = 0;

          if (relativeStart < duration) {
              if (relativeStart > 0) {
                  delayMs = Math.round(relativeStart * 1000);
                  actualAudioTrimStart = track.trimStart;
              } else {
                  actualAudioTrimStart = track.trimStart + Math.abs(relativeStart);
              }
              audioDurationToRead = track.trimEnd - actualAudioTrimStart;
              if (audioDurationToRead > 0) {
                  ffmpegArgs.push('-ss', String(actualAudioTrimStart), '-t', String(audioDurationToRead), '-i', `/work/${track.file.name}`);
                  validAudioInputs.push({
                      index: nextInputIndex++,
                      track,
                      delayMs
                  });
              }
          }
      });
      
      const needsVideoFilter = useWatermark;
      const needsAudioFilter = validAudioInputs.length > 0 || videoVolume !== 1;
      
      if (needsVideoFilter || needsAudioFilter) {
         let outV = '0:v';
         let outA = '0:a';
         
         if (needsVideoFilter) {
            filters.push(`[${watermarkInputIndex}:v]scale=-1:60[wm];[0:v][wm]overlay=W-w-20:H-h-20[vout]`);
            outV = '[vout]';
         }
         
         if (needsAudioFilter) {
            let mixInputs = [];
            
            if (videoVolume > 0) {
               filters.push(`[0:a]volume=${videoVolume}[orig_a]`);
               mixInputs.push('[orig_a]');
            }
            
            validAudioInputs.forEach((input, i) => {
               let filterChain = `[${input.index}:a]volume=${input.track.volume}`;
               if (input.delayMs > 0) {
                   filterChain += `,adelay=${input.delayMs}|all=1`;
               }
               const outLabel = `[a_new_${i}]`;
               filters.push(`${filterChain}${outLabel}`);
               mixInputs.push(outLabel);
            });
            
            if (mixInputs.length > 1) {
                filters.push(`${mixInputs.join('')}amix=inputs=${mixInputs.length}:duration=longest[aout]`);
                outA = '[aout]';
            } else if (mixInputs.length === 1) {
                outA = mixInputs[0];
            } else {
                outA = null; // Everything muted
            }
         }
         
         if (filters.length > 0) {
            ffmpegArgs.push('-filter_complex', filters.join(';'));
         }
         
         ffmpegArgs.push('-map', outV);
         if (outA !== null) {
            ffmpegArgs.push('-map', outA);
         }
         
         ffmpegArgs.push('-c:v', needsVideoFilter ? 'libx264' : 'copy');
         if (needsVideoFilter) ffmpegArgs.push('-preset', 'ultrafast');
         
         if (outA !== null) {
            ffmpegArgs.push('-c:a', 'aac');
         }
      } else {
         ffmpegArgs.push('-c', 'copy');
      }
      
      ffmpegArgs.push('-t', String(duration), '-avoid_negative_ts', 'make_zero', '-y', outputName);

      await ffmpeg.exec(ffmpegArgs);

      const data = await ffmpeg.readFile(outputName);
      console.log(`Clip created: ${data.length} bytes`);

      const blob = new Blob([data], { type: 'video/mp4' });

      // Cleanup
      try {
        await ffmpeg.deleteFile(outputName);
        if (useWatermark) await ffmpeg.deleteFile('watermark.png');
        await ffmpeg.unmount('/work');
      } catch (e) { }

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
