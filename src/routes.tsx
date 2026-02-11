import { createHashRouter as Router } from "react-router-dom";
import App from './renderer/App'
import Conversations from "./renderer/pages/Conversation/Conversations";
import MCPMarket from "./renderer/pages/Market/MCPMarket";
import Settings from "./renderer/pages/Settings/Settings";
import { Chat } from "./renderer/pages/Chat/Chat";
const router = Router(
    [
        {
            path: '/',
            element: <App />,
            children: [
                {
                    index: true,
                    element: <Chat />,
                },
                {
                    path: 'conversation/:conversationId',
                    element: <Conversations />,
                },
                {
                    path: 'assistant/:assistantId',
                    element: <Conversations />
                },
                {
                    path: 'market',
                    element: <MCPMarket />,
                },
                {
                    path: 'settings',
                    element: <Settings />,
                },
            ]
        }
    ]
)

export default router;