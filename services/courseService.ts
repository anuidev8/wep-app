// services/courseService.ts

import { apiClient } from './authService';
import { getStoredAuth } from './authService';
import axios from 'axios';
import { CourseDetail, Section, Lesson, ResumeLearningData, ProgressStats } from '../types';

export interface Chapter {
  id: string;
  title: string;
  duration: string;
  videoUrl?: string;
}

export interface Course {
  _id?: string;
  id: string;
  title: string;
  sanskritTitle?: string;
  description: string;
  image: string;
  thumbnail?: string;
  type?: string;
  category?: string;
  days?: string;
  time: string;
  duration?: string;
  lessonsCount: number;
  instructor?: string;
  author?: {
    name: string;
    profileImage?: string;
    bio?: string;
    _id?: string;
  };
  hasAccess?: boolean;
  progress: number;
  isComingSoon?: boolean;
  accessLevel?: 'FREE' | 'PREMIUM';
  group?: 'CORE' | 'YOGA';
  chapters?: Chapter[];
  lastLessonTitle?: string;
}

// All data comes from API - no mockup data

export class CourseError extends Error {
  constructor(
    message: string,
    public code: string,
    public status?: number
  ) {
    super(message);
    this.name = 'CourseError';
  }
}

export const DEFAULT_INSTRUCTOR_NAME = "Abhi Duggal, your breathwork coach.";
export const DEFAULT_INSTRUCTOR_BIO = "Abhi Duggal, a renowned holistic health expert and certified yoga and meditation teacher, is the founder of popular YouTube channels, Meditate with Abhi and The School of Breath. With over 25 years of experience, Abhi blends ancient yogic wisdom with modern neuroscience to offer transformative practices in yoga, pranayama breathing, meditation, and sleep mastery, reaching a wide audience with his trusted and insightful teachings.";

const ENDPOINTS = {
  LIST: '/courses/user',
  SECTIONS: '/courses/course',
  RESUME: '/courses/resume-learning',
  PROGRESS: '/courses',
  MY_PROGRESS: '/courses/my-progress',
};

/**
 * Process API course data
 */
function processCourseData(apiCourse: any): Course {
  console.log('[CourseService] Processing course:', apiCourse);
  
  const processed: Course = {
    ...apiCourse,
    // Use API data directly
    title: apiCourse.title || '',
    description: apiCourse.description || '',
    chapters: apiCourse.chapters || [],
    progress: apiCourse.progress !== undefined ? apiCourse.progress : 0,
    hasAccess: apiCourse.hasAccess !== undefined ? apiCourse.hasAccess : false,
    image: apiCourse.image || apiCourse.thumbnail || '',
    thumbnail: apiCourse.thumbnail || apiCourse.image || '',
    time: apiCourse.time || apiCourse.duration || '',
    id: apiCourse.id || apiCourse._id || '',
    _id: apiCourse._id || apiCourse.id || '',
    accessLevel: apiCourse.hasAccess ? 'PREMIUM' : 'FREE',
    group: apiCourse.category === 'YOGA' ? 'YOGA' : 'CORE',
    instructor: apiCourse.author?.name || 'Abhi Duggal',
    author: apiCourse.author ? {
      ...apiCourse.author,
      name: (apiCourse.author.name && apiCourse.author.name.trim()) || DEFAULT_INSTRUCTOR_NAME,
      bio: (apiCourse.author.bio && apiCourse.author.bio.trim()) || DEFAULT_INSTRUCTOR_BIO
    } : {
      name: DEFAULT_INSTRUCTOR_NAME,
      profileImage: apiCourse.author?.profileImage,
      bio: DEFAULT_INSTRUCTOR_BIO,
    },
  };
  
  console.log('[CourseService] Processed course:', processed.id, processed.title, 'Progress:', processed.progress, 'Chapters:', processed.chapters?.length || 0);
  return processed;
}

/**
 * Get stored auth data (helper)
 */
