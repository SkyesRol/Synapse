import { History, Ellipsis, Plus } from "lucide-react"
import { useNavigate } from "react-router-dom";
import HistoryMenu from "./HistoryMenu";
import styled from "styled-components"
import { useConversationStore } from '@/renderer/store/useConversationStore';
import { useState, useRef } from "react";
import useClickOutside from "@/renderer/hooks/useClickOutside";
export type NavbarProps = {
    conversationId: string | undefined,
    assistantId: string | undefined,
    modelName: string,
}


const Container = styled.div`
    display:flex;
    align-items:center;
    justify-content:space-between;
    position:sticky;
    z-index:10;
    padding:0 32px;
    background-color:rgba(255,255,255, 0.8);
    height:64px;
    border-bottom:1px solid #eeeeee
`

const Topic_ModelName = styled.div`
    display:flex;
    align-items:center;
    gap:12px;
`
const Topic = styled.div`
 font-size:14px;
    font-weight:500;
    line-height:20px;
    color:rgb(74,74,74)
`
const ModelName = styled.div`
    display:flex;
    align-items:center;
    gap:6px;
    font-family: "Space Grotesk",sans-serif;
    font-size:12px;
    font-weight:500;
    line-height:16px;
    color:rgb(153,153,153);
`
const IconWrapper = styled.div`
    position:relative;
    display:flex;
    align-items:center;
    gap:12px;
`
const Navbar: React.FC<NavbarProps> = ({ conversationId, assistantId, modelName }) => {
    const navigate = useNavigate();
    const { conversations, createConversation, setActiveId } = useConversationStore();
    const currentConversation = conversations.find(conv => conv.id === conversationId);
    const topic = currentConversation?.topic || 'New Chat'
    const [isShowHistory, setIsShowHistory] = useState<boolean>(false);
    const containerRef = useRef<HTMLDivElement>(null);

    useClickOutside(containerRef, () => { setIsShowHistory(false) })

    function handleNewTopic() {
        if (assistantId) {
            const id = createConversation(assistantId)
            setActiveId(id);
            navigate(`/conversation/${id}`)
        } else {

            console.warn("Cannot create new topic: Assistant ID is missing");
        }
    }

    return (
        <Container>
            <Topic_ModelName>
                <Topic>
                    {topic}
                </Topic>
                <ModelName>
                    {modelName}
                </ModelName>
            </Topic_ModelName>
            <IconWrapper ref={containerRef}>
                <Plus size={18} onClick={handleNewTopic} style={{ cursor: 'pointer' }} />
                <History size={18} onClick={() => { setIsShowHistory(!isShowHistory) }}
                    style={{ cursor: 'pointer' }} />
                {
                    isShowHistory ? <HistoryMenu /> : null
                }
                <Ellipsis size={18} />
            </IconWrapper>
        </Container>
    )
}

export default Navbar;


