import { useState, useEffect } from 'react';

export default function useVideoFrames(videoFile, frameCount = 10) {
  const [frames, setFrames] = useState([]);
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    if (!videoFile) return;

    let isCancelled = false;
    const video = document.createElement('video');
    video.src = URL.createObjectURL(videoFile);
    video.muted = true;
    video.playsInline = true;

    const generateFrames = async () => {
      setIsGenerating(true);
      setFrames([]);
      
      await new Promise(resolve => {
        video.onloadeddata = resolve;
      });

      if (isCancelled) return;

      const duration = video.duration;
      if (!duration || !isFinite(duration)) {
        setIsGenerating(false);
        return;
      }

      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      // Set a small resolution for thumbnails to keep memory low
      const targetHeight = 50; 
      const aspect = video.videoWidth / video.videoHeight;
      const targetWidth = Math.floor(targetHeight * aspect);
      canvas.width = targetWidth;
      canvas.height = targetHeight;

      const newFrames = [];
      const interval = duration / frameCount;

      for (let i = 0; i < frameCount; i++) {
        if (isCancelled) break;
        // Skip exactly 0.0s to avoid black frames
        const time = Math.min((i * interval) + 0.1, duration);
        video.currentTime = time;
        await new Promise(resolve => {
          video.onseeked = resolve;
        });
        
        ctx.drawImage(video, 0, 0, targetWidth, targetHeight);
        newFrames.push(canvas.toDataURL('image/jpeg', 0.6));
        
        // Update progressively
        setFrames([...newFrames]);
      }

      setIsGenerating(false);
      URL.revokeObjectURL(video.src);
    };

    generateFrames();

    return () => {
      isCancelled = true;
      if (video.src) URL.revokeObjectURL(video.src);
    };
  }, [videoFile, frameCount]);

  return { frames, isGenerating };
}
