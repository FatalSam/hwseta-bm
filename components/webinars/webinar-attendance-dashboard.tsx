'use client';

import React from 'react';
import { useWebinarAttendance } from '@/hooks/useWebinars';
import { useAuthStore } from '@/store/authStore';
import { CheckCircle, Clock, TrendingUp, BookOpen } from 'lucide-react';

interface WebinarAttendanceDashboardProps {
    className?: string;
}

const WebinarAttendanceDashboard: React.FC<WebinarAttendanceDashboardProps> = ({ className = '' }) => {
    const { user } = useAuthStore();
    const { data: attendanceData, isLoading } = useWebinarAttendance(
        user?.userID || '', 
        user?.companyID || ''
    );

    if (isLoading) {
        return (
            <div className={`bg-white p-6 rounded-lg shadow-sm border border-gray-200 ${className}`}>
                <div className="animate-pulse">
                    <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
                    <div className="space-y-3">
                        <div className="h-3 bg-gray-200 rounded"></div>
                        <div className="h-3 bg-gray-200 rounded w-5/6"></div>
                    </div>
                </div>
            </div>
        );
    }

    // Handle API response format
    let attendanceRecords: unknown[] = [];
    if (attendanceData && typeof attendanceData === 'object' && 'data' in attendanceData) {
        const data = (attendanceData as Record<string, unknown>).data;
        if (Array.isArray(data)) {
            attendanceRecords = data;
        }
    } else if (Array.isArray(attendanceData)) {
        attendanceRecords = attendanceData;
    }

    if (!attendanceRecords || attendanceRecords.length === 0) {
        return (
            <div className={`bg-white p-6 rounded-lg shadow-sm border border-gray-200 ${className}`}>
                <div className="text-center">
                    <BookOpen className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No Webinar Attendance</h3>
                    <p className="text-gray-600">Start watching webinars to track your progress here.</p>
                </div>
            </div>
        );
    }

    // Type guard function for attendance records
    const isValidAttendanceRecord = (record: unknown): record is Record<string, unknown> => {
        return record !== null && typeof record === 'object';
    };

    const completedWebinars = attendanceRecords.filter(attendance => 
        isValidAttendanceRecord(attendance) && 
        typeof attendance.isCompleted === 'boolean' && 
        attendance.isCompleted
    );
    
    const totalWatchTime = attendanceRecords.reduce((total: number, attendance) => {
        if (isValidAttendanceRecord(attendance) && typeof attendance.watchDuration === 'number') {
            return total + attendance.watchDuration;
        }
        return total;
    }, 0);
    
    const averageCompletion = attendanceRecords.reduce((total: number, attendance) => {
        if (isValidAttendanceRecord(attendance) && typeof attendance.completionPercentage === 'number') {
            return total + attendance.completionPercentage;
        }
        return total;
    }, 0) / attendanceRecords.length;

    const formatDuration = (seconds: number) => {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    };

    return (
        <div className={`space-y-6 ${className}`}>
            {/* Summary Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
                    <div className="flex items-center">
                        <div className="p-2 bg-green-100 rounded-lg">
                            <CheckCircle className="w-6 h-6 text-green-600" />
                        </div>
                        <div className="ml-3">
                            <p className="text-sm font-medium text-gray-600">Completed</p>
                            <p className="text-2xl font-bold text-gray-900">{completedWebinars.length}</p>
                        </div>
                    </div>
                </div>

                <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
                    <div className="flex items-center">
                        <div className="p-2 bg-blue-100 rounded-lg">
                            <BookOpen className="w-6 h-6 text-blue-600" />
                        </div>
                        <div className="ml-3">
                            <p className="text-sm font-medium text-gray-600">Total Webinars</p>
                            <p className="text-2xl font-bold text-gray-900">{attendanceRecords.length}</p>
                        </div>
                    </div>
                </div>

                <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
                    <div className="flex items-center">
                        <div className="p-2 bg-purple-100 rounded-lg">
                            <Clock className="w-6 h-6 text-purple-600" />
                        </div>
                        <div className="ml-3">
                            <p className="text-sm font-medium text-gray-600">Watch Time</p>
                            <p className="text-2xl font-bold text-gray-900">{formatDuration(totalWatchTime)}</p>
                        </div>
                    </div>
                </div>

                <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
                    <div className="flex items-center">
                        <div className="p-2 bg-orange-100 rounded-lg">
                            <TrendingUp className="w-6 h-6 text-orange-600" />
                        </div>
                        <div className="ml-3">
                            <p className="text-sm font-medium text-gray-600">Avg. Completion</p>
                            <p className="text-2xl font-bold text-gray-900">{Math.round(averageCompletion)}%</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Detailed Attendance List */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                <div className="px-6 py-4 border-b border-gray-200">
                    <h3 className="text-lg font-medium text-gray-900">Webinar Attendance History</h3>
                </div>
                
                <div className="divide-y divide-gray-200">
                    {attendanceRecords.map((attendance) => {
                        if (!isValidAttendanceRecord(attendance)) return null;
                        
                        const id = typeof attendance.id === 'string' ? attendance.id : 'unknown';
                        const isCompleted = typeof attendance.isCompleted === 'boolean' ? attendance.isCompleted : false;
                        const webinarId = typeof attendance.webinarId === 'string' ? attendance.webinarId : 'Unknown';
                        const attendedAt = typeof attendance.attendedAt === 'string' ? attendance.attendedAt : new Date().toISOString();
                        const completionPercentage = typeof attendance.completionPercentage === 'number' ? attendance.completionPercentage : 0;
                        const watchDuration = typeof attendance.watchDuration === 'number' ? attendance.watchDuration : 0;
                        
                        return (
                            <div key={id} className="px-6 py-4">
                                <div className="flex items-center justify-between">
                                    <div className="flex-1">
                                        <div className="flex items-center space-x-3">
                                            <div className={`w-3 h-3 rounded-full ${
                                                isCompleted ? 'bg-green-500' : 'bg-blue-500'
                                            }`} />
                                            <div>
                                                <p className="text-sm font-medium text-gray-900">
                                                    Webinar ID: {webinarId}
                                                </p>
                                                <p className="text-xs text-gray-500">
                                                    Attended on {formatDate(attendedAt)}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <div className="flex items-center space-x-6 text-sm text-gray-600">
                                        <div className="text-center">
                                            <p className="font-medium">{Math.round(completionPercentage)}%</p>
                                            <p className="text-xs">Completion</p>
                                        </div>
                                        <div className="text-center">
                                            <p className="font-medium">{formatDuration(watchDuration)}</p>
                                            <p className="text-xs">Watch Time</p>
                                        </div>
                                        <div className="text-center">
                                            {isCompleted ? (
                                                <div className="flex items-center text-green-600">
                                                    <CheckCircle className="w-4 h-4 mr-1" />
                                                    <span className="text-xs">Completed</span>
                                                </div>
                                            ) : (
                                                <div className="flex items-center text-blue-600">
                                                    <Clock className="w-4 h-4 mr-1" />
                                                    <span className="text-xs">In Progress</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                
                                {/* Progress Bar */}
                                <div className="mt-3">
                                    <div className="w-full bg-gray-200 rounded-full h-2">
                                        <div
                                            className={`h-2 rounded-full transition-all duration-300 ${
                                                isCompleted ? 'bg-green-500' : 'bg-blue-500'
                                            }`}
                                            style={{ width: `${completionPercentage}%` }}
                                        />
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

export default WebinarAttendanceDashboard;
