import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
    getWebinars, 
    getWebinarById, 
    trackWebinarAttendance, 
    getWebinarAttendance,
    updateWebinarProgress,
    getWebinarProgress
} from '@/api/webinars';
import { WebinarAttendance, WebinarProgress } from '@/types/webinars';

export const useWebinars = () => {
    return useQuery({
        queryKey: ['webinars'],
        queryFn: getWebinars,
        staleTime: 5 * 60 * 1000, // 5 minutes
        gcTime: 10 * 60 * 1000, // 10 minutes
    });
};

export const useWebinar = (webinarId: string) => {
    return useQuery({
        queryKey: ['webinar', webinarId],
        queryFn: () => getWebinarById(webinarId),
        enabled: !!webinarId,
        staleTime: 5 * 60 * 1000,
        gcTime: 10 * 60 * 1000,
    });
};

export const useWebinarAttendance = (userId: string, companyId: string) => {
    return useQuery({
        queryKey: ['webinarAttendance', userId, companyId],
        queryFn: () => getWebinarAttendance(userId, companyId),
        enabled: !!userId && !!companyId,
        staleTime: 2 * 60 * 1000, // 2 minutes
        gcTime: 5 * 60 * 1000, // 5 minutes
    });
};

export const useWebinarProgress = (webinarId: string, userId: string) => {
    return useQuery({
        queryKey: ['webinarProgress', webinarId, userId],
        queryFn: () => getWebinarProgress(webinarId, userId),
        enabled: !!webinarId && !!userId,
        staleTime: 1 * 60 * 1000, // 1 minute
        gcTime: 5 * 60 * 1000, // 5 minutes
    });
};

export const useTrackWebinarAttendance = () => {
    const queryClient = useQueryClient();
    
    return useMutation({
        mutationFn: trackWebinarAttendance,
        onSuccess: () => {
            // Invalidate attendance queries to refresh data
            queryClient.invalidateQueries({ queryKey: ['webinarAttendance'] });
        },
    });
};

export const useUpdateWebinarProgress = () => {
    const queryClient = useQueryClient();
    
    return useMutation({
        mutationFn: updateWebinarProgress,
        onSuccess: (_, variables) => {
            // Invalidate progress queries for this specific webinar
            queryClient.invalidateQueries({ 
                queryKey: ['webinarProgress', variables.webinarId, variables.userId] 
            });
        },
    });
};
