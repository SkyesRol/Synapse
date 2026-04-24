import { useState, useEffect, useRef } from 'react'
import { Message, TextContent, ThinkingContent } from '../types/conversation'
import { addMessage, getAllMessages } from '../services/conversationService'
import { useConversationStore } from '../store/useConversationStore'
import { useAssistantStore } from '../store/useAssistantStore'
import { useNavigate } from 'react-router-dom'
import { ModelMessages } from '@/shared/types'

interface UseChatReturn {
    messages: Message[];
    loading: boolean;
    sendMessage: (content: string) => Promise<void>;
}
const useChat = (conversationId: string | undefined, assistantId: string | undefined): UseChatReturn => {
    const [loading, setIsLoading] = useState<boolean>(false);
    const [messages, setMessages] = useState<Message[]>([]);
    const { createConversation, setActiveId } = useConversationStore();
    const { activeAssistantId, activeAssistant } = useAssistantStore();
    const navigate = useNavigate();
    // 优先用传入的 assistantId，fallback 到 store
    const resolvedAssistantId = assistantId ?? activeAssistantId ?? undefined;
    const contentRef = useRef<string>('');
    const thinkingRef = useRef<string>('');
    const conversationIdRef = useRef<string | undefined>(conversationId);
    const [currentThinking, setCurrentThinking] = useState<string>('');
    const [currentContent, setCurrentContent] = useState<string>('');
    useEffect(() => {
        conversationIdRef.current = conversationId
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
        if (!activeAssistant) {
            console.log('No active assistant');
            return;
        }
        let currentId = conversationId;
        let { modelId, temperature, maxTokens, topP, stream } = activeAssistant?.modelConfig;
        let callConfig = {
            modelId,
            temperature,
            maxTokens,
            topP,
            stream,
            apiKey: import.meta.env.VITE_MINIMAX_APIKEY,
            baseUrl: import.meta.env.VITE_MINIMAX_BASEURL
        }
        if (!currentId) {
            if (!resolvedAssistantId) {
                console.warn('Cannot send message: no conversationId or assistantId');
                return;
            }
            currentId = createConversation(resolvedAssistantId);
            setActiveId(currentId)
            conversationIdRef.current = currentId;
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
            conversationId: currentId
        }
        setMessages(prev => [...prev, newMessage]);
        await addMessage(newMessage);
        const modelMessages: ModelMessages = [
            { role: 'system', content: activeAssistant.systemPrompt },
            ...[...messages, newMessage].flatMap(msg => {
                const text = msg.content.filter(content => content.type === 'text')
                    .map(content => (content as TextContent).text)
                    .join('')
                if (!text) return [];
                return [{ role: msg.role, content: text }]
            })
        ]
        window.electronAPI.sendMessage(callConfig, modelMessages, currentId)
    }


    useEffect(() => {
        const unsubscribe = window.electronAPI.onStreamEvent((event) => {
            switch (event.type) {
                case 'thinking':
                    thinkingRef.current += event.content
                    setCurrentThinking(thinkingRef.current)
                    break;
                case 'content':
                    contentRef.current += event.content
                    setCurrentContent(contentRef.current)
                    break;
                case 'done':
                    const assistantMessage: Message = {
                        id: crypto.randomUUID(),
                        role: 'assistant',
                        content: [
                            ...(thinkingRef.current ? [{ type: 'thinking' as const, text: thinkingRef.current }] : []),
                            { type: 'text' as const, text: contentRef.current }
                        ],
                        timestamp: Date.now(),
                        conversationId: conversationIdRef.current!
                    }
                    setMessages(prev => [...prev, assistantMessage]);
                    addMessage(assistantMessage);
                    setCurrentThinking('')
                    setCurrentContent('')
                    contentRef.current = '';
                    thinkingRef.current = '';
                    break;
                case 'error':
                    console.error(event.message)
                    setCurrentThinking('')
                    setCurrentContent('')
                    contentRef.current = '';
                    thinkingRef.current = '';
                    break;
            }
        })

        return unsubscribe
    }, [])




    return {
        messages,
        loading,
        sendMessage,
    }
}

export default useChat;