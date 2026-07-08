import React from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { VideoPlayer } from '../components/player/VideoPlayer';
import { CourseVideoPlayer } from '../components/CourseVideoPlayer';

export const VideoPlayerPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  
  const videoUrl = searchParams.get('videoUrl');
  const title = searchParams.get('title') || 'Video';
  const courseId = searchParams.get('courseId');
  const sectionId = searchParams.get('sectionId');
  const lessonId = searchParams.get('lessonId') || searchParams.get('lessonsId');
  const fromYoutube = searchParams.get('fromYoutube') === 'true';
  const startTime = Number(searchParams.get('startTime') || 0);
  const duration = Number(searchParams.get('duration') || 0);

  const handleComplete = () => {
    // Navigate back to courses or course detail
    if (courseId) {
      navigate('/courses');
    } else {
      navigate('/courses');
    }
  };

  if (!videoUrl) {
    return (
      <div className="h-screen w-full bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Video Not Found</h2>
          <p className="text-white/70 mb-6">No video URL provided.</p>
          <button
            onClick={() => navigate('/courses')}
            className="px-6 py-3 bg-brand-gold text-black rounded-lg font-semibold hover:bg-brand-gold/90 transition-colors"
          >
            Back to Courses
          </button>
        </div>
      </div>
    );
  }

  if (courseId && sectionId && lessonId) {
    return (
      <CourseVideoPlayer
        videoUrl={decodeURIComponent(videoUrl)}
        isYoutube={fromYoutube}
        title={decodeURIComponent(title)}
        courseId={courseId}
        sectionId={sectionId}
        lessonId={lessonId}
        startTime={Number.isNaN(startTime) ? 0 : startTime}
        duration={Number.isNaN(duration) ? undefined : duration}
        onBack={handleComplete}
        onComplete={handleComplete}
      />
    );
  }

  return (
    <VideoPlayer
      videoUrl={decodeURIComponent(videoUrl)}
      title={decodeURIComponent(title)}
      onComplete={handleComplete}
    />
  );
};
