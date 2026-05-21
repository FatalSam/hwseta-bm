'use client';

import { useAuthStore } from '@/store/authStore';

export default function UserInfo() {
    const { user, isAuthenticated, token } = useAuthStore();

    if (!isAuthenticated || !user) {
        return (
            <div className="p-4 bg-yellow-100 border border-yellow-400 text-yellow-700 rounded">
                <p>Not authenticated</p>
            </div>
        );
    }

    return (
        <div className="p-6 bg-white rounded-lg shadow-md">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">User Information</h3>
            <div className="space-y-2">
                <div className="flex justify-between">
                    <span className="font-medium text-gray-600">Name:</span>
                    <span className="text-gray-800">{user.firstName} {user.lastName}</span>
                </div>
                <div className="flex justify-between">
                    <span className="font-medium text-gray-600">Email:</span>
                    <span className="text-gray-800">{user.email}</span>
                </div>
                <div className="flex justify-between">
                    <span className="font-medium text-gray-600">Username:</span>
                    <span className="text-gray-800">{user.userName}</span>
                </div>
                <div className="flex justify-between">
                    <span className="font-medium text-gray-600">Company:</span>
                    <span className="text-gray-800">{user.companyName}</span>
                </div>
                <div className="flex justify-between">
                    <span className="font-medium text-gray-600">Role:</span>
                    <span className="text-gray-800">{user.role}</span>
                </div>
                <div className="flex justify-between">
                    <span className="font-medium text-gray-600">User ID:</span>
                    <span className="text-gray-800">{user.userID}</span>
                </div>
                <div className="flex justify-between">
                    <span className="font-medium text-gray-600">Company ID:</span>
                    <span className="text-gray-800">{user.companyID}</span>
                </div>
                <div className="flex justify-between">
                    <span className="font-medium text-gray-600">Token:</span>
                    <span className="text-gray-800 text-xs truncate max-w-32">
                        {token ? `${token.substring(0, 20)}...` : 'No token'}
                    </span>
                </div>
            </div>
        </div>
    );
} 