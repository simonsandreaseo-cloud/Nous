import React, { useState } from 'react';
import { Message, MessagingService } from '../../services/MessagingService';

interface ChatBubbleProps {
    message: Message;
    isOwnMessage: boolean;
    isAdmin: boolean;
}

export const ChatBubble: React.FC<ChatBubbleProps> = ({ message, isOwnMessage, isAdmin }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [editContent, setEditContent] = useState(message.content);
    const [loading, setLoading] = useState(false);

    const handleUpdate = async () => {
        if (!editContent.trim() || editContent === message.content) {
            setIsEditing(false);
            return;
        }

        setLoading(true);
        try {
            await MessagingService.updateMessage(message.id, editContent);
            setIsEditing(false);
        } catch (error) {
            console.error('Error updating message:', error);
            alert('Error al actualizar el mensaje');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async () => {
        if (!window.confirm('¿Estás seguro de que quieres eliminar este mensaje?')) return;

        setLoading(true);
        try {
            await MessagingService.deleteMessage(message.id);
        } catch (error) {
            console.error('Error deleting message:', error);
            alert('Error al eliminar el mensaje');
        } finally {
            setLoading(false);
        }
    };

    const canDelete = isOwnMessage || isAdmin;
    const canEdit = isOwnMessage;

    return (
        <div className={`flex w-full ${isOwnMessage ? 'justify-end' : 'justify-start'} mb-4 group`}>
            <div className={`max-w-[80%] rounded-lg p-3 relative ${isOwnMessage
                ? 'bg-blue-600 text-white rounded-br-none'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white rounded-bl-none'
                }`}>

                {/* Actions Menu (Show on hover) */}
                <div className={`absolute top-0 ${isOwnMessage ? '-left-12' : '-right-12'} hidden group-hover:flex items-center gap-1 bg-white dark:bg-gray-800 shadow-sm border border-gray-200 dark:border-gray-700 rounded-lg p-1 z-10`}>
                    {canEdit && !isEditing && (
                        <button
                            onClick={() => setIsEditing(true)}
                            className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded text-gray-500 transition-colors"
                            title="Editar"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                        </button>
                    )}
                    {canDelete && (
                        <button
                            onClick={handleDelete}
                            className="p-1 hover:bg-red-50 dark:hover:bg-red-900/30 rounded text-red-500 transition-colors"
                            title="Eliminar"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                        </button>
                    )}
                </div>

                {!isOwnMessage && (
                    <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                        {message.sender?.email?.split('@')[0]}
                    </p>
                )}

                {isEditing ? (
                    <div className="flex flex-col gap-2 min-w-[200px]">
                        <textarea
                            value={editContent}
                            onChange={(e) => setEditContent(e.target.value)}
                            className="w-full p-2 text-sm rounded border border-blue-300 dark:border-blue-500 dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-1 focus:ring-blue-400 focus:outline-none"
                            rows={3}
                            autoFocus
                        />
                        <div className="flex justify-end gap-2">
                            <button
                                onClick={() => setIsEditing(false)}
                                className="px-2 py-1 text-xs text-gray-300 hover:text-white"
                                disabled={loading}
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleUpdate}
                                className="px-2 py-1 text-xs bg-white text-blue-600 rounded font-bold hover:bg-blue-50"
                                disabled={loading}
                            >
                                {loading ? '...' : 'Guardar'}
                            </button>
                        </div>
                    </div>
                ) : (
                    <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                )}

                <div className={`flex items-center gap-2 mt-1 ${isOwnMessage ? 'justify-end text-blue-200' : 'text-gray-500 dark:text-gray-400'}`}>
                    {message.is_edited && (
                        <span className="text-[10px] italic">(editado)</span>
                    )}
                    <span className="text-[10px]">
                        {new Date(message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                </div>
            </div>
        </div>
    );
};
