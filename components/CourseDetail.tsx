import React, { useState } from 'react';
import { ChevronRight, Play, CheckCircle2, Clock, Star, ArrowLeft } from 'lucide-react';
import { CourseDetail, Section, Lesson, Subsection } from '../types';

interface CourseDetailProps {
  course: CourseDetail;
  sections: Section[];
  onLessonClick: (lesson: Lesson, sectionId: string) => void;
  onBack: () => void;
  onRefresh: () => void;
  hasActiveAudio: boolean;
}

export const CourseDetailComponent: React.FC<CourseDetailProps> = ({
  course,
  sections,
  onLessonClick,
  onBack,
  onRefresh,
  hasActiveAudio,
}) => {
  const [expandedSection, setExpandedSection] = useState<string | null>(null);
  const [expandedSubsection, setExpandedSubsection] = useState<string | null>(null);
  const [selectedTab, setSelectedTab] = useState<'Playlist' | 'Author'>('Playlist');
  const [currentSectionId, setCurrentSectionId] = useState<string>('');

  const toggleSection = (sectionTitle: string, id: string) => {
    setCurrentSectionId(id);
    setExpandedSection(expandedSection === sectionTitle ? null : sectionTitle);
  };

  const toggleSubsection = (subsectionTitle: string) => {
    setExpandedSubsection(expandedSubsection === subsectionTitle ? null : subsectionTitle);
  };

  const handleLessonClick = (lesson: Lesson) => {
    onLessonClick(lesson, currentSectionId);
  };

  const renderLesson = (lesson: Lesson, index: number) => {
    const isCompleted = lesson.completed;

    return (
      <div
        key={lesson._id || lesson.id}
        onClick={() => handleLessonClick(lesson)}
        className={`
          flex items-center gap-3 p-4 rounded-xl cursor-pointer
          transition-all duration-200 hover:scale-[1.02]
          ${isCompleted
            ? 'bg-green-50 dark:bg-green-900/20 border border-green-100 dark:border-green-800'
            : 'bg-brand-light dark:bg-brand-darkSurface hover:bg-brand-light/80 dark:hover:bg-brand-darkSurface/80'
          }
        `}
      >
        {/* Icon */}
        <div className={`
          w-10 h-10 rounded-full flex items-center justify-center
          ${isCompleted ? 'bg-green-100 dark:bg-green-800' : 'bg-white dark:bg-brand-darkBase'}
        `}>
          {isCompleted ? (
            <CheckCircle2 className="w-6 h-6 text-green-600 dark:text-green-400" />
          ) : (
            <Play className="w-5 h-5 text-brand-dark dark:text-white fill-brand-dark dark:fill-white" />
          )}
        </div>

        {/* Info */}
        <div className="flex-1 text-left">
          <p className={`font-bold text-left ${isCompleted ? 'text-green-900 dark:text-green-200' : 'text-brand-dark dark:text-white'}`}>
            {lesson.title}
          </p>
          {lesson.duration && (
            <div className="flex items-center gap-1 mt-1">
              <Clock className={`w-3 h-3 ${isCompleted ? 'text-green-400' : 'text-brand-dark/40 dark:text-brand-darkTextMuted'}`} />
              <span className={`text-xs ${isCompleted ? 'text-green-500 dark:text-green-400' : 'text-brand-dark/40 dark:text-brand-darkTextMuted'}`}>
                {Math.floor(lesson.duration / 60)} min
              </span>
            </div>
          )}
        </div>

        <ChevronRight className={`w-5 h-5 ${isCompleted ? 'text-green-300 dark:text-green-600' : 'text-brand-dark/30 dark:text-brand-darkTextMuted'}`} />
      </div>
    );
  };

  const renderSubsection = (subsection: Subsection) => {
    const isExpanded = expandedSubsection === subsection.title;

    return (
      <div key={subsection.title}>
        {subsection.title && (
          <button
            onClick={() => toggleSubsection(subsection.title)}
            className="flex items-center justify-between w-full py-3 px-2 border-b border-brand-dark/5 dark:border-white/5"
          >
            <span className="text-xs font-bold text-left text-brand-medium dark:text-brand-darkTextMuted uppercase tracking-wide">
              {subsection.title}
            </span>
            <ChevronRight
              className={`w-4 h-4 text-brand-medium dark:text-brand-darkTextMuted transition-transform ${isExpanded ? 'rotate-90' : ''}`}
            />
          </button>
        )}
        {(isExpanded || !subsection.title) && (
          <div className="space-y-3 mt-2">
            {subsection.lessons?.map((lesson, idx) => renderLesson(lesson, idx))}
          </div>
        )}
      </div>
    );
  };

  const renderSection = (section: Section) => {
    const isExpanded = expandedSection === section.section;

    return (
      <div key={section._id} className="mb-4">
        {/* Section Header */}
        <button
          onClick={() => toggleSection(section.section, section._id)}
          className={`
            w-full flex items-center justify-between p-5 bg-white dark:bg-brand-darkSurface rounded-3xl
            border border-gray-100 dark:border-brand-darkBorder shadow-md hover:shadow-lg transition-shadow
            ${isExpanded ? 'rounded-b-none border-b-0' : ''}
          `}
        >
          <div className="flex items-center gap-3">
            <div className={`w-1 h-4 rounded ${section.isCompleted ? 'bg-brand-gold' : 'bg-brand-dark/10 dark:bg-white/10'}`} />
            <span className="text-sm font-bold text-left text-brand-dark dark:text-white tracking-wide uppercase">
              {section.section}
            </span>
          </div>
          <ChevronRight
            className={`w-5 h-5 text-brand-dark dark:text-white transition-transform ${isExpanded ? 'rotate-90' : ''}`}
          />
        </button>

        {/* Section Content */}
        {isExpanded && (
          <div className="bg-white dark:bg-brand-darkSurface rounded-b-3xl border border-gray-100 dark:border-brand-darkBorder border-t-0 px-4 pb-5">
            {section.subsections?.map(renderSubsection)}
            {section.lessons && !section.subsections && (
              <div className="space-y-3 mt-2">
                {section.lessons.map((lesson, idx) => renderLesson(lesson, idx))}
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-brand-cream dark:bg-brand-darkBase transition-colors duration-300">
      {/* Hero Section */}
      <div className="relative h-[45vh]">
        <img
          src={course.image}
          alt={course.title}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-brand-dark/80 via-brand-dark/40 to-transparent" />

        {/* Back Button - Optimized for Mobile Guidelines */}
        <button
          onClick={onBack}
          className="absolute top-14 left-4 z-20 w-12 h-12 rounded-full bg-white/95 text-brand-dark flex items-center justify-center shadow-xl border border-white/50 hover:bg-white transition-all active:scale-95"
          style={{
            marginTop: 'env(safe-area-inset-top)',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.8)'
          }}
          aria-label="Back to courses"
        >
          <ArrowLeft className="w-6 h-6" strokeWidth={2.5} />
        </button>

        {/* Hero Content */}
        <div className="absolute bottom-8 left-6 right-6">
          <div className="flex items-center gap-2 bg-white/20 backdrop-blur-sm px-3 py-1.5 rounded-full w-fit mb-3">
            <Star className="w-3 h-3 text-brand-gold fill-brand-gold" />
            <span className="text-[10px] font-bold text-white tracking-widest">ACADEMY COURSE</span>
          </div>
          <h1 className="text-3xl font-bold text-white font-serif">{course.title}</h1>
        </div>
      </div>

      {/* Tab Bar */}
      <div className="sticky top-0 bg-brand-cream dark:bg-brand-darkBase py-4 px-6 z-10 transition-colors duration-300">
        <div className="flex bg-brand-dark/5 dark:bg-white/5 rounded-full p-1">
          <button
            onClick={() => setSelectedTab('Playlist')}
            className={`flex-1 py-3 rounded-full text-sm font-bold transition-all ${
              selectedTab === 'Playlist'
                ? 'bg-brand-dark dark:bg-brand-gold text-white dark:text-brand-dark shadow-md'
                : 'text-brand-medium dark:text-brand-darkTextMuted'
            }`}
          >
            Curriculum
          </button>
          <button
            onClick={() => setSelectedTab('Author')}
            className={`flex-1 py-3 rounded-full text-sm font-bold transition-all ${
              selectedTab === 'Author'
                ? 'bg-brand-dark dark:bg-brand-gold text-white dark:text-brand-dark shadow-md'
                : 'text-brand-medium dark:text-brand-darkTextMuted'
            }`}
          >
            Instructor
          </button>
        </div>
      </div>

      {/* Content */}
      <div className={`px-6 ${hasActiveAudio ? 'pb-44' : 'pb-32'}`}>
        {selectedTab === 'Playlist' && sections?.map(renderSection)}

        {selectedTab === 'Author' && (
          <div className="bg-white dark:bg-brand-darkSurface rounded-3xl p-8 text-center shadow-xl border border-gray-100 dark:border-brand-darkBorder transition-colors duration-300">
            <img
              src={course.author.profileImage}
              alt={course.author.name}
              className="w-30 h-30 rounded-full mx-auto mb-5 object-cover"
            />
            <h3 className="text-2xl font-bold text-brand-dark dark:text-white font-serif">
              {course.author.name}
            </h3>
            <div className="w-10 h-1 bg-brand-gold rounded mx-auto my-4" />
            <p className="text-brand-medium dark:text-brand-darkTextMuted leading-relaxed">
              {course.author.bio}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
