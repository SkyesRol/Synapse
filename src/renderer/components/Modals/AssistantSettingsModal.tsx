import React from 'react';
import styled from 'styled-components';
import { GlobalModal } from './GlobalModal';
import AssistantAvatar from '@/assets/AssistantAvatar';
import { useState } from 'react';
interface AssistantSettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
    avatarId: string;
    name: string;
    id: string;
}

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
const AvatarContainer = styled.div`
    display:flex;
    gap:16px;
`
const Assistant_SettingsName = styled.div`
    font-size:18px;
    font-weight:700;
    line-height:28px;
    color:rgb(26,26,26);
`

export const AssistantSettingsModal: React.FC<AssistantSettingsModalProps> = ({ isOpen, onClose, avatarId, name, id }) => {

    const assistantHeader = (
        <AvatarContainer>
            <AssistantAvatar id={avatarId} size={40} />
            <Assistant_SettingsName>
                {name}
            </Assistant_SettingsName>
        </AvatarContainer>
    )

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

    const [isStream, setIsStream] = useState<boolean>(true);

    return (
        <GlobalModal
            isOpen={isOpen}
            onClose={onClose}
            title={assistantHeader}
            footer={footerContent}
            width='480px'
            height='632px'
        >
            <BodyContainer>

                <ModelSelection>
                    <Label>
                        Model
                    </Label>
                    <ModelSelectionInput />
                </ModelSelection>
                <TemperatureAdjustment>
                    <DetailInfos>
                        <Label>
                            Temperature
                        </Label>
                        <ValueBadge>
                            {temperature}
                        </ValueBadge>
                    </DetailInfos>
                    <SliderTrack />
                </TemperatureAdjustment>
                <MaxTokenLimit>
                    <DetailInfos>
                        <Label>
                            Max Content
                        </Label>
                        <ValueBadge>
                            {tokenCount} tokens
                        </ValueBadge>
                        <SliderTrack />
                    </DetailInfos>
                </MaxTokenLimit>
                <VocabularyRange>
                    <DetailInfos>
                        <Label>
                            Vocabulary Range (Top P)
                        </Label>
                        <ValueBadge>
                            {top_P}
                        </ValueBadge>
                    </DetailInfos>
                </VocabularyRange>
                <StreamResponse onClick={() => isStream ? setIsStream(false) : setIsStream(true)} />
            </BodyContainer>
        </GlobalModal>
    )
}
