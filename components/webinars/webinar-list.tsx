'use client';

import React, { useState } from 'react';
import { Webinar, WebinarProgress } from '@/types/webinars';
import { useWebinarAttendance, useWebinarProgress } from '@/hooks/useWebinars';
import { useAuthStore } from '@/store/authStore';
import WebinarVideoPlayer from './webinar-video-player';
import { Play, Clock, User, Calendar, CheckCircle, BookOpen } from 'lucide-react';
import Image from 'next/image';

interface WebinarListProps {
    webinars: Webinar[];
    onWebinarSelect?: (webinar: Webinar) => void;
}

const WebinarList: React.FC<WebinarListProps> = ({ webinars, onWebinarSelect }) => {
    const [selectedWebinar, setSelectedWebinar] = useState<Webinar | null>(null);
    const { user } = useAuthStore();
    
    const { data: attendanceData } = useWebinarAttendance(
        user?.userID || '', 
        user?.companyID || ''
    );
    
    // Always call hooks at the top level, not conditionally
    const { data: progressData } = useWebinarProgress(
        selectedWebinar?.id || '', 
        user?.userID || ''
    );

    // Type guard function for WebinarProgress
    const isValidWebinarProgress = (data: unknown): data is WebinarProgress => {
        if (!data || typeof data !== 'object') return false;
        const obj = data as Record<string, unknown>;
        return (
            typeof obj.webinarId === 'string' &&
            typeof obj.userId === 'string' &&
            typeof obj.currentTime === 'number' &&
            typeof obj.totalDuration === 'number' &&
            typeof obj.lastWatchedAt === 'string' &&
            typeof obj.isCompleted === 'boolean'
        );
    };

    // Safely convert progressData to WebinarProgress or undefined
    const safeProgressData: WebinarProgress | undefined = isValidWebinarProgress(progressData) 
        ? progressData 
        : undefined;

    const handleWebinarClick = (webinar: Webinar) => {
        setSelectedWebinar(webinar);
        onWebinarSelect?.(webinar);
    };

    const getAttendanceStatus = (webinarId: string) => {
        if (!attendanceData) return null;
        
        // Handle API response format with proper type guards
        let records: unknown[] = [];
        if (attendanceData && typeof attendanceData === 'object' && 'data' in attendanceData) {
            const data = (attendanceData as Record<string, unknown>).data;
            if (Array.isArray(data)) {
                records = data;
            }
        } else if (Array.isArray(attendanceData)) {
            records = attendanceData;
        }
        
        return records.find((attendance: unknown) => {
            if (attendance && typeof attendance === 'object' && 'webinarId' in attendance) {
                const attendanceObj = attendance as Record<string, unknown>;
                return typeof attendanceObj.webinarId === 'string' && attendanceObj.webinarId === webinarId;
            }
            return false;
        });
    };

    const formatDuration = (minutes: number) => {
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    if (selectedWebinar) {
        return (
            <div className="space-y-6">
                <button
                    onClick={() => setSelectedWebinar(null)}
                    className="flex items-center text-blue-600 hover:text-blue-800 mb-4"
                >
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                    Back to Webinar List
                </button>
                <WebinarVideoPlayer 
                    webinar={selectedWebinar} 
                    initialProgress={safeProgressData}
                />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-gray-900">Past Webinars</h2>
                <div className="text-sm text-gray-600">
                    {webinars.length} webinar{webinars.length !== 1 ? 's' : ''} available
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {webinars.map((webinar) => {
                    const attendance = getAttendanceStatus(webinar.id);
                    
                    // Type guard for attendance object
                    const isValidAttendance = (data: unknown): data is Record<string, unknown> => {
                        return data !== null && typeof data === 'object';
                    };
                    
                    const isCompleted = isValidAttendance(attendance) && typeof attendance.isCompleted === 'boolean' 
                        ? attendance.isCompleted 
                        : false;
                    const completionPercentage = isValidAttendance(attendance) && typeof attendance.completionPercentage === 'number' 
                        ? attendance.completionPercentage 
                        : 0;

                    return (
                        <div
                            key={webinar.id}
                            className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow cursor-pointer"
                            onClick={() => handleWebinarClick(webinar)}
                        >
                            {/* Thumbnail */}
                            <div className="relative h-48 bg-gray-200">
                                {webinar.thumbnailUrl ? (
                                    <Image
                                        src={webinar.thumbnailUrl}
                                        alt={webinar.title}
                                        fill
                                        className="object-cover"
                                    />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-500 to-purple-600">
                                        <Play className="w-12 h-12 text-white" />
                                    </div>
                                )}
                                
                                {/* Play Button Overlay */}
                                <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-20">
                                    <div className="bg-white bg-opacity-90 rounded-full p-3">
                                        <Play className="w-6 h-6 text-gray-800" />
                                    </div>
                                </div>

                                {/* Completion Badge */}
                                {isCompleted && (
                                    <div className="absolute top-2 right-2 bg-green-500 text-white rounded-full p-1">
                                        <CheckCircle className="w-4 h-4" />
                                    </div>
                                )}

                                {/* Progress Bar */}
                                {isValidAttendance(attendance) && !isCompleted && (
                                    <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 p-2">
                                        <div className="w-full bg-gray-200 rounded-full h-1">
                                            <div
                                                className="bg-blue-500 h-1 rounded-full transition-all duration-300"
                                                style={{ width: `${completionPercentage}%` }}
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Content */}
                            <div className="p-4">
                                <h3 className="font-semibold text-gray-900 mb-2 line-clamp-2">
                                    {webinar.title}
                                </h3>
                                
                                <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                                    {webinar.description}
                                </p>

                                {/* Meta Information */}
                                <div className="space-y-2">
                                    <div className="flex items-center text-xs text-gray-500">
                                        <Clock className="w-3 h-3 mr-1" />
                                        <span>{formatDuration(webinar.duration)}</span>
                                    </div>
                                    
                                    <div className="flex items-center text-xs text-gray-500">
                                        <User className="w-3 h-3 mr-1" />
                                        <span>{webinar.instructor}</span>
                                    </div>
                                    
                                    <div className="flex items-center text-xs text-gray-500">
                                        <BookOpen className="w-3 h-3 mr-1" />
                                        <span>{webinar.category}</span>
                                    </div>
                                    
                                    {webinar.scheduledDate && (
                                        <div className="flex items-center text-xs text-gray-500">
                                            <Calendar className="w-3 h-3 mr-1" />
                                            <span>{formatDate(webinar.scheduledDate)}</span>
                                        </div>
                                    )}
                                </div>

                                {/* Status */}
                                <div className="mt-3 pt-3 border-t border-gray-100">
                                    {isCompleted ? (
                                        <div className="flex items-center text-green-600 text-sm">
                                            <CheckCircle className="w-4 h-4 mr-1" />
                                            <span>Completed</span>
                                        </div>
                                    ) : attendance ? (
                                        <div className="flex items-center text-blue-600 text-sm">
                                            <div className="w-2 h-2 bg-blue-600 rounded-full mr-2 animate-pulse" />
                                            <span>{Math.round(completionPercentage)}% watched</span>
                                        </div>
                                    ) : (
                                        <div className="flex items-center text-gray-500 text-sm">
                                            <Play className="w-4 h-4 mr-1" />
                                            <span>Not started</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {webinars.length === 0 && (
                <div className="text-center py-12">
                    <BookOpen className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No Webinars Available</h3>
                    <p className="text-gray-600">Check back later for new webinar content.</p>
                </div>
            )}
        </div>
    );
};

export default WebinarList;
