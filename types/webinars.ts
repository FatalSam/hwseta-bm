export interface Webinar {
    id: string;
    title: string;
    description: string;
    videoUrl: string;
    thumbnailUrl?: string;
    duration: number; // in minutes
    category: string;
    instructor: string;
    scheduledDate: string;
    isLive: boolean;
    isRecorded: boolean;
    createdAt: string;
    updatedAt: string;
}

export interface WebinarAttendance {
    id: string;
    webinarId: string;
    userId: string;
    companyId: string;
    attendedAt: string;
    watchDuration: number; // in seconds
    completionPercentage: number; // 0-100
    isCompleted: boolean;
    createdAt: string;
}

export interface WebinarProgress {
    webinarId: string;
    userId: string;
    currentTime: number; // in seconds
    totalDuration: number; // in seconds
    lastWatchedAt: string;
    isCompleted: boolean;
}
