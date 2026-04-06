'use client';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/utils/cn';

interface UserPresence {
    name: string;
    photo: string;
    color: string;
}

export default function PresenceAvatars({ users }: { users: Record<string, UserPresence> }) {
    const userList = Object.entries(users);

    if (userList.length === 0) return null;

    return (
        <div className="flex items-center -space-x-2">
            <AnimatePresence mode='popLayout'>
                {userList.map(([id, user]) => (
                    <motion.div
                        key={id}
                        initial={{ opacity: 0, scale: 0.5, x: 20 }}
                        animate={{ opacity: 1, scale: 1, x: 0 }}
                        exit={{ opacity: 0, scale: 0.5, x: -20 }}
                        className="relative group"
                    >
                        <div 
                            className={cn(
                                "w-7 h-7 rounded-full border-2 bg-white flex items-center justify-center overflow-hidden shadow-sm transition-transform group-hover:scale-110 group-hover:z-10",
                                `border-[${user.color}]`
                            )}
                            style={{ borderColor: user.color }}
                        >
                            {user.photo ? (
                                <img src={user.photo} alt={user.name} className="w-full h-full object-cover" />
                            ) : (
                                <div className="w-full h-full bg-slate-100 flex items-center justify-center text-[10px] font-black text-slate-400">
                                    {user.name.charAt(0).toUpperCase()}
                                </div>
                            )}
                        </div>

                        {/* Tooltip */}
                        <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
                            <div className="bg-slate-900 text-white text-[9px] font-black uppercase tracking-widest px-3 py-1.5 rounded-lg whitespace-nowrap shadow-xl">
                                {user.name}
                            </div>
                            <div className="w-2 h-2 bg-slate-900 rotate-45 absolute -bottom-1 left-1/2 -translate-x-1/2" />
                        </div>
                    </motion.div>
                ))}
            </AnimatePresence>

            {userList.length > 0 && (
                <div className="ml-3 pl-3 border-l border-slate-200 h-4 flex items-center">
                    <span className="text-[9px] font-black text-indigo-500 uppercase tracking-widest animate-pulse whitespace-nowrap">
                        {userList.length === 1 ? 'Trabajando Solo' : `${userList.length} Colaboradores`}
                    </span>
                </div>
            )}
        </div>
    );
}
