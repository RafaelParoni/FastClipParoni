import { useState, useEffect } from 'react';

export default function useAudioWaveform(audioFile, color = 'rgba(253, 224, 71, 0.8)') {
  const [waveformUrl, setWaveformUrl] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    if (!audioFile) return;

    let isCancelled = false;
    let audioContext = null;

    const generateWaveform = async () => {
      setIsGenerating(true);
      try {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const arrayBuffer = await audioFile.arrayBuffer();
        if (isCancelled) return;
        
        const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
        if (isCancelled) return;

        const rawData = audioBuffer.getChannelData(0); // Use first channel
        const samples = 1000; // Number of bars to draw
        const blockSize = Math.floor(rawData.length / samples);
        const filteredData = [];
        
        for (let i = 0; i < samples; i++) {
          let blockStart = blockSize * i;
          let sum = 0;
          for (let j = 0; j < blockSize; j++) {
            sum += Math.abs(rawData[blockStart + j]);
          }
          filteredData.push(sum / blockSize);
        }

        // Normalize
        const max = Math.max(...filteredData);
        const multiplier = max === 0 ? 0 : Math.pow(max, -1);
        const normalizedData = filteredData.map(n => n * multiplier);

        // Draw to canvas
        const canvas = document.createElement('canvas');
        canvas.width = samples;
        canvas.height = 100;
        const ctx = canvas.getContext('2d');
        
        ctx.fillStyle = color;
        const centerY = canvas.height / 2;

        normalizedData.forEach((item, index) => {
          const height = item * canvas.height * 0.9; // 90% height max
          // Desenha uma linha vertical pra cada amostra (o 'grave')
          ctx.fillRect(index, centerY - height / 2, 1, height);
        });

        if (!isCancelled) {
          setWaveformUrl(canvas.toDataURL('image/png'));
        }
      } catch (err) {
        console.error("Error generating waveform", err);
      } finally {
        if (!isCancelled) setIsGenerating(false);
        if (audioContext) audioContext.close().catch(()=>{});
      }
    };

    generateWaveform();

    return () => {
      isCancelled = true;
      if (audioContext) audioContext.close().catch(()=>{});
    };
  }, [audioFile, color]);

  return { waveformUrl, isGenerating };
}
