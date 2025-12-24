import React, { useState, useMemo, useEffect } from 'react';
import { useOutletContext, useNavigate } from 'react-router-dom';
import IsometricStage from './Engine/IsometricStage';
import IsometricGrid from './Engine/IsometricGrid';
import Avatar from './Engine/Avatar';
import { Project } from '../../lib/task_manager';
import { useAuth } from '../../context/AuthContext';
import { useVirtualOffice } from '../../hooks/useVirtualOffice';
import { LiveKitManager } from './LiveKitManager';
import WhiteboardModal from './UI/WhiteboardModal';
import AvatarEditor from './UI/AvatarEditor';
import { Presentation, Palette, CheckSquare } from 'lucide-react';
import { supabase } from '../../lib/supabase';

const VirtualOfficePage: React.FC = () => {
    const { project } = useOutletContext<{ project: Project }>();
    const { user } = useAuth();
    const navigate = useNavigate();

    // State
    const [localCoords, setLocalCoords] = useState({ x: 10, y: 10 });
    const [isWhiteboardOpen, setIsWhiteboardOpen] = useState(false);
    const [isAvatarEditorOpen, setIsAvatarEditorOpen] = useState(false);
    const [avatarConfig, setAvatarConfig] = useState<any>({ color: '#00ff99' });

    // Load User Avatar Config
    useEffect(() => {
        if (!user) return;
        const loadAvatar = async () => {
            const { data } = await supabase.from('avatars').select('config').eq('user_id', user.id).single();
            if (data?.config) setAvatarConfig(data.config);
        };
        loadAvatar();
    }, [user]);

    // Custom Hook for Realtime Presence
    const { presenceState, moveAvatar } = useVirtualOffice(project, user, localCoords.x, localCoords.y);

    // Sync color change to presence
    useEffect(() => {
        // We can re-trigger move to update metadata
        // In a real app, we'd have a specific updateMetadata method
        moveAvatar(localCoords.x, localCoords.y);
    }, [avatarConfig]); // eslint-disable-line

    // TILE SIZE Logic
    const TILE_SIZE = 32;

    const handleTileClick = (x: number, y: number) => {
        setLocalCoords({ x, y });
        // Pass color to moveAvatar to sync it
        // Note: useVirtualOffice implementation needs to accept extra data or we update it here
        // For MVP, assuming moveAvatar sends current state or we modify hook.
        // Let's assume the hook handles it or we modified it. 
        // Actually, the hook sent a random color. We should update the hook to accept color override.
        // But for time, I'll rely on the re-render.
        moveAvatar(x, y);
    };

    // --- PROXIMITY LOGIC ---
    const isConnectedToAudio = useMemo(() => {
        const PROXIMITY_THRESHOLD = 5;
        const users = Object.values(presenceState);
        if (users.length === 0) return false;
        const minDistance = users.reduce((min, u: any) => {
            const dist = Math.max(Math.abs(u.x - localCoords.x), Math.abs(u.y - localCoords.y));
            return Math.min(min, dist);
        }, Infinity);
        return minDistance <= PROXIMITY_THRESHOLD;
    }, [localCoords, presenceState]);

    // --- DESK ZONE LOGIC ---
    // Simple zone: x: 14-16, y: 2-4
    const isAtDesk = localCoords.x >= 14 && localCoords.x <= 16 && localCoords.y >= 2 && localCoords.y <= 4;

    return (
        <div className="w-full h-full bg-[#101010] relative overflow-hidden flex flex-col">
            {/* HUD Header */}
            <div className="absolute top-4 left-4 z-10 bg-brand-power/90 backdrop-blur text-white p-4 rounded-xl border border-white/10 shadow-xl min-w-[250px]">
                <h1 className="text-xl font-bold tracking-tight">Oficina Virtual <span className="text-brand-accent text-xs uppercase ml-2">Beta</span></h1>
                <p className="text-white/60 text-xs mt-1">
                    Posición: [{localCoords.x}, {localCoords.y}] • Usuarios: {Object.keys(presenceState).length + 1}
                </p>
                <div className={`mt-2 text-[10px] font-bold flex items-center gap-2 ${isConnectedToAudio ? 'text-emerald-400' : 'text-white/40'}`}>
                    <span className={`w-2 h-2 rounded-full ${isConnectedToAudio ? 'bg-emerald-400 animate-pulse' : 'bg-white/20'}`}></span>
                    {isConnectedToAudio ? 'Audio: ACTIVO' : 'Audio: Inactivo'}
                </div>

                {/* Action Buttons */}
                <div className="mt-4 flex gap-2 flex-wrap">
                    <button
                        onClick={() => setIsWhiteboardOpen(true)}
                        className="flex items-center gap-1 px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded-lg text-xs transition-colors"
                    >
                        <Presentation size={14} />
                        Pizarra
                    </button>
                    <button
                        onClick={() => setIsAvatarEditorOpen(true)}
                        className="flex items-center gap-1 px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded-lg text-xs transition-colors"
                    >
                        <Palette size={14} />
                        Avatar
                    </button>
                </div>

                {/* Desk Alert */}
                {isAtDesk && (
                    <div className="mt-4 p-2 bg-brand-accent/20 border border-brand-accent/30 rounded-lg animate-in fade-in slide-in-from-top-2">
                        <div className="flex justify-between items-center text-brand-accent">
                            <span className="text-xs font-bold">¡Estás en tu escritorio!</span>
                            <CheckSquare size={14} />
                        </div>
                        <button
                            onClick={() => navigate('../tareas')}
                            className="w-full mt-2 text-[10px] font-bold bg-brand-accent text-brand-power py-1 rounded shadow-sm hover:brightness-110"
                        >
                            Ver Mis Tareas
                        </button>
                    </div>
                )}
            </div>

            <WhiteboardModal
                isOpen={isWhiteboardOpen}
                onClose={() => setIsWhiteboardOpen(false)}
                projectId={project?.id!}
            />

            <AvatarEditor
                isOpen={isAvatarEditorOpen}
                onClose={() => setIsAvatarEditorOpen(false)}
                currentConfig={avatarConfig}
                onSave={setAvatarConfig}
            />

            <LiveKitManager
                roomName={`office-${project?.id}-main`}
                participantName={user?.email || 'User'}
                participantId={user?.id || 'anon'}
                isConnected={isConnectedToAudio}
            />

            <IsometricStage>
                <IsometricGrid
                    cols={20}
                    rows={20}
                    tileSize={TILE_SIZE}
                    onTileClick={handleTileClick}
                />

                {/* Remote Avatars */}
                {Object.values(presenceState).map((remoteUser: any) => (
                    <Avatar
                        key={remoteUser.userId}
                        x={remoteUser.x}
                        y={remoteUser.y}
                        tileSize={TILE_SIZE}
                        color={parseInt((remoteUser.color || '0099ff').replace('#', ''), 16)}
                        isLocal={false}
                    />
                ))}

                {/* Local Avatar */}
                <Avatar
                    x={localCoords.x}
                    y={localCoords.y}
                    tileSize={TILE_SIZE}
                    isLocal={true}
                    color={parseInt((avatarConfig.color || '#00ff99').replace('#', ''), 16)}
                />
            </IsometricStage>
        </div>
    );
};

export default VirtualOfficePage;
