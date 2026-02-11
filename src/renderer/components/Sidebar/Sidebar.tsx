import { NAV_ITEMS as navItems } from "./config";
import styled from "styled-components";
import { useLocation, useNavigate } from 'react-router-dom'
import NavItem from "./NavItem";
import { SiGooglegemini } from '@icons-pack/react-simple-icons';
import { useState } from "react";
import NewAssistant from './NewAssistant'
import { CreateAssistantModal } from "../Modals/CreateAssistantModal";

const Container = styled.div`
    display:flex;
    flex-direction:column;
    height:100vh;
    min-width:280px;
    max-width:330px;
    background-color:rgb(252, 252, 252);
    border-right:1px solid #e0e0e0;
    padding:16px;
    gap:24px;
    flex:1
`

const SideBarHeader = styled.div`
    display:flex;
    gap:12px;
    align-items:center;
`
const Logo = styled.div`
    width:40px;
    height:40px;
    display:flex;
    align-items:center;
    justify-content:center;
`
const Name = styled.div`
    font-size:20px;
    font-weight:400;
    line-height:28px;
    color:rgb(74,74,74);
`
const NavigationMenu = styled.div`
    display:flex;
    flex-direction:column;
    gap:5px;
`
const DotLine = styled.div`
    width:100%;
    height:1px;
    background-color:#eeeeee;
`
const ConversationHistory = styled.div`
    display:flex;
    flex-direction:column;
    gap:30px;
`
const Assistants = styled.div`
    display:flex;
    flex-direction:column;
    gap:10px;
`

const Label = styled.div`
    display:block;
    padding: 0 16px;
    font-size:11px;
    font-weight:500;
    color:rgb(153,153,153);
    text-align:start;
    letter-spacing:0.1rem; /* 增加部分字间距 */
`
const AssistantsMenu = styled.div`
    display:flex;
    flex-direction:column;
    gap:5px;
`

function Sidebar() {
    // ----------   Navigation -----------------------
    const location = useLocation();
    const navigate = useNavigate();
    function handleNavigate(path: string) {
        navigate(path);
    }
    // -----------------------------------------------
    const [isCreatingAssistant, setIsCreatingAssistant] = useState<boolean>(false);
    function handleNewAssistant() {
        setIsCreatingAssistant(true);
    }
    return (
        <Container>
            <SideBarHeader>
                <Logo>
                    <SiGooglegemini size={32} />
                </Logo>
                <Name>
                    Synapse
                </Name>
            </SideBarHeader>
            <NavigationMenu>
                {
                    navItems.map((item) => (
                        <NavItem
                            key={item.id}
                            icon={item.icon}
                            label={item.label}
                            isActive={location.pathname === item.path}
                            onClick={() => handleNavigate(item.path)}
                        />
                    )

                    )
                }
            </NavigationMenu>
            <DotLine />

            <ConversationHistory>
                <NewAssistant onClick={handleNewAssistant} />
                <Assistants>
                    <Label>
                        ASSISTANTS
                    </Label>
                    <AssistantsMenu>

                    </AssistantsMenu>
                </Assistants>

            </ConversationHistory>
            <CreateAssistantModal
                isOpen={isCreatingAssistant}
                onClose={() => setIsCreatingAssistant(false)}
            />
            {/* <ModelSelector /> */}
        </Container>
    )
}

export default Sidebar;