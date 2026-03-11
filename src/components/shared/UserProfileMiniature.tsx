import React from 'react';
import { User } from 'lucide-react';

export const UserProfileMiniature: React.FC<{ user: any; size?: number }> = ({ user, size = 32 }) => (
    <div
        className="rounded-full bg-stone-100 overflow-hidden border border-stone-200 flex-shrink-0"
        style={{ width: size, height: size }}
    >
        {user?.photo ? (
            <img src={user.photo} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
        ) : (
            <div className="w-full h-full flex items-center justify-center text-stone-300">
                <User size={size * 0.6} />
            </div>
        )}
    </div>
);
