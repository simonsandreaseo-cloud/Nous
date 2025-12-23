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
    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        supabase.auth.getUser().then(({ data }) => setCurrentUser(data.user?.id || null));
    }, []);

    useEffect(() => {
        if (isOpen && projectId) {
            loadMessages();
            const subscription = MessagingService.subscribeToProjectMessages(projectId, (payload) => {
                // Quick hack: payload.new doesn't have sender email, so for now we might append without it 
                // or re-fetch. Re-fetching is safer for data consistency but slower.
                // Let's optimistic update or just fetch single.
                // For now, simpler to re-fetch or append basic.
                console.log('New message received', payload);
                // Refresh to get full sender info
                MessagingService.getProjectMessages(projectId).then(setMessages);
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
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
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
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-y-0 right-0 w-96 bg-white dark:bg-gray-800 shadow-xl transform transition-transform duration-300 z-50 flex flex-col border-l border-gray-200 dark:border-gray-700">
            {/* Header */}
            <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-900">
                <h3 className="font-semibold text-lg dark:text-white">Project Chat</h3>
                <button onClick={onClose} className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 bg-gray-50 dark:bg-gray-900">
                {loading ? (
                    <div className="flex justify-center items-center h-full">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    </div>
                ) : (
                    <>
                        {messages.length === 0 ? (
                            <div className="text-center text-gray-500 mt-10">No messages yet. Start the conversation!</div>
                        ) : (
                            messages.map(msg => (
                                <ChatBubble
                                    key={msg.id}
                                    message={msg}
                                    isOwnMessage={msg.sender_id === currentUser}
                                />
                            ))
                        )}
                        <div ref={messagesEndRef} />
                    </>
                )}
            </div>

            {/* Input */}
            <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
                <form onSubmit={handleSend} className="flex gap-2">
                    <input
                        type="text"
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        placeholder="Type a message..."
                        className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                    />
                    <button
                        type="submit"
                        disabled={!newMessage.trim()}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        Send
                    </button>
                </form>
            </div>
        </div>
    );
};
