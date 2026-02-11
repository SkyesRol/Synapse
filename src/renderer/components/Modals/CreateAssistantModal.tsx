import React, { useState } from 'react';
import styled from 'styled-components';
import { GlobalModal } from './GlobalModal';
import { AvatarSelector } from '@/assets/AssistantAvatar';

interface CreateAssistantModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const BodyContainer = styled.div`
    display:flex;
    flex-direction:column;
    gap:10px;
`
const AvatarSelection = styled.div`
    display:flex;
    flex-direction:column;
    gap:4px;
`
const NameInputSection = styled.div`
    display:flex;
    flex-direction:column;
    gap:4px;
`
const Text = styled.div`
    font-size:14px;
    font-weight:500;
    line-height:20px;
    color:rgb(26,26,26);
`
const NameInput = styled.input`
    display:inline-block;
    height:40px;
    width:100%;
    padding: 0 12px;
    font-size:14px;
    font-weight:400;
    line-height:20px;
    color:rgb(74,74,74);
    background-color:rgb(255,255,255);
    border:1px solid rgba(225, 225, 225, 1);
    border-radius:8px;
    
    outline: none; /* 移除浏览器默认的 outline */
    transition: border-color 0.2s ease;

    &:focus {
        border-color: rgba(71, 71, 71, 1); /* 聚焦时边框变黑，呼应我们的单色风格 */
    }
`
const CancelButton = styled.button`
    padding:8px 16px;
    font-size:14px;
    font-weight:500;
    line-height:20px;
    color:rgb(26,26,26);
    text-align:center;
    background:transparent;
    border:none;
    cursor:pointer;
`
const CreateButton = styled.button`
    display:block;
    padding:8px 16px;
    font-size:14px;
    font-weight:500;
    line-height:20px;
    color:rgb(255,255,255);
    text-align:center;
    background-color:rgb(26,26,26);
    border-radius:8px;
    cursor:pointer;
`

export const CreateAssistantModal: React.FC<CreateAssistantModalProps> = ({ isOpen, onClose }) => {
    const [selectedIcon, setSelectedIcon] = useState('coding');

    const footerContent = (
        <>
            <CancelButton onClick={onClose}>
                Cancel
            </CancelButton>
            <CreateButton>
                Create Assistant
            </CreateButton>
        </>
    );

    return (
        <GlobalModal
            isOpen={isOpen}
            onClose={onClose}
            title='Create New Assistant'
            footer={footerContent}
        >
            <BodyContainer>
                <AvatarSelection>
                    <Text>
                        Avatar
                    </Text>

                    <AvatarSelector
                        selectedId={selectedIcon}
                        onSelect={(id: string) => setSelectedIcon(id)}
                    />
                </AvatarSelection>
                <NameInputSection>
                    <Text>
                        Name
                    </Text>
                    <NameInput placeholder="e.g., Minions-Bob" />

                </NameInputSection>
            </BodyContainer>
        </GlobalModal>
    )
}
