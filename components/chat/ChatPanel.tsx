import React, { useState, useEffect, useRef } from 'react';
import { MessagingService, Message } from '../../services/MessagingService';
import { supabase } from '../../lib/supabase';
import { ChatBubble } from './ChatBubble';

interface ChatPanelProps {
    projectId: number;
    isOpen: boolean;
    onClose: () => void;
}

export const ChatPanel: React.FC<ChatPanelProps> = ({ projectId, isOpen, onClose }) => {
    const [messages, setMessages] = useState<Message[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [loading, setLoading] = useState(true);
    const [currentUser, setCurrentUser] = useState<string | null>(null);
    const [isAdmin, setIsAdmin] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        supabase.auth.getUser().then(({ data }) => setCurrentUser(data.user?.id || null));
    }, []);

    useEffect(() => {
        if (currentUser && projectId) {
            checkUserRole();
        }
    }, [currentUser, projectId]);

    const checkUserRole = async () => {
        try {
            // Check if user is owner
            const { data: project } = await supabase
                .from('projects')
                .select('owner_id')
                .eq('id', projectId)
                .single();

            if (project?.owner_id === currentUser) {
                setIsAdmin(true);
                return;
            }

            // Check if user is admin member
            const { data: member } = await supabase
                .from('project_members')
                .select('role')
                .eq('project_id', projectId)
                .eq('user_id', currentUser)
                .single();

            setIsAdmin(member?.role === 'admin');
        } catch (error) {
            console.error('Error checking user role:', error);
            setIsAdmin(false);
        }
    };

    useEffect(() => {
        if (isOpen && projectId) {
            loadMessages();
            const subscription = MessagingService.subscribeToProjectMessages(projectId, (payload) => {
                const { eventType, new: newRecord, old: oldRecord } = payload;

                if (eventType === 'INSERT') {
                    // Re-fetch messages to get sender details
                    MessagingService.getProjectMessages(projectId).then(setMessages);
                } else if (eventType === 'UPDATE') {
                    setMessages(prev => prev.map(msg => msg.id === newRecord.id ? { ...msg, ...newRecord } : msg));
                } else if (eventType === 'DELETE') {
                    setMessages(prev => prev.filter(msg => msg.id === oldRecord.id));
                }
            });

            return () => {
                subscription.unsubscribe();
            };
        }
    }, [isOpen, projectId]);

    const loadMessages = async () => {
        setLoading(true);
        try {
            const data = await MessagingService.getProjectMessages(projectId);
            setMessages(data);
            scrollToBottom();
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const scrollToBottom = () => {
        if (isOpen) {
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, isOpen]);

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newMessage.trim()) return;

        try {
            const message = await MessagingService.sendProjectMessage(projectId, newMessage);
            setMessages(prev => [...prev, message]);
            setNewMessage('');
        } catch (error) {
            console.error('Error sending message:', error);
            alert('Error sending message. Check console for details.');
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend(e as any);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="h-full bg-white dark:bg-gray-800 shadow-sm border border-brand-power/5 rounded-xl flex flex-col">
            {/* Header */}
            <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-900 rounded-t-xl">
                <h3 className="font-semibold text-lg dark:text-white">Chat de Equipo</h3>
                <button onClick={onClose} className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 bg-gray-50/50 dark:bg-gray-900">
                {loading ? (
                    <div className="flex justify-center items-center h-full">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    </div>
                ) : (
                    <>
                        {messages.length === 0 ? (
                            <div className="text-center text-gray-500 mt-10 text-sm">No hay mensajes aún. ¡Comienza la conversación!</div>
                        ) : (
                            messages.map(msg => (
                                <ChatBubble
                                    key={msg.id}
                                    message={msg}
                                    isOwnMessage={msg.sender_id === currentUser}
                                    isAdmin={isAdmin}
                                />
                            ))
                        )}
                        <div ref={messagesEndRef} />
                    </>
                )}
            </div>

            {/* Input */}
            <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 rounded-b-xl">
                <form onSubmit={handleSend} className="flex flex-col gap-2">
                    <textarea
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Escribe un mensaje..."
                        className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white resize-none text-sm"
                        rows={3}
                    />
                    <div className="flex justify-end">
                        <button
                            type="submit"
                            disabled={!newMessage.trim()}
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium"
                        >
                            Enviar Mensaje
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
