import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import { User, LogOut } from 'lucide-react';

const AuthButton: React.FC = () => {
    const { user, signInWithGoogle, signOut } = useAuth();
    const [showMenu, setShowMenu] = React.useState(false);

    if (!user) {
        return (
            <button
                onClick={signInWithGoogle}
                className="px-4 py-2 bg-brand-power text-brand-white text-xs font-bold uppercase tracking-widest rounded hover:bg-brand-accent hover:text-brand-power transition-colors"
            >
                Conectar
            </button>
        );
    }

    return (
        <div className="relative z-50">
            <Link
                to="/dashboard"
                onClick={() => setShowMenu(false)}
                className="flex items-center gap-2 px-3 py-1.5 border border-brand-power/10 rounded hover:bg-brand-soft/50 transition-colors"
            >
                <div className="w-6 h-6 rounded-full bg-brand-accent/20 flex items-center justify-center text-brand-power overflow-hidden">
                    {user.user_metadata.avatar_url ? (
                        <img src={user.user_metadata.avatar_url} alt={user.email} className="w-full h-full object-cover" />
                    ) : (
                        <User size={14} />
                    )}
                </div>
                <span className="text-xs font-medium text-brand-power/70 hidden md:block max-w-[100px] truncate">
                    {user.email}
                </span>
            </Link>

            <AnimatePresence>
                {showMenu && (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 10 }}
                        className="absolute right-0 mt-2 w-48 bg-white border border-brand-power/5 shadow-xl rounded-lg p-2"
                    >
                        <div className="px-3 py-2 border-b border-brand-power/5 mb-2">
                            <p className="text-[10px] text-brand-power/40 uppercase tracking-widest">Cuenta</p>
                            <p className="text-sm font-bold text-brand-power truncate">{user.email}</p>
                        </div>
                        <button
                            onClick={() => { signOut(); setShowMenu(false); }}
                            className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-red-500 hover:bg-red-50 rounded transition-colors"
                        >
                            <LogOut size={14} /> Cerrar Sesión
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default AuthButton;
