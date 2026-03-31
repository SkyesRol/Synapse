// Delete Assistant
import AssistantAvatar from '@/assets/AssistantAvatar'
import { Settings2 } from 'lucide-react';
import { useState } from 'react';
import styled from 'styled-components';
import { AssistantSettingsModal } from '../Modals/AssistantSettingsModal';
import { useNavigate } from 'react-router-dom';
import { useAssistantStore } from '@/renderer/store/useAssistantStore';
import { useConversationStore } from '@/renderer/store/useConversationStore';

interface AssistantItemProps {
    id: string;
    name: string;
    avatarId: string;
    isActive: boolean;
}


const Container = styled.div<{ $isActive: boolean }>`
    display:flex;
    align-items:center;
    gap:12px;
    padding:10px 16px;
    background:${props => props.$isActive ? 'rgb(240, 240, 240)' : 'transparent'};
    border-radius:12px;
    cursor:pointer;
`
const Name = styled.div`
    font-size:14px;
    font-weight:500;
    line-height:20px;
    color:rgb(74,74,74);
    text-align:start;
    flex: 1;
`
const IconWrapper = styled.div`
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    color: rgb(150, 150, 150);
    &:hover {
        color: rgb(50, 50, 50);
    }
`

export const AssistantItem: React.FC<AssistantItemProps> = ({ id, name, avatarId, isActive }) => {
    const [isShowSettings, setIsShowSettings] = useState<boolean>(false);
    const navigate = useNavigate();
    const { setActiveAssistantId } = useAssistantStore();
    const { conversations, setActiveId } = useConversationStore();

    function handleClick() {
        setActiveAssistantId(id);
        // 找到该 Assistant 最近的一次对话
        const latestConv = conversations
            .filter(c => c.assistantId === id)
            .sort((a, b) => b.updatedAt - a.updatedAt)[0];
        if (latestConv) {
            setActiveId(latestConv.id);
            navigate(`/conversation/${latestConv.id}`);
        } else {
            setActiveId(null);
            navigate('/');
        }
    }

    return (
        <Container $isActive={isActive} onClick={handleClick}>
            <AssistantAvatar id={avatarId} size={32} />
            <Name>
                {name}
            </Name>
            <IconWrapper onClick={(e) => {
                e.stopPropagation();
                setIsShowSettings(true)
            }}>
                <Settings2 size={18} />
            </IconWrapper>
            < AssistantSettingsModal
                isOpen={isShowSettings}
                onClose={() => setIsShowSettings(false)}
                avatarId={avatarId}
                id={id}
                name={name} />
        </Container>
    )
}