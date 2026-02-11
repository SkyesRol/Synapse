import styled from "styled-components";
import { Plus } from 'lucide-react';


const Container = styled.div`
    display:flex;
    justify-content:space-between;
    align-items:center;
    padding:10px 16px;
    border:1px solid rgb(238,238,238);
    border-radius:12px;
    &:hover{
       cursor:pointer;
       background-color: rgb(230, 230, 230);
    }
`
const Text = styled.div`
    font-size:16px;
    font-weight:400;
    line-height:24px;
    color:rgb(0,0,0);
    text-align:center;
`
export type NewAssistantProps = {
    onClick: () => void
}


const NewAssistant: React.FC<NewAssistantProps> = ({ onClick }) => {


    return (
        <Container onClick={onClick}>
            <Text>
                New assistant
            </Text>
            <Plus size={16} />
        </Container>
    )

}

export default NewAssistant;