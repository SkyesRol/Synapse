// Update Assistant
import React from 'react';
import styled from 'styled-components';
import { GlobalModal } from './GlobalModal';
import AssistantAvatar from '@/assets/AssistantAvatar';
import { useState, useRef } from 'react';
import { Box } from 'lucide-react';
import { SliderTrack } from '../SliderTrack';
import { StreamResponse } from '../StreamResponse';
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
const BodyContainer = styled.div`
    display:flex;
    flex-direction:column;
    gap:10px;
    padding:24px;
`
const ModelSelection = styled.div`
    display:flex;
    flex-direction:column;
    justify-content:flex-start;
    gap:8px;
`
const Label = styled.div`
    font-size:14px;
    font-weight:500;
    line-height:20px;
    color:rgba(26,26,26,1)
`
const ModelSelectionInput = styled.input`
    display:inline-block;
    flex-direction:row;
    align-items:center;
    padding: 0 12px 0 40px;
    font-size:14px;
    font-weight:400;
    line-height:20px;
    color:rgba(74,74,74,1);
    background-color:rgb(255,255,255)
    border:1px solid rgba(225, 225, 225, 1);
    border-radius:8px;
`
const TemperatureAdjustment = styled.div`
    display:flex;
    gap:10px;
    flex-direction:column;
`

const DetailInfos = styled.div`
    display:flex;
    justify-content:space-between;
    align-items:center;
`


const ValueBadge = styled.div`
    display:block;
    padding:2px 8px;
    height:20px;
    font-family: ui-monospace;
    font-size:12px;
    font-weight:400;
    line-height:16px;
    color:rgba(74,74,74,1);
    background-color:rgb(245,245,245);
    border-radius:4px;
`

const MaxTokenLimit = styled.div`
    display:flex;
    gap:10px;
    flex-direction:column;
`
const VocabularyRange = styled.div`
    display:flex;
    gap:10px;
    flex-direction:column;
`
const SystemPrompt = styled.div`
    display:flex;
    gap:10px;
    flex-direction:column;
`
const InputArea = styled.textarea`
    display:inline-block;
    width:430px;
    height:120px;
    padding:10px 12px;
    font-family:Inter,sans-serif;
    font-size:14px;
    font-weight:400;
    line-height:20;
    color:rgb(74,74,74);
    border-radius:12px;
    border:0.66px solid rgb(74,74,74);
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
    const [temperature, setTemperature] = useState<number>(0.7);
    const [tokenCounts, setTokenCounts] = useState<number>(4096);
    const [top_P, setTop_P] = useState<number>(1);
    const [prompt, setPrompt] = useState<string>();
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    function handleStream() {
        return isStream ? setIsStream(false) : setIsStream(true)
    }
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
                    <ModelSelectionInput>
                        <Box size={16} />
                    </ModelSelectionInput>
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
                    <SliderTrack min={0} max={1} step={0.1} value={temperature} onChange={setTemperature} />
                </TemperatureAdjustment>
                <MaxTokenLimit>
                    <DetailInfos>
                        <Label>
                            Max Response Length
                        </Label>
                        <ValueBadge>
                            {tokenCounts} tokens
                        </ValueBadge>
                    </DetailInfos>
                    <SliderTrack min={1} max={4096} step={128} value={tokenCounts} onChange={setTokenCounts} />
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
                    <SliderTrack min={0} max={1} step={0.1} value={top_P} onChange={setTop_P} />
                </VocabularyRange>
                <SystemPrompt>
                    <DetailInfos>
                        <Label>
                            System Prompt
                        </Label>
                    </DetailInfos>
                    <InputArea value={prompt} onChange={() => setPrompt(textareaRef.current?.value)} ref={textareaRef} />
                </SystemPrompt>
                <StreamResponse onToggle={handleStream} isStream={isStream} />
            </BodyContainer>
        </GlobalModal>
    )
}
