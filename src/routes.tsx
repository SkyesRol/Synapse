import { createHashRouter as Router } from "react-router-dom";
import App from './renderer/App'
import Conversations from "./renderer/pages/Conversation/Conversations";
import MCPMarket from "./renderer/pages/Market/MCPMarket";
import Settings from "./renderer/pages/Settings/Settings";

const router = Router(
    [
        {
            path: '/',
            element: <App />,
            children: [
                {
                    index: true,
                    element: <Conversations />,
                },
                {
                    path: 'conversation/:conversationId',
                    element: <Conversations />,
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