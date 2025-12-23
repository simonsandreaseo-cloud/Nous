import React from 'react';
import { Message } from '../../services/MessagingService';

interface ChatBubbleProps {
    message: Message;
    isOwnMessage: boolean;
}

export const ChatBubble: React.FC<ChatBubbleProps> = ({ message, isOwnMessage }) => {
    return (
        <div className={`flex w-full ${isOwnMessage ? 'justify-end' : 'justify-start'} mb-4`}>
            <div className={`max-w-[80%] rounded-lg p-3 ${isOwnMessage
                    ? 'bg-blue-600 text-white rounded-br-none'
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white rounded-bl-none'
                }`}>
                {!isOwnMessage && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                        {message.sender?.email?.split('@')[0]}
                    </p>
                )}
                <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                <p className={`text-[10px] mt-1 ${isOwnMessage ? 'text-blue-200' : 'text-gray-500 dark:text-gray-400'}`}>
                    {new Date(message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
            </div>
        </div>
    );
};
