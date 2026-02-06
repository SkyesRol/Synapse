import { LucideIcon } from "lucide-react"
import styled from "styled-components";
export type NavItemProps = {
    icon: LucideIcon;
    label: string;
    isActive: boolean;
    onClick: () => void;
}


const ItemContainer = styled.div<{ $isActive: boolean }>`
    display:flex;
    flex-direction:row;
    align-items:center;
    gap:12px;
    color:${props => props.$isActive ? 'rgb(74,74,74)' : 'rgb(102,102,102)'};
    background-color:${props => props.$isActive ? 'rgb(230, 230, 230)' : 'transparent'};
    border-radius:12px;
    height:40px;
    padding:10px 16px;
    &:hover{
       cursor:pointer;
       background-color: ${props => props.$isActive ? 'rgb(230, 230, 230)' : 'rgb(245,245,245)'};
    }
`
const Label = styled.div`
    font-size:14px;
    font-weight:500;
    line-height:20px;
`
const NavItem: React.FC<NavItemProps> = ({
    icon: Icon,
    label,
    isActive,
    onClick
}) => {
    return (
        <ItemContainer
            $isActive={isActive}
            onClick={onClick} >
            <Icon size={18} />
            <Label>{label}</Label>
        </ItemContainer>
    )
}

export default NavItem;