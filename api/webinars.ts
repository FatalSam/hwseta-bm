import apiClient from '@/ultis/apiClient';
import { Webinar, WebinarAttendance, WebinarProgress } from '@/types/webinars';
import { mockWebinars, mockWebinarAttendance, mockWebinarProgress } from '@/data/mockWebinars';

// Webinar Management APIs
export const getWebinars = async () => {
    try {
        // For now, return mock data. Replace with actual API call when backend is ready
        console.log('Get webinars API response (mock data):', mockWebinars);
        return mockWebinars;
        
        // Uncomment when backend API is ready:
        // const response = await apiClient.get('/api/webinars');
        // console.log('Get webinars API response:', response);
        // return response.data;
    } catch (error) {
        console.error('Get webinars API error:', error);
        // Return mock data as fallback
        console.log('Falling back to mock data due to error');
        return mockWebinars;
    }
};

export const getWebinarById = async (webinarId: string) => {
    try {
        // For now, return mock data. Replace with actual API call when backend is ready
        const webinar = mockWebinars.find(w => w.id === webinarId);
        if (!webinar) {
            throw new Error('Webinar not found');
        }
        console.log('Get webinar by ID API response (mock data):', webinar);
        return webinar;
        
        // Uncomment when backend API is ready:
        // const response = await apiClient.get(`/api/webinars/${webinarId}`);
        // console.log('Get webinar by ID API response:', response);
        // return response.data;
    } catch (error) {
        console.error('Get webinar by ID API error:', error);
        throw error;
    }
};

// Attendance Tracking APIs
export const trackWebinarAttendance = async (attendanceData: {
    webinarId: string;
    userId: string;
    companyId: string;
    watchDuration: number;
    completionPercentage: number;
}) => {
    try {
        // Prepare the payload for the backend API
        const payload = {
            webinarId: attendanceData.webinarId,
            userId: attendanceData.userId,
            companyId: attendanceData.companyId,
            watchDuration: attendanceData.watchDuration,
            completionPercentage: attendanceData.completionPercentage,
            attendedAt: new Date().toISOString(),
            isCompleted: attendanceData.completionPercentage >= 90
        };

        console.log('Saving webinar attendance to API:', payload);
        console.log('API URL:', '/api/WebinarAttendance/SaveWebinarAttendance');
        
        const response = await apiClient.post('/api/WebinarAttendance/SaveWebinarAttendance', payload);
        console.log('Track webinar attendance API response:', response);
        console.log('Response status:', response.status);
        console.log('Response data:', response.data);
        return response.data;
    } catch (error) {
        console.error('Track webinar attendance API error:', error);
        if (error && typeof error === 'object' && 'response' in error) {
            const axiosError = error as Record<string, unknown>;
            console.error('Error details:', axiosError.response);
        } else if (error && typeof error === 'object' && 'message' in error) {
            const errorObj = error as Record<string, unknown>;
            console.error('Error details:', errorObj.message);
        }
        console.log('Attendance tracking will continue locally despite API error');
        
        // Don't throw error - just log it and continue
        // This allows the video player to continue working even if API is down
        return { success: false, message: 'API temporarily unavailable', data: attendanceData };
    }
};

export const getWebinarAttendance = async (userId: string, companyId: string) => {
    try {
        const response = await apiClient.get(`/api/WebinarAttendance/GetWebinarAttendance?userId=${userId}&companyId=${companyId}`);
        console.log('Get webinar attendance API response:', response);
        
        // Handle API response format - return the data array directly
        if (response.data && response.data.success) {
            return response.data.data || [];
        }
        
        return response.data || [];
    } catch (error) {
        console.error('Get webinar attendance API error:', error);
        console.log('Falling back to mock attendance data due to API error');
        
        // Return mock data as fallback when API fails
        const mockAttendance = mockWebinarAttendance.filter(a => a.userId === userId && a.companyId === companyId);
        return mockAttendance;
    }
};

export const updateWebinarProgress = async (progressData: WebinarProgress) => {
    try {
        console.log('Saving webinar progress to API:', progressData);
        console.log('API URL:', '/api/WebinarProgress/SaveWebinarProgress');
        
        const response = await apiClient.post('/api/WebinarProgress/SaveWebinarProgress', progressData);
        console.log('Update webinar progress API response:', response);
        console.log('Response status:', response.status);
        console.log('Response data:', response.data);
        return response.data;
    } catch (error) {
        console.error('Update webinar progress API error:', error);
        if (error && typeof error === 'object' && 'response' in error) {
            const axiosError = error as Record<string, unknown>;
            console.error('Error details:', axiosError.response);
        } else if (error && typeof error === 'object' && 'message' in error) {
            const errorObj = error as Record<string, unknown>;
            console.error('Error details:', errorObj.message);
        }
        console.log('Progress tracking will continue locally despite API error');
        
        // Don't throw error - just log it and continue
        // This allows the video player to continue working even if API is down
        return { success: false, message: 'API temporarily unavailable', data: progressData };
    }
};

export const getWebinarProgress = async (webinarId: string, userId: string) => {
    try {
        const response = await apiClient.get(`/api/WebinarProgress/GetWebinarProgress?webinarId=${webinarId}&userId=${userId}`);
        console.log('Get webinar progress API response:', response);
        
        // Handle API response format - return the data object directly
        if (response.data && response.data.success) {
            return response.data.data || null;
        }
        
        return response.data || null;
    } catch (error) {
        console.error('Get webinar progress API error:', error);
        console.log('Falling back to mock progress data due to API error');
        
        // Return mock data as fallback when API fails
        const mockProgress = mockWebinarProgress.find(p => p.webinarId === webinarId && p.userId === userId);
        return mockProgress || null;
    }
};

// Additional API functions for attendance management
export const updateWebinarAttendance = async (attendanceId: string, attendanceData: {
    webinarId: string;
    userId: string;
    companyId: string;
    watchDuration: number;
    completionPercentage: number;
    attendedAt: string;
    isCompleted: boolean;
}) => {
    try {
        console.log('Updating webinar attendance:', attendanceId, attendanceData);
        
        const response = await apiClient.put(`/api/WebinarAttendance/UpdateWebinarAttendance/${attendanceId}`, attendanceData);
        console.log('Update webinar attendance API response:', response);
        return response.data;
    } catch (error) {
        console.error('Update webinar attendance API error:', error);
        throw error;
    }
};

export const deleteWebinarAttendance = async (attendanceId: string) => {
    try {
        console.log('Deleting webinar attendance:', attendanceId);
        
        const response = await apiClient.delete(`/api/WebinarAttendance/DeleteWebinarAttendance/${attendanceId}`);
        console.log('Delete webinar attendance API response:', response);
        return response.data;
    } catch (error) {
        console.error('Delete webinar attendance API error:', error);
        throw error;
    }
};
