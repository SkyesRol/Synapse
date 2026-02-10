import { useState, useEffect } from 'react'
import { Message } from '../types/conversation'
import { addMessage, getAllMessages } from '../services/conversationService'
import { useConversationStore } from '../store/conversationStore'
import { useNavigate } from 'react-router-dom'

interface UseChatReturn {
    messages: Message[];
    loading: boolean;
    sendMessage: (content: string) => Promise<void>;
}
const useChat = (conversationId: string | undefined): UseChatReturn => {
    const [loading, setIsLoading] = useState<boolean>(false);
    const [messages, setMessages] = useState<Message[]>([]);
    const { createConversation, setActiveId } = useConversationStore();
    const navigate = useNavigate();
    useEffect(() => {
        if (!conversationId) {
            setMessages([]);
            return;
        };
        setIsLoading(true);
        getAllMessages(conversationId)
            .then((data) => {
                setMessages(data);
                setIsLoading(false);
            })
    }, [conversationId])

    async function sendMessage(content: string) {
        let currentId = conversationId;
        if (!currentId) {
            currentId = createConversation('New Chat');
            setActiveId(currentId)
            navigate(`/conversation/${currentId}`)
        }
        const newMessage: Message = {
            id: crypto.randomUUID(),
            role: 'user',
            content: [
                {
                    type: 'text',
                    text: content
                }
            ],
            timestamp: Date.now(),
            deepThinking: false,
            conversationId: currentId
        }
        setMessages(prev => [...prev, newMessage]);
        await addMessage(newMessage);
    }


    return {
        messages,
        loading,
        sendMessage,
    }
}

export default useChat;