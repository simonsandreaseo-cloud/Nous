import React, { useEffect, useState } from 'react';
import {
    LiveKitRoom,
    RoomAudioRenderer,
    ControlBar,
    useTracks,
    TrackLoop,
} from '@livekit/components-react';
import { Track } from 'livekit-client';
import { supabase } from '../../lib/supabase';
import '@livekit/components-styles';

interface LiveKitManagerProps {
    roomName: string;
    participantName: string;
    participantId: string;
    isConnected: boolean; // Driven by Proximity logic
}

export const LiveKitManager: React.FC<LiveKitManagerProps> = ({
    roomName,
    participantName,
    participantId,
    isConnected,
}) => {
    const [token, setToken] = useState('');

    useEffect(() => {
        if (!roomName || !participantName) return;

        const getToken = async () => {
            try {
                const { data, error } = await supabase.functions.invoke('livekit-token', {
                    body: { roomName, participantName, participantId },
                });

                if (error) throw error;
                setToken(data.token);
            } catch (e) {
                console.error('Error fetching LiveKit token:', e);
            }
        };

        getToken();
    }, [roomName, participantName, participantId]);

    if (!token) return null;

    return (
        <div className={`fixed bottom-4 right-4 z-50 transition-opacity duration-300 ${isConnected ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}>
            {/* Only connect if proximity logic says so, or always connect and mute? 
                 Better to connect/disconnect to save bandwidth if "far".
             */}
            <LiveKitRoom
                video={false}
                audio={isConnected}
                token={token}
                serverUrl={import.meta.env.VITE_LIVEKIT_URL}
                connect={isConnected}
                data-lk-theme="default"
                style={{ height: 'auto' }}
            >
                {/* Audio Renderer is invisible but handles playback */}
                <RoomAudioRenderer />

                {/* Controls */}
                <div className="bg-brand-power/90 backdrop-blur p-2 rounded-xl border border-white/10">
                    <ControlBar variation="minimal" controls={{ camera: false, screenShare: false }} />
                </div>
            </LiveKitRoom>
        </div>
    );
};
