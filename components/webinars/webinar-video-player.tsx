'use client';

import React, { useRef, useEffect, useState } from 'react';
import { Webinar, WebinarProgress } from '@/types/webinars';
import { useUpdateWebinarProgress, useTrackWebinarAttendance } from '@/hooks/useWebinars';
import { useAuthStore } from '@/store/authStore';

interface WebinarVideoPlayerProps {
    webinar: Webinar;
    initialProgress?: WebinarProgress;
    onProgressUpdate?: (progress: WebinarProgress) => void;
}

const WebinarVideoPlayer: React.FC<WebinarVideoPlayerProps> = ({
    webinar,
    initialProgress,
    onProgressUpdate
}) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [isPlaying, setIsPlaying] = useState(false);
    const [isCompleted, setIsCompleted] = useState(false);
    const [hasTrackedAttendance, setHasTrackedAttendance] = useState(false);
    
    const { user } = useAuthStore();
    const updateProgressMutation = useUpdateWebinarProgress();
    const trackAttendanceMutation = useTrackWebinarAttendance();

    // Initialize video with saved progress
    useEffect(() => {
        if (videoRef.current && initialProgress) {
            videoRef.current.currentTime = initialProgress.currentTime;
            setCurrentTime(initialProgress.currentTime);
            setIsCompleted(initialProgress.isCompleted);
        }
    }, [initialProgress]);

    // Track video progress every 10 seconds
    useEffect(() => {
        console.log('Setting up progress tracking interval. isPlaying:', isPlaying);
        const interval = setInterval(() => {
            if (videoRef.current && isPlaying) {
                const currentTime = videoRef.current.currentTime;
                const totalDuration = videoRef.current.duration;
                
                console.log('Progress tracking - currentTime:', currentTime, 'totalDuration:', totalDuration);
                
                if (totalDuration > 0) {
                    const completionPercentage = (currentTime / totalDuration) * 100;
                    
                    // Update progress in database
                    if (user?.userID && user?.companyID) {
                        const progressData: WebinarProgress = {
                            webinarId: webinar.id,
                            userId: user.userID,
                            currentTime,
                            totalDuration,
                            lastWatchedAt: new Date().toISOString(),
                            isCompleted: completionPercentage >= 90 // Mark as completed at 90%
                        };
                        
                        // Save progress to backend
                        console.log('Saving progress:', progressData);
                        updateProgressMutation.mutate(progressData, {
                            onSuccess: (data) => {
                                console.log('Progress saved successfully:', data);
                            },
                            onError: (error) => {
                                console.error('Error saving progress:', error);
                            }
                        });
                        onProgressUpdate?.(progressData);
                        
                        // Track attendance when video is completed (90%+ watched)
                        if (completionPercentage >= 90 && !hasTrackedAttendance) {
                            console.log('Tracking attendance for completed video:', {
                                webinarId: webinar.id,
                                userId: user.userID,
                                companyId: user.companyID,
                                watchDuration: currentTime,
                                completionPercentage
                            });
                            
                            trackAttendanceMutation.mutate({
                                webinarId: webinar.id,
                                userId: user.userID,
                                companyId: user.companyID,
                                watchDuration: currentTime,
                                completionPercentage
                            }, {
                                onSuccess: (data) => {
                                    console.log('Attendance saved successfully:', data);
                                },
                                onError: (error) => {
                                    console.error('Error saving attendance:', error);
                                }
                            });
                            setHasTrackedAttendance(true);
                            setIsCompleted(true);
                        }
                    }
                }
            }
        }, 10000); // Update every 10 seconds

        return () => clearInterval(interval);
    }, [isPlaying, webinar.id, user, hasTrackedAttendance, updateProgressMutation, trackAttendanceMutation, onProgressUpdate]);

    const handlePlay = () => {
        if (videoRef.current) {
            console.log('Video play button clicked, starting video playback');
            videoRef.current.play();
            setIsPlaying(true);
        }
    };

    const handlePause = () => {
        if (videoRef.current) {
            videoRef.current.pause();
            setIsPlaying(false);
        }
    };

    const handleTimeUpdate = () => {
        if (videoRef.current) {
            setCurrentTime(videoRef.current.currentTime);
            setDuration(videoRef.current.duration);
        }
    };

    const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (videoRef.current) {
            const newTime = parseFloat(e.target.value);
            videoRef.current.currentTime = newTime;
            setCurrentTime(newTime);
        }
    };

    const formatTime = (time: number) => {
        const minutes = Math.floor(time / 60);
        const seconds = Math.floor(time % 60);
        return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    };

    const progressPercentage = duration > 0 ? (currentTime / duration) * 100 : 0;

    return (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            {/* Video Player */}
            <div className="relative bg-black">
                <video
                    ref={videoRef}
                    className="w-full h-64 md:h-96 object-cover"
                    poster={webinar.thumbnailUrl}
                    onTimeUpdate={handleTimeUpdate}
                    onLoadedMetadata={() => {
                        if (videoRef.current) {
                            setDuration(videoRef.current.duration);
                        }
                    }}
                    onEnded={() => {
                        setIsPlaying(false);
                        setIsCompleted(true);
                    }}
                >
                    <source src={webinar.videoUrl} type="video/mp4" />
                    Your browser does not support the video tag.
                </video>
                
                {/* Play/Pause Overlay */}
                <div className="absolute inset-0 flex items-center justify-center">
                    {!isPlaying && (
                        <button
                            onClick={handlePlay}
                            className="bg-white bg-opacity-90 hover:bg-opacity-100 rounded-full p-4 transition-all"
                        >
                            <svg className="w-8 h-8 text-gray-800" fill="currentColor" viewBox="0 0 20 20">
                                <path d="M8 5v10l8-5-8-5z" />
                            </svg>
                        </button>
                    )}
                </div>

                {/* Progress Bar */}
                <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 p-4">
                    <div className="flex items-center space-x-4">
                        <button
                            onClick={isPlaying ? handlePause : handlePlay}
                            className="text-white hover:text-gray-300"
                        >
                            {isPlaying ? (
                                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                                </svg>
                            ) : (
                                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                                </svg>
                            )}
                        </button>
                        
                        <div className="flex-1">
                            <input
                                type="range"
                                min="0"
                                max={duration || 0}
                                value={currentTime}
                                onChange={handleSeek}
                                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
                            />
                        </div>
                        
                        <span className="text-white text-sm">
                            {formatTime(currentTime)} / {formatTime(duration)}
                        </span>
                    </div>
                </div>
            </div>

            {/* Video Info */}
            <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                    <div>
                        <h3 className="text-xl font-semibold text-gray-900 mb-2">{webinar.title}</h3>
                        <p className="text-gray-600 mb-2">{webinar.description}</p>
                        <div className="flex items-center space-x-4 text-sm text-gray-500">
                            <span>Duration: {Math.floor(webinar.duration / 60)}:{(webinar.duration % 60).toString().padStart(2, '0')}</span>
                            <span>Instructor: {webinar.instructor}</span>
                            <span>Category: {webinar.category}</span>
                        </div>
                    </div>
                    {isCompleted && (
                        <div className="flex items-center text-green-600">
                            <svg className="w-5 h-5 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                            </svg>
                            <span className="text-sm font-medium">Completed</span>
                        </div>
                    )}
                </div>

                {/* Progress Indicator */}
                <div className="mb-4">
                    <div className="flex justify-between items-center mb-2">
                        <span className="text-sm font-medium text-gray-700">Progress</span>
                        <span className="text-sm text-gray-500">{Math.round(progressPercentage)}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${progressPercentage}%` }}
                        />
                    </div>
                </div>

                {/* Status Messages */}
                {updateProgressMutation.isPending && (
                    <div className="text-sm text-blue-600">Saving progress...</div>
                )}
                {trackAttendanceMutation.isPending && (
                    <div className="text-sm text-green-600">Recording attendance...</div>
                )}
                {trackAttendanceMutation.isSuccess && (
                    <div className="text-sm text-green-600">Attendance recorded successfully!</div>
                )}
            </div>
        </div>
    );
};

export default WebinarVideoPlayer;
