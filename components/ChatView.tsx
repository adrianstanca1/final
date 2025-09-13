// full contents of components/ChatView.tsx

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { User, Conversation, Message } from '../types';
import { api } from '../services/mockApi';
import { Avatar } from './ui/Avatar';
import { Button } from './ui/Button';

interface ChatViewProps {
  user: User;
  addToast: (message: string, type: 'success' | 'error') => void;
  initialRecipient?: User | null;
}

export const ChatView: React.FC<ChatViewProps> = ({ user, addToast, initialRecipient }) => {
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [personnel, setPersonnel] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const userMap = useMemo(() => new Map(personnel.map(p => [p.id, p])), [personnel]);

    const activeConversation = useMemo(() => {
        return conversations.find(c => c.id === activeConversationId);
    }, [conversations, activeConversationId]);
    
    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            if (!user.companyId) return;
            const [convoData, personnelData] = await Promise.all([
                api.getConversationsForUser(user.id),
                api.getUsersByCompany(user.companyId)
            ]);
            setConversations(convoData);
            setPersonnel(personnelData);
            
            if (initialRecipient) {
                let existingConvo = convoData.find(c => c.participantIds.includes(initialRecipient.id));
                if (!existingConvo) {
                    // Create a placeholder conversation
                    const newConvo: Conversation = { id: `temp-${Date.now()}`, participantIds: [user.id, initialRecipient.id], lastMessage: null };
                    setConversations(prev => [newConvo, ...prev]);
                    setActiveConversationId(newConvo.id);
                } else {
                    setActiveConversationId(existingConvo.id);
                }
            } else if (convoData.length > 0) {
                setActiveConversationId(convoData[0].id);
            }
        } catch (error) {
            addToast("Failed to load chat data", "error");
        } finally {
            setLoading(false);
        }
    }, [user, addToast, initialRecipient]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    useEffect(() => {
        if (activeConversationId) {
            // In a real app, you'd fetch messages for this conversation
            // For this mock, we'll just show the last message if it exists
            const convo = conversations.find(c => c.id === activeConversationId);
            setMessages(convo?.lastMessage ? [convo.lastMessage] : []);
        }
    }, [activeConversationId, conversations]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleSendMessage = async () => {
        if (!newMessage.trim() || !activeConversation) return;

        // Mock sending message
        const sentMessage: Message = {
            id: `msg-${Date.now()}`,
            conversationId: activeConversation.id,
            senderId: user.id,
            content: newMessage,
            timestamp: new Date(),
            isRead: true,
        };
        setMessages(prev => [...prev, sentMessage]);
        setNewMessage('');
    };
    
    const getOtherParticipant = (convo: Conversation) => {
        const otherId = convo.participantIds.find(id => id !== user.id);
        return userMap.get(otherId || 0);
    };

    return (
        <div className="flex h-[calc(100vh-8rem)] border rounded-lg bg-white dark:bg-slate-900 dark:border-slate-700">
            <aside className="w-1/3 border-r dark:border-slate-700 flex flex-col">
                <div className="p-4 border-b dark:border-slate-700">
                    <h2 className="font-semibold text-lg">Conversations</h2>
                </div>
                <div className="overflow-y-auto">
                    {conversations.map(convo => {
                        const otherUser = getOtherParticipant(convo);
                        if (!otherUser) return null;
                        return (
                             <button key={convo.id} onClick={() => setActiveConversationId(convo.id)} className={`w-full text-left p-4 flex gap-3 items-center ${activeConversationId === convo.id ? 'bg-sky-50 dark:bg-sky-900/50' : 'hover:bg-slate-50 dark:hover:bg-slate-800'}`}>
                                <Avatar name={otherUser.name} className="w-10 h-10" />
                                <div>
                                    <p className="font-semibold">{otherUser.name}</p>
                                    <p className="text-sm text-slate-500 truncate">{convo.lastMessage?.content}</p>
                                </div>
                            </button>
                        );
                    })}
                </div>
            </aside>
            <main className="w-2/3 flex flex-col">
                {activeConversation ? (
                    <>
                        <div className="p-4 border-b dark:border-slate-700 flex items-center gap-3">
                            <Avatar name={getOtherParticipant(activeConversation)?.name || ''} className="w-8 h-8" />
                            <h3 className="font-semibold">{getOtherParticipant(activeConversation)?.name}</h3>
                        </div>
                        <div className="flex-grow p-4 overflow-y-auto space-y-4">
                            {messages.map(msg => (
                                <div key={msg.id} className={`flex gap-3 ${msg.senderId === user.id ? 'justify-end' : 'justify-start'}`}>
                                    {msg.senderId !== user.id && <Avatar name={getOtherParticipant(activeConversation)?.name || ''} className="w-8 h-8"/>}
                                    <div className={`p-3 rounded-lg max-w-lg ${msg.senderId === user.id ? 'bg-sky-600 text-white' : 'bg-slate-100 dark:bg-slate-700'}`}>
                                        {msg.content}
                                    </div>
                                </div>
                            ))}
                            <div ref={messagesEndRef} />
                        </div>
                        <div className="p-4 border-t dark:border-slate-700 flex gap-2">
                            <input
                                value={newMessage}
                                onChange={e => setNewMessage(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && handleSendMessage()}
                                className="w-full p-2 border rounded-md dark:bg-slate-800 dark:border-slate-600"
                                placeholder="Type a message..."
                            />
                            <Button onClick={handleSendMessage}>Send</Button>
                        </div>
                    </>
                ) : (
                    <div className="flex-grow flex items-center justify-center text-slate-500">
                        <p>Select a conversation to start chatting.</p>
                    </div>
                )}
            </main>
        </div>
    );
};
