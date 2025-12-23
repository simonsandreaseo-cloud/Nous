import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';

interface PresenceAvatarsProps {
    channelId: string;
    itemType: string;
}

interface PresenceState {
    user_id?: string;
    name: string;
    color: string;
    avatar_url?: string;
    online_at: string;
}

const COLORS = [
    '#6366F1', '#EC4899', '#8B5CF6', '#10B981', '#F59E0B',
    '#3B82F6', '#EF4444', '#06B6D4', '#84CC16', '#64748B'
];

const PresenceAvatars: React.FC<PresenceAvatarsProps> = ({ channelId, itemType }) => {
    const { user } = useAuth();
    const [onlineUsers, setOnlineUsers] = useState<Record<string, PresenceState[]>>({});

    useEffect(() => {
        if (!channelId) return;

        // Generate consistent color for guest or user
        const identifier = user?.id || Math.random().toString(36).substring(7);
        const name = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Invitado';
        const color = COLORS[Math.abs(identifier.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)) % COLORS.length];

        const channel = supabase.channel(`presence:${itemType}:${channelId}`, {
            config: {
                presence: {
                    key: identifier,
                },
            },
        });

        channel
            .on('presence', { event: 'sync' }, () => {
                const state = channel.presenceState<PresenceState>();
                setOnlineUsers(state);
            })
            .on('presence', { event: 'join' }, ({ key, newPresences }) => {
                // console.log('join', key, newPresences);
            })
            .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
                // console.log('leave', key, leftPresences);
            })
            .subscribe(async (status) => {
                if (status === 'SUBSCRIBED') {
                    await channel.track({
                        user_id: user?.id,
                        name: name,
                        color: color,
                        avatar_url: user?.user_metadata?.avatar_url,
                        online_at: new Date().toISOString(),
                    });
                }
            });

        return () => {
            channel.unsubscribe();
        };
    }, [channelId, user, itemType]);

    // Flatten presence state into a list of unique users (by key)
    const userList = Object.entries(onlineUsers).map(([key, presences]) => ({
        key,
        ...presences[0]
    }));

    if (userList.length <= 1) return null; // Don't show if it's just me

    return (
        <div className="flex -space-x-2 overflow-hidden items-center group">
            <AnimatePresence>
                {userList.map((u, i) => (
                    <motion.div
                        key={u.key}
                        initial={{ opacity: 0, x: 10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        className="relative"
                        title={u.name}
                    >
                        <div
                            className="w-8 h-8 rounded-full border-2 border-white flex items-center justify-center text-[10px] font-bold text-white shadow-sm overflow-hidden"
                            style={{ backgroundColor: u.color }}
                        >
                            {u.avatar_url ? (
                                <img src={u.avatar_url} alt={u.name} className="w-full h-full object-cover" />
                            ) : (
                                u.name.substring(0, 2).toUpperCase()
                            )}
                        </div>
                        {/* Status indicator */}
                        <div className="absolute bottom-0 right-0 w-2 h-2 bg-emerald-500 border-2 border-white rounded-full" title="Online" />
                    </motion.div>
                ))}
            </AnimatePresence>
            <span className="ml-4 text-[10px] text-brand-power/40 font-bold uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity">
                {userList.length} personas viendo
            </span>
        </div>
    );
};

export default PresenceAvatars;
