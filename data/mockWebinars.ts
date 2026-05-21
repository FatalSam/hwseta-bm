import { Webinar } from '@/types/webinars';

export const mockWebinars: Webinar[] = [
    {
        id: 'webinar-1',
        title: 'Introduction to Business Development',
        description: 'Learn the fundamentals of business development, including market research, customer acquisition, and growth strategies. This comprehensive webinar covers essential concepts for entrepreneurs and business owners.',
        videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
        thumbnailUrl: 'https://images.unsplash.com/photo-1551434678-e076c223a692?w=400&h=225&fit=crop&crop=center',
        duration: 45, // 45 minutes
        category: 'Business Development',
        instructor: 'Dr. Sarah Johnson',
        scheduledDate: '2024-01-15T14:00:00Z',
        isLive: false,
        isRecorded: true,
        createdAt: '2024-01-10T10:00:00Z',
        updatedAt: '2024-01-15T16:00:00Z'
    },
    {
        id: 'webinar-2',
        title: 'Financial Planning for Small Businesses',
        description: 'Master the art of financial planning for your small business. Topics include budgeting, cash flow management, financial forecasting, and investment strategies.',
        videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
        thumbnailUrl: 'https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=400&h=225&fit=crop&crop=center',
        duration: 60, // 60 minutes
        category: 'Finance',
        instructor: 'Michael Chen',
        scheduledDate: '2024-01-20T15:30:00Z',
        isLive: false,
        isRecorded: true,
        createdAt: '2024-01-12T09:00:00Z',
        updatedAt: '2024-01-20T17:30:00Z'
    },
    {
        id: 'webinar-3',
        title: 'Digital Marketing Strategies',
        description: 'Discover effective digital marketing strategies to grow your business online. Learn about SEO, social media marketing, content marketing, and paid advertising.',
        videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
        thumbnailUrl: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=400&h=225&fit=crop&crop=center',
        duration: 75, // 75 minutes
        category: 'Marketing',
        instructor: 'Lisa Rodriguez',
        scheduledDate: '2024-01-25T11:00:00Z',
        isLive: false,
        isRecorded: true,
        createdAt: '2024-01-18T14:00:00Z',
        updatedAt: '2024-01-25T13:00:00Z'
    },
    {
        id: 'webinar-4',
        title: 'Leadership and Team Management',
        description: 'Develop essential leadership skills and learn how to build and manage high-performing teams. Perfect for managers and business owners.',
        videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
        thumbnailUrl: 'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=400&h=225&fit=crop&crop=center',
        duration: 50, // 50 minutes
        category: 'Leadership',
        instructor: 'David Thompson',
        scheduledDate: '2024-01-30T16:00:00Z',
        isLive: false,
        isRecorded: true,
        createdAt: '2024-01-22T11:30:00Z',
        updatedAt: '2024-01-30T18:00:00Z'
    },
    {
        id: 'webinar-5',
        title: 'Legal Essentials for Entrepreneurs',
        description: 'Understand the legal requirements and considerations for starting and running a business. Covers business registration, contracts, intellectual property, and compliance.',
        videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4',
        thumbnailUrl: 'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=400&h=225&fit=crop&crop=center',
        duration: 90, // 90 minutes
        category: 'Legal',
        instructor: 'Attorney Jennifer Walsh',
        scheduledDate: '2024-02-05T13:00:00Z',
        isLive: false,
        isRecorded: true,
        createdAt: '2024-01-28T10:00:00Z',
        updatedAt: '2024-02-05T15:00:00Z'
    },
    {
        id: 'webinar-6',
        title: 'Technology Trends for Small Business',
        description: 'Stay ahead with the latest technology trends that can benefit your small business. Learn about automation, cloud computing, AI tools, and digital transformation.',
        videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4',
        thumbnailUrl: 'https://images.unsplash.com/photo-1518709268805-4e9042af2176?w=400&h=225&fit=crop&crop=center',
        duration: 55, // 55 minutes
        category: 'Technology',
        instructor: 'Alex Kim',
        scheduledDate: '2024-02-10T10:00:00Z',
        isLive: false,
        isRecorded: true,
        createdAt: '2024-02-01T12:00:00Z',
        updatedAt: '2024-02-10T12:00:00Z'
    }
];

export const mockWebinarAttendance = [
    {
        id: 'attendance-1',
        webinarId: 'webinar-1',
        userId: 'user-123',
        companyId: 'company-456',
        attendedAt: '2024-01-15T14:30:00Z',
        watchDuration: 2700, // 45 minutes in seconds
        completionPercentage: 100,
        isCompleted: true,
        createdAt: '2024-01-15T15:15:00Z'
    },
    {
        id: 'attendance-2',
        webinarId: 'webinar-2',
        userId: 'user-123',
        companyId: 'company-456',
        attendedAt: '2024-01-20T15:45:00Z',
        watchDuration: 1800, // 30 minutes in seconds
        completionPercentage: 50,
        isCompleted: false,
        createdAt: '2024-01-20T16:15:00Z'
    }
];

export const mockWebinarProgress = [
    {
        webinarId: 'webinar-2',
        userId: 'user-123',
        currentTime: 1800, // 30 minutes in seconds
        totalDuration: 3600, // 60 minutes in seconds
        lastWatchedAt: '2024-01-20T16:15:00Z',
        isCompleted: false
    }
];
