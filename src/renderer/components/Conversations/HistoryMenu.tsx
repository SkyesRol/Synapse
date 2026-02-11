import styled from "styled-components"
import { useState } from "react"
import { useConversationStore } from "@/renderer/store/useConversationStore"
import { useNavigate } from "react-router-dom"
import HistoryItem from "./HistoryItem"


const Container = styled.div`
    display:flex;
    flex:1 0 0;
    flex-direction:column;
    position:absolute;
    z-index:20;
    min-width:340px;
    min-height:400px;
    max-width:500px;
    max-height:560px;
    top: 30px;
    right: 10px;
    background-color:rgb(255, 255, 255);
    border:1px solid rgb(238, 238, 238);
    border-radius:16px;
    box-shadow: 0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1);
    
`
const MenuHeader = styled.div`
    display:flex;
    justify-content:space-between;
    align-items:center;
    padding:16px;
    background-color:rgba(252, 252, 252, 1);
    border-radius:16px 16px 0 0;
`
const Text = styled.span`
    font-size:14px;
    font-weight:500;
    line-height:20px;
    color:rgb(74,74,74);
`
const MenuBody = styled.div`
    display:flex;
    flex-direction:column;
`
const HistorySection = styled.div`
    display:flex;
    flex-direction:column;
`
export default function HistoryMenu() {


    // ----------   Navigation -----------------------
    const navigate = useNavigate();
    function handleNavigate(path: string) {
        navigate(path);
    }
    // -----------------------------------------------
    // ------------------ Conversations --------------
    const showConversationList = useState<boolean>(true);
    const { conversations, activeId, setActiveId, deleteConversation } = useConversationStore();
    function handleTopicActivated(id: string) {
        setActiveId(id)
        handleNavigate(`/conversation/${id}`)
    }
    function handleDelete(id: string) {
        if (id === activeId) {
            const currentIndex = conversations.findIndex(c => c.id === id);
            let nextId = null;
            if (conversations.length > 1) {
                if (currentIndex === conversations.length - 1) {
                    nextId = conversations[currentIndex - 1].id;
                }
                else {
                    nextId = conversations[currentIndex + 1].id;
                }
            }
            if (nextId) {
                setActiveId(nextId);
                handleNavigate(`/conversation/${nextId}`)
            } else {
                setActiveId(null)
                handleNavigate('/')
            }
        }
        deleteConversation(id);

    }
    return (
        <Container>
            <MenuHeader>
                <Text>
                    History
                </Text>
            </MenuHeader>
            <MenuBody>
                {/* <SearchBar>

                </SearchBar> */}
                <HistorySection>
                    {showConversationList ?
                        conversations.map((item) => (
                            <HistoryItem
                                key={item.id}
                                topic={item.topic}
                                onClick={() => { handleTopicActivated(item.id) }}
                                isActive={item.id === activeId}
                                id={item.id}
                                onDelete={handleDelete}
                            />
                        )) : null
                    }
                </HistorySection>
            </MenuBody>
        </Container>
    )
}