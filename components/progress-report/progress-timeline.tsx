'use client';

import React from 'react';
import { Calendar, CheckCircle, Clock, FileText, GraduationCap, ListOrdered, TrendingUp } from 'lucide-react';

interface TimelineEvent {
    id: string;
    type: 'questionnaire' | 'profile' | 'coaching' | 'workshop' | 'document' | 'milestone';
    title: string;
    description: string;
    date: string;
    status: 'completed' | 'pending' | 'in-progress';
}

interface ProgressTimelineProps {
    events: TimelineEvent[];
}

const getEventIcon = (type: TimelineEvent['type']) => {
    switch (type) {
        case 'questionnaire':
            return <FileText className="w-5 h-5" />;
        case 'profile':
            return <TrendingUp className="w-5 h-5" />;
        case 'coaching':
            return <GraduationCap className="w-5 h-5" />;
        case 'workshop':
            return <CheckCircle className="w-5 h-5" />;
        case 'document':
            return <FileText className="w-5 h-5" />;
        case 'milestone':
            return <CheckCircle className="w-5 h-5" />;
        default:
            return <Clock className="w-5 h-5" />;
    }
};

const getStatusColor = (status: TimelineEvent['status']) => {
    switch (status) {
        case 'completed':
            return 'bg-green-500 border-green-500';
        case 'in-progress':
            return 'bg-blue-500 border-blue-500';
        case 'pending':
            return 'bg-yellow-500 border-yellow-500';
        default:
            return 'bg-gray-500 border-gray-500';
    }
};

export const ProgressTimeline: React.FC<ProgressTimelineProps> = ({ events }) => {
    if (!events || events.length === 0) {
        return (
            <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-200 overflow-hidden relative">
                <div className="absolute top-0 left-0 w-32 h-32 bg-gradient-to-br from-teal-400/10 to-emerald-400/10 rounded-full -ml-16 -mt-16" />
                <div className="relative z-10">
                    <div className="flex items-center space-x-3 mb-4">
                        <div className="p-3 rounded-xl bg-gradient-to-br from-teal-500 to-emerald-500 text-white shadow-md">
                            <ListOrdered className="w-5 h-5" />
                        </div>
                        <h3 className="text-lg font-bold text-gray-900">Progress Timeline</h3>
                    </div>
                    <div className="text-center py-8 text-gray-500">
                        <Calendar className="w-12 h-12 mx-auto mb-2 opacity-50" />
                        <p>No timeline events available yet.</p>
                    </div>
                </div>
            </div>
        );
    }

    // Sort events by date (newest first)
    const sortedEvents = [...events].sort((a, b) => 
        new Date(b.date).getTime() - new Date(a.date).getTime()
    );

    return (
        <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-200 overflow-hidden relative">
            <div className="absolute top-0 left-0 w-32 h-32 bg-gradient-to-br from-teal-400/10 to-emerald-400/10 rounded-full -ml-16 -mt-16" />
            <div className="relative z-10">
                <div className="flex items-center space-x-3 mb-6">
                    <div className="p-3 rounded-xl bg-gradient-to-br from-teal-500 to-emerald-500 text-white shadow-md">
                        <ListOrdered className="w-5 h-5" />
                    </div>
                    <h3 className="text-lg font-bold text-gray-900">Progress Timeline</h3>
                </div>
                <div className="relative">
                {/* Timeline line */}
                <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-200" />
                
                <div className="space-y-6">
                    {sortedEvents.map((event) => (
                        <div key={event.id} className="relative flex items-start space-x-4">
                            {/* Timeline dot */}
                            <div className={`relative z-10 flex items-center justify-center w-8 h-8 rounded-full border-2 ${getStatusColor(event.status)} text-white`}>
                                {getEventIcon(event.type)}
                            </div>
                            
                            {/* Event content */}
                            <div className="flex-1 min-w-0 pb-6">
                                <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                        <h4 className="text-sm font-semibold text-gray-900">{event.title}</h4>
                                        <p className="text-sm text-gray-600 mt-1">{event.description}</p>
                                    </div>
                                    <div className="ml-4 text-xs text-gray-500 whitespace-nowrap">
                                        {new Date(event.date).toLocaleDateString('en-US', {
                                            month: 'short',
                                            day: 'numeric',
                                            year: 'numeric'
                                        })}
                                    </div>
                                </div>
                                
                                {/* Status badge */}
                                <div className="mt-2">
                                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                        event.status === 'completed' 
                                            ? 'bg-green-100 text-green-800'
                                            : event.status === 'in-progress'
                                            ? 'bg-blue-100 text-blue-800'
                                            : 'bg-yellow-100 text-yellow-800'
                                    }`}>
                                        {event.status === 'completed' ? 'Completed' : 
                                         event.status === 'in-progress' ? 'In Progress' : 'Pending'}
                                    </span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
                </div>
            </div>
        </div>
    );
};