async function getAuthData() {
  const authData = await getStoredAuth();
  if (!authData) {
    throw new CourseError('Not authenticated. Please login again.', 'UNAUTHORIZED', 401);
  }
  return authData;
}

/**
 * Fetch course sections and lessons (with video URLs) from API
 */
export async function getCourseSections(courseId: string, email?: string): Promise<{ sections: Section[] }> {
  try {
    console.log('[CourseService] Fetching sections for course:', courseId);
    
    // Get auth data if email not provided
    let userEmail = email;
    if (!userEmail) {
      const authData = await getAuthData();
      userEmail = authData.email;
    }
    
    // Use the SECTIONS endpoint with courseId and email
    const response = await apiClient.get(
      `${ENDPOINTS.SECTIONS}/${courseId}/sections?email=${encodeURIComponent(userEmail!)}`
    );
    console.log('[CourseService] Sections response:', response.data);
    
    // Handle different response structures
    if (response.data?.sections) {
      return { sections: response.data.sections };
    } else if (response.data?.data?.sections) {
      return { sections: response.data.data.sections };
    } else if (Array.isArray(response.data)) {
      return { sections: response.data };
    } else if (response.data?.data && Array.isArray(response.data.data)) {
      return { sections: response.data.data };
    }
    
    return { sections: [] };
  } catch (error: any) {
    console.error('[CourseService] Error fetching sections:', error);
    if (axios.isAxiosError(error)) {
      if (error.response?.status === 401) {
        throw new CourseError('Session expired. Please login again.', 'UNAUTHORIZED', 401);
      } else if (error.response?.status === 404) {
        throw new CourseError('Course sections not found.', 'NOT_FOUND', 404);
      } else if (error.response?.status === 403) {
        throw new CourseError('You do not have access to this course.', 'NO_ACCESS', 403);
      } else if (error.code === 'ERR_NETWORK' || !error.response) {
        throw new CourseError('Network error. Please check your connection.', 'NETWORK');
      }
    }
    throw new CourseError(
      error?.response?.data?.message || error?.message || 'Failed to fetch course sections',
      'UNKNOWN',
      error?.response?.status
    );
  }
}

/**
 * Fetch and process chapters/lessons with video URLs from API
 */
export async function fetchChaptersFromAPI(courseId: string): Promise<Chapter[]> {
  try {
    console.log('[CourseService] Fetching chapters from API for course:', courseId);
    const sections = await getCourseSections(courseId);
    const chapters: Chapter[] = [];
    
    // Flatten all lessons from all sections
    if (sections?.sections && Array.isArray(sections.sections)) {
      sections.sections.forEach((section: any) => {
        if (section.lessons && Array.isArray(section.lessons)) {
          section.lessons.forEach((lesson: any) => {
            const videoUrl = lesson.videoUrl || 
                           lesson.video || 
                           lesson.videoFile || 
                           lesson.url ||
                           lesson.mediaUrl;
            
            chapters.push({
              id: lesson._id || lesson.id || '',
              title: lesson.title || '',
              duration: lesson.duration || lesson.time || '',
              videoUrl: videoUrl || undefined,
            });
          });
        }
      });
    }
    
    console.log('[CourseService] Fetched', chapters.length, 'chapters from API');
    const chaptersWithVideos = chapters.filter(c => c.videoUrl).length;
    console.log('[CourseService] Chapters with video URLs:', chaptersWithVideos, 'out of', chapters.length);
    
    return chapters;
  } catch (error) {
    console.error('[CourseService] Error fetching chapters from API:', error);
    return [];
  }
}

