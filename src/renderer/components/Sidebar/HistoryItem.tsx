import { MessageSquare, Trash, X } from "lucide-react";
import styled from "styled-components";
import { useEffect, useState } from "react";
export type HistoryItemProps = {
    topic: string,
    isActive: boolean,
    onClick: () => void,
    id: string,
    onDelete: (id: string) => void
}

const Container = styled.div<{ $isActive: boolean }>`
    display:flex;
    align-items:center;
    padding: 8px 16px;
    border-radius:8px;
    gap:10px;
    background-color:${props => props.$isActive ? 'rgb(230, 230, 230)' : 'transparent'};
     &:hover{
       cursor:pointer;
       background-color: ${props => props.$isActive ? 'rgb(230, 230, 230)' : 'rgb(245,245,245)'};
    }
`


const SummaryText = styled.div`
    font-size:14px;
    font-weight:400;
    line-height:20px;
    color:rgb(74,74,74);
    text-align:start;
    text-overflow:ellipsis;
    white-space:nowrap;
    overflow:hidden;
    flex:1;
    //min-width:0;
`


const HistoryItem: React.FC<HistoryItemProps> = (
    { topic,
        onClick,
        isActive,
        id,
        onDelete }) => {
    const [confirmDelete, setConfirmDelete] = useState<boolean>(false);


    function handleConfirm(e: React.MouseEvent) {
        e.stopPropagation();
        setConfirmDelete(true);

    }

    function handleDelete(e: React.MouseEvent) {
        e.stopPropagation();
        onDelete(id);

    }

    useEffect(() => {
        let timer: NodeJS.Timeout;
        if (confirmDelete) {
            timer = setTimeout(() => {
                setConfirmDelete(false)
            }, 3000)
        }
        return () => clearTimeout(timer)
    }, [confirmDelete])



    return (
        <Container onClick={onClick} $isActive={isActive}>
            <MessageSquare size={12} />
            <SummaryText>
                {topic}
            </SummaryText>

            {
                isActive && !confirmDelete ? <X size={12} onClick={handleConfirm} /> : null
            }
            {
                isActive && confirmDelete ? <Trash size={12} onClick={handleDelete} /> : null
            }
        </Container>
    )



}

export default HistoryItem;