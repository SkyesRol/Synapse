import { MessageCircle, Hammer, Settings, MessageSquare, Image } from "lucide-react";

export const NAV_ITEMS = [
    {
        id: 'chat',
        label: 'Conversations',
        icon: MessageCircle,
        path: '/',
    },
    {
        id: 'market',
        label: 'MCP Market',
        icon: Hammer,
        path: '/market'
    },
    {
        id: 'settings',
        label: 'Settings',
        icon: Settings,
        path: '/settings'
    }
]


export const HISTORY_ITEMS = [
    {
        id: '',
        topic: '',
        icon: MessageSquare,
        path: ''
    }
]