export async function getCourses(email?: string): Promise<Course[]> {
  try {
    // Get email from auth if not provided
    let userEmail = email;
    if (!userEmail) {
      const authData = await getAuthData();
      userEmail = authData.email;
    }
    
    console.log('[CourseService] Fetching courses for email:', userEmail);
    const response = await apiClient.get(
      `${ENDPOINTS.LIST}?email=${encodeURIComponent(userEmail!)}`
    );
    console.log('[CourseService] API Response:', response.data);
    
    // Extract courses from response.data.courses (as per your structure)
    const apiCourses = response.data.courses || [];
    
    console.log('[CourseService] Extracted courses:', apiCourses.length);
    
    if (apiCourses.length === 0) {
      console.warn('[CourseService] No courses returned from API');
    }
    
    // Process each API course (chapters will be fetched lazily when needed)
    const processedCourses = apiCourses.map((apiCourse: any) => {
      const processed = processCourseData(apiCourse);
      // Initialize chapters as empty - they'll be fetched when course is expanded
      processed.chapters = [];
      console.log('[CourseService] Processed course:', processed.id, processed.title);
      return processed;
    });
    
    console.log('[CourseService] Returning', processedCourses.length, 'processed courses');
    return processedCourses;
  } catch (error: any) {
    console.error('[CourseService] Error fetching courses:', error);
    if (axios.isAxiosError(error)) {
      if (error.response?.status === 401) {
        throw new CourseError('Session expired. Please login again.', 'UNAUTHORIZED', 401);
      } else if (error.response?.status === 404) {
        throw new CourseError('Courses not found.', 'NOT_FOUND', 404);
      } else if (error.response?.status === 403) {
        throw new CourseError('You do not have access to courses.', 'NO_ACCESS', 403);
      } else if (error.code === 'ERR_NETWORK' || !error.response) {
        throw new CourseError('Network error. Please check your connection.', 'NETWORK');
      }
    }
    throw new CourseError(
      error?.response?.data?.message || error?.message || 'Failed to fetch courses',
      'UNKNOWN',
      error?.response?.status
    );
  }
}

/**
 * Update lesson watch progress
 */
export async function updateLessonProgress(
  courseId: string,
  sectionId: string,
  lessonId: string,
  watchTimeInSeconds: number, // Already multiplied by 100
  token?: string
): Promise<any> {
  try {
    let authToken = token;
    if (!authToken) {
      const authData = await getAuthData();
      authToken = authData.token;
    }
    
    const response = await apiClient.patch(
      `${ENDPOINTS.PROGRESS}/${courseId}/sections/${sectionId}/lessons/${lessonId}/progress`,
      { watchTimeInSeconds },
      { headers: { ssid: authToken } }
    );
    return response.data;
  } catch (error: any) {
    console.error('[CourseService] Error updating lesson progress:', error);
    throw new CourseError(
      error?.response?.data?.message || error?.message || 'Failed to update lesson progress',
      'UNKNOWN',
      error?.response?.status
    );
  }
}

/**
 * Mark lesson as complete
 */
export async function markLessonComplete(
  courseId: string,
  sectionId: string,
  lessonId: string,
  token?: string
): Promise<any> {
  try {
    let authToken = token;
    if (!authToken) {
      const authData = await getAuthData();
      authToken = authData.token;
    }
    
    const response = await apiClient.post(
      `${ENDPOINTS.PROGRESS}/${courseId}/sections/${sectionId}/lessons/${lessonId}/complete`,
      {},
      { headers: { ssid: authToken } }
    );
    return response.data;
  } catch (error: any) {
    console.error('[CourseService] Error marking lesson complete:', error);
    throw new CourseError(
      error?.response?.data?.message || error?.message || 'Failed to mark lesson complete',
      'UNKNOWN',
      error?.response?.status
    );
  }
}

/**
 * Update lesson duration (for YouTube videos)
 */
