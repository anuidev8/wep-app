import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Pause, Play, X, Download } from 'lucide-react';
import { Lesson } from '../types';
import { markLessonComplete, updateLessonProgress } from '../services/courseService';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Capacitor } from '@capacitor/core';

interface CourseAudioMiniPlayerProps {
  lesson: Lesson;
  courseId: string;
  sectionId: string;
  onClose: () => void;
  onComplete?: () => void;
  elevatedOffset?: boolean;
  isVisible?: boolean;
}

const formatTime = (seconds: number) => {
  if (!Number.isFinite(seconds) || seconds <= 0) return '00:00';
  const total = Math.floor(seconds);
  const mins = Math.floor(total / 60);
  const secs = total % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

export const CourseAudioMiniPlayer: React.FC<CourseAudioMiniPlayerProps> = ({
  lesson,
  courseId,
  sectionId,
  onClose,
  onComplete,
  elevatedOffset = false,
  isVisible = true,
}) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [isSeeking, setIsSeeking] = useState(false);
  const isSeekingRef = useRef(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const closeTimeoutRef = useRef<number | null>(null);
  const audioUrl = lesson.audioUrl || lesson.file || '';

  const lessonId = useMemo(() => lesson._id || lesson.id, [lesson._id, lesson.id]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !audioUrl) return;

    audio.src = audioUrl;
    audio.preload = 'metadata';
    audio.setAttribute('playsinline', 'true');
    audio.load();

    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    const handleLoadStart = () => setIsLoading(true);
    const handleCanPlay = () => setIsLoading(false);
    const handleLoadedMetadata = () => setDuration(audio.duration || 0);
    const handleTimeUpdate = () => {
      if (!isSeekingRef.current) {
        setCurrentTime(audio.currentTime || 0);
      }
    };
    const handleEnded = async () => {
      setIsPlaying(false);
      setCurrentTime(audio.duration || 0);
      try {
        await markLessonComplete(courseId, sectionId, lessonId);
      } catch (error) {
        console.warn('[CourseAudioMiniPlayer] Failed to mark lesson complete', error);
      }
      onComplete?.();
    };

    audio.addEventListener('play', handlePlay);
    audio.addEventListener('pause', handlePause);
    audio.addEventListener('loadstart', handleLoadStart);
    audio.addEventListener('canplay', handleCanPlay);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('ended', handleEnded);

    audio.play().catch(() => {
      setIsPlaying(false);
      setIsLoading(false);
    });

    return () => {
      if (closeTimeoutRef.current) {
        window.clearTimeout(closeTimeoutRef.current);
        closeTimeoutRef.current = null;
      }
      audio.pause();
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('pause', handlePause);
      audio.removeEventListener('loadstart', handleLoadStart);
      audio.removeEventListener('canplay', handleCanPlay);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('ended', handleEnded);
      audio.src = '';
    };
  }, [audioUrl, courseId, sectionId, lessonId, onComplete]);

  const handleTogglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) {
      audio.play().catch(() => setIsPlaying(false));
    } else {
      audio.pause();
    }
  };

  const handleSeekStart = () => {
    isSeekingRef.current = true;
    setIsSeeking(true);
  };

  const handleSeekChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const nextTime = Number(event.target.value);
    setCurrentTime(nextTime);
  };

  const handleSeekEnd = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const audio = audioRef.current;
    if (!audio) return;
    const nextTime = Number(event.target.value);
    audio.currentTime = nextTime;
    isSeekingRef.current = false;
    setIsSeeking(false);
    try {
      await updateLessonProgress(courseId, sectionId, lessonId, Math.floor(nextTime * 100));
    } catch (error) {
      console.warn('[CourseAudioMiniPlayer] Failed to update progress', error);
    }
  };

  const handleDownload = async () => {
    if (!audioUrl || isDownloading) return;

    try {
      if (Capacitor.getPlatform() === 'android') {
        const status = await Filesystem.checkPermissions();
        if (status.publicStorage !== 'granted') {
          const request = await Filesystem.requestPermissions();
          if (request.publicStorage !== 'granted') {
            alert('Storage permission is required to download audio files.');
            return;
          }
        }
      }

      setIsDownloading(true);
      const safeTitle = lesson.title.replace(/[^a-z0-9]/gi, '_').toLowerCase();
      const filename = `${safeTitle}.mp3`;
      const path = `Music/${filename}`;

      // Download via fetch and write to filesystem
      const response = await fetch(audioUrl);
      if (!response.ok) throw new Error('Network response was not ok');
      const blob = await response.blob();
      
      const base64Data = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onerror = reject;
        reader.onload = () => {
          if (typeof reader.result === 'string') {
            resolve(reader.result.split(',')[1]);
          } else {
            reject(new Error('Failed to convert blob to base64'));
          }
        };
        reader.readAsDataURL(blob);
      });

      await Filesystem.writeFile({
        path,
        data: base64Data,
        directory: Directory.Documents,
        recursive: true,
      });

      alert(`Downloaded successfully to Documents/Music/${filename}`);
    } catch (error) {
      console.error('Download error:', error);
      alert('Failed to download audio file.');
    } finally {
      setIsDownloading(false);
    }
  };

  const handleClose = async () => {
    if (isClosing) return;
    setIsClosing(true);
    const audio = audioRef.current;
    const fadeDurationMs = 600;
    const fadeSteps = 12;
    const stepMs = Math.floor(fadeDurationMs / fadeSteps);
    const startVolume = audio?.volume ?? 1;
    let step = 0;

    const fadeInterval = window.setInterval(() => {
      step += 1;
      const nextVolume = Math.max(0, startVolume * (1 - step / fadeSteps));
      if (audio) audio.volume = nextVolume;
      if (step >= fadeSteps) {
        window.clearInterval(fadeInterval);
      }
    }, stepMs);

    try {
      if (currentTime > 0) {
        await updateLessonProgress(courseId, sectionId, lessonId, Math.floor(currentTime * 100));
      }
    } catch (error) {
      console.warn('[CourseAudioMiniPlayer] Failed to update progress on close', error);
    }

    closeTimeoutRef.current = window.setTimeout(() => {
      if (audio) {
        audio.pause();
        audio.volume = startVolume;
      }
      onClose();
    }, fadeDurationMs);
  };

  const progressPercent = duration > 0 ? Math.min(100, (currentTime / duration) * 100) : 0;
  const shouldShow = isVisible && !isClosing;

  return (
    <motion.div
      className="fixed left-3 right-3 rounded-xl border border-white/10 bg-brand-dark/95 px-3 py-6 shadow-2xl backdrop-blur dark:border-white/10 dark:bg-brand-darkSurface/95"
      initial={{ y: 24, opacity: 0, scale: 0.98 }}
      animate={shouldShow ? { y: 0, opacity: 1, scale: 1 } : { y: 24, opacity: 0, scale: 0.98 }}
      transition={{ type: 'spring', stiffness: 260, damping: 22 }}
      style={{
        zIndex: 10001,
        bottom: elevatedOffset
          ? 'calc(env(safe-area-inset-bottom) + 9rem)'
          : 'calc(env(safe-area-inset-bottom) + 7rem)',
        pointerEvents: shouldShow ? 'auto' : 'none'
      }}
      aria-hidden={!shouldShow}
    >
      <audio ref={audioRef} />
      <div className="flex items-center gap-2">
        <button
          onClick={handleTogglePlay}
          className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-gold text-brand-dark shadow-md transition active:scale-95"
          aria-label={isPlaying ? 'Pause' : 'Play'}
          disabled={isLoading || isClosing}
        >
          {isPlaying ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5 fill-current" />}
        </button>
        <div className="flex-1">
          <div className="text-[12px] font-semibold text-white truncate">
            {lesson.title}
          </div>
          <div className="mt-1 flex items-center gap-2 text-[10px] text-white/80">
            <span className="tabular-nums min-w-[42px] text-white">{formatTime(currentTime)}</span>
            <input
              type="range"
              min={0}
              max={duration || 0}
              step={0.5}
              value={Math.min(currentTime, duration || 0)}
              onMouseDown={handleSeekStart}
              onTouchStart={handleSeekStart}
              onChange={handleSeekChange}
              onMouseUp={handleSeekEnd}
              onTouchEnd={handleSeekEnd}
              className="h-[3px] w-full cursor-pointer appearance-none rounded-full"
              style={{
                background: `linear-gradient(to right, #f5d08b ${progressPercent}%, rgba(255, 255, 255, 0.18) ${progressPercent}%)`,
              }}
              aria-label="Audio progress"
              disabled={isLoading || isClosing}
            />
            <span className="tabular-nums min-w-[42px] text-right text-white/80">{formatTime(duration)}</span>
          </div>
          {isLoading && (
            <div className="mt-0.5 text-[9px] font-medium text-white/60">
              Loading audio...
            </div>
          )}
        </div>
        <button
          onClick={handleDownload}
          className="flex h-7 w-7 items-center justify-center rounded-full bg-white/10 text-white transition active:scale-95 disabled:opacity-50"
          aria-label="Download audio"
          disabled={isDownloading || isClosing}
        >
          {isDownloading ? (
            <div className="h-3 w-3 animate-spin rounded-full border-2 border-white/20 border-t-white" />
          ) : (
            <Download className="h-3.5 w-3.5" />
          )}
        </button>
        <button
          onClick={handleClose}
          className="flex h-7 w-7 items-center justify-center rounded-full bg-white/10 text-white transition active:scale-95"
          aria-label="Close audio player"
          disabled={isClosing}
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </motion.div>
  );
};
