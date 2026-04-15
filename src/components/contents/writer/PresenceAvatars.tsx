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

    return (
        <div className="flex items-center -space-x-1.5 transition-all">
            <AnimatePresence mode='popLayout'>
                {userList.map(([id, user]) => (
                    <motion.div
                        key={id}
                        initial={{ opacity: 0, scale: 0.5, x: 20 }}
                        animate={{ opacity: 1, scale: 1, x: 0 }}
                        exit={{ opacity: 0, scale: 0.5, x: -20 }}
                        className="relative group shrink-0"
                    >
                        <div 
                            className={cn(
                                "w-6 h-6 rounded-full border-2 bg-white flex items-center justify-center overflow-hidden shadow-sm transition-all group-hover:scale-110 group-hover:z-10 group-hover:shadow-md",
                                `border-[${user.color}]`
                            )}
                            style={{ borderColor: user.color }}
                        >
                            {user.photo ? (
                                <img src={user.photo} alt={user.name} className="w-full h-full object-cover" />
                            ) : (
                                <div className="w-full h-full bg-slate-100 flex items-center justify-center text-[9px] font-black text-slate-400">
                                    {user.name.charAt(0).toUpperCase()}
                                </div>
                            )}
                        </div>
                    </motion.div>
                ))}
            </AnimatePresence>
        </div>
    );
}
