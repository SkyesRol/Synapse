import styled from 'styled-components'
import { Waves } from 'lucide-react'
import { Switch } from './Switch'

const Container = styled.div`
    display:flex;
    justify-content:space-between;
    align-items:center;
    padding:12px;
    border-radius:12px;
    background-color:rgb(250,250,250);
    border: 1px solid rgb(238,238,238);
`
const Infos = styled.div`
    display:flex;
    gap:12px;
    align-items:center;

`
const Icon = styled.div`
    display:flex;
    justify-content:center;
    align-items:center;
    width:32px;
    height:32px;
    background-color:rgb(255,255,255);
    border:1px solid rgb(238,238,238);
    border-radius:8px;
`
const Details = styled.div`
    display:flex;
    flex-direction:column;
    justify-content:flex-start;
    gap:5px;
`
const Title = styled.div`
    font-family: Inter,sans-serif;
    font-size:14px;
    font-weight:500;
    line-height:20px;
    color:rgb(26,26,26);
`
const Descriptions = styled.div`
    font-family: Inter,sans-serif;
    font-size:10px;
    font-weight:400;
    line-height:15px;
    color:rgb(153,153,153);
`
interface StreamResponseProps {
    isStream: boolean;              // 接收当前状态
    onToggle: (val: boolean) => void; // 接收变更回调 (建议用标准的 onToggle 或 onChange)
}

export const StreamResponse: React.FC<StreamResponseProps> = ({ isStream, onToggle }) => {


    return (
        <Container>
            <Infos>
                <Icon>
                    <Waves size={16} />
                </Icon>
                <Details>
                    <Title>
                        Stream Response
                    </Title>
                    <Descriptions>
                        Show tokens as they are generated
                    </Descriptions>
                </Details>
            </Infos>
            <Switch onChange={onToggle} checked={isStream} />
        </Container>
    )
}