import { MessageCircle, Hammer, Settings } from "lucide-react";

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