export async function updateLessonDuration(
  courseId: string,
  sectionId: string,
  lessonId: string,
  durationInSeconds: number,
  token?: string
): Promise<any> {
  try {
    let authToken = token;
    if (!authToken) {
      const authData = await getAuthData();
      authToken = authData.token;
    }
    
    const response = await apiClient.patch(
      `${ENDPOINTS.PROGRESS}/${courseId}/sections/${sectionId}/lessons/${lessonId}/duration`,
      { durationInSeconds },
      { headers: { ssid: authToken } }
    );
    return response.data;
  } catch (error: any) {
    console.error('[CourseService] Error updating lesson duration:', error);
    throw new CourseError(
      error?.response?.data?.message || error?.message || 'Failed to update lesson duration',
      'UNKNOWN',
      error?.response?.status
    );
  }
}

/**
 * Get user's overall progress
 */
export async function getMyProgress(token?: string): Promise<ProgressStats> {
  try {
    let authToken = token;
    if (!authToken) {
      const authData = await getAuthData();
      authToken = authData.token;
    }
    
    const response = await apiClient.get(ENDPOINTS.MY_PROGRESS, {
      headers: { ssid: authToken },
    });
    
    // Ensure response matches ProgressStats format
    const data = response.data;
    return {
      totalCourses: data.totalCourses || 0,
      completedCourses: data.completedCourses || 0,
      inProgressCourses: data.inProgressCourses || 0,
      completedPercentage: data.completedPercentage || 0,
      courseProgress: data.courseProgress || [],
    };
  } catch (error: any) {
    console.error('[CourseService] Error fetching progress:', error);
    throw new CourseError(
      error?.response?.data?.message || error?.message || 'Failed to fetch progress',
      'UNKNOWN',
      error?.response?.status
    );
  }
}

/**
 * Get resume learning data
 */
export async function getResumeLearning(token?: string): Promise<ResumeLearningData | null> {
  try {
    let authToken = token;
    if (!authToken) {
      const authData = await getAuthData();
      authToken = authData.token;
    }
    
    const response = await apiClient.get(ENDPOINTS.RESUME, {
      headers: { ssid: authToken },
    });
    const rawData = response.data;
    const resumeData = rawData?.data ?? rawData;
    if (!resumeData?.courseId) {
      return null;
    }
    const normalizeBoolean = (value: unknown) => value === true || value === 'true' || value === 1;
    const normalized: ResumeLearningData = {
      courseId: String(resumeData.courseId),
      courseTitle: resumeData.courseTitle || '',
      sectionId: String(resumeData.sectionId || ''),
      lessonId: String(resumeData.lessonId || ''),
      lessonTitle: resumeData.lessonTitle || '',
      videoUrl: resumeData.videoUrl || '',
      fromYoutube: normalizeBoolean(resumeData.fromYoutube),
      completed: normalizeBoolean(resumeData.completed),
      watchTimeInSeconds: Number(resumeData.watchTimeInSeconds || 0),
      duration: Number(resumeData.duration || 0),
      lastWatched: resumeData.lastWatched || '',
      progress: Number(resumeData.progress || 0),
    };
    return normalized;
  } catch (error: any) {
    console.error('[CourseService] Error fetching resume learning:', error);
    // Don't throw error, just return null if not available
    return null;
  }
}

/**
 * Get courses for progress display
 */
export async function getCoursesForProgress(email?: string, token?: string): Promise<{ courses: Course[] }> {
  try {
    let userEmail = email;
    let authToken = token;
    
    if (!userEmail || !authToken) {
      const authData = await getAuthData();
      userEmail = authData.email;
      authToken = authData.token;
    }
    
    const response = await apiClient.get(
      `${ENDPOINTS.LIST}?email=${encodeURIComponent(userEmail!)}`,
      { headers: { ssid: authToken } }
    );
    
    const apiCourses = response.data.courses || [];
    const processedCourses = apiCourses.map((apiCourse: any) => processCourseData(apiCourse));
    
    return { courses: processedCourses };
  } catch (error: any) {
    console.error('[CourseService] Error fetching courses for progress:', error);
    throw new CourseError(
      error?.response?.data?.message || error?.message || 'Failed to fetch courses',
      'UNKNOWN',
      error?.response?.status
    );
  }
}
