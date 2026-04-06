import { useEffect, useState, useRef } from 'react';
import { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { Project } from '../lib/task_manager';

interface PresenceState {
    [key: string]: {
        x: number;
        y: number;
        color: number;
        userId: string;
        online_at: string;
    }
}

export const useVirtualOffice = (project: Project, user: any, initialX: number, initialY: number) => {
    const [presenceState, setPresenceState] = useState<PresenceState>({});
    const [channel, setChannel] = useState<RealtimeChannel | null>(null);
    const channelRef = useRef<RealtimeChannel | null>(null);

    useEffect(() => {
        if (!project?.id || !user) return;

        const roomChannel = supabase.channel(`office:${project.id}`, {
            config: {
                presence: {
                    key: user.id,
                },
            },
        });

        roomChannel
            .on('presence', { event: 'sync' }, () => {
                const newState = roomChannel.presenceState();
                const formattedState: PresenceState = {};

                Object.keys(newState).forEach(key => {
                    if (key !== user.id && newState[key][0]) {
                        formattedState[key] = newState[key][0] as any;
                    }
                });

                setPresenceState(formattedState);
            })
            .on('presence', { event: 'join' }, ({ key, newPresences }) => {
                console.log('join', key, newPresences);
            })
            .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
                console.log('leave', key, leftPresences);
            })
            .subscribe(async (status) => {
                if (status === 'SUBSCRIBED') {
                    await roomChannel.track({
                        x: initialX,
                        y: initialY,
                        color: Math.floor(Math.random() * 0xFFFFFF), // Random color for now
                        userId: user.id,
                        online_at: new Date().toISOString(),
                    });
                    setChannel(roomChannel);
                    channelRef.current = roomChannel;
                }
            });

        return () => {
            roomChannel.unsubscribe();
        };
    }, [project?.id, user?.id]);

    const moveAvatar = async (x: number, y: number) => {
        if (channelRef.current) {
            await channelRef.current.track({
                userId: user.id,
                x,
                y,
                online_at: new Date().toISOString(),
                // Keep existing color if possible, effectively simplified here
                color: 0x00ff99
            });
        }
    };

    return { presenceState, moveAvatar };
};
