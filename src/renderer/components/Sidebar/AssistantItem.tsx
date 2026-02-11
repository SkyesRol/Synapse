import AssistantAvatar from '@/assets/AssistantAvatar'
import { Settings2 } from 'lucide-react';
import { useState } from 'react';
import styled from 'styled-components';
import { AssistantSettingsModal } from '../Modals/AssistantSettingsModal';

interface AssistantItemProps {
    id: string;
    name: string;
    avatarId: string;
}


const Container = styled.div`
    display:flex;
    align-items:center;
    gap:12px;
    padding:10px 16px;
    background:rgb(245,245,245);
    border-radius:12px;
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

export const AssistantItem: React.FC<AssistantItemProps> = ({ id, name, avatarId }) => {
    const [isShowSettings, setIsShowSettings] = useState<boolean>(false);

    return (
        <Container>
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