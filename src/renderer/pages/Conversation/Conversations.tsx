import { useParams } from "react-router-dom";
import useChat from "@/renderer/hooks/useChat";
import { useState } from "react";
import styled from 'styled-components';
import Navbar from "@/renderer/components/Conversations/Navbar";
export const Container = styled.div`
  display: flex;
  flex-direction: column;
  height: 100%;
  width:100%;
  background: #fff; /* 临时背景 */
`;

export const MessageList = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 16px;
`;

export const MessageItem = styled.div<{ $isUser: boolean }>`
  /* 思考：如何根据 $isUser 改变对齐方式？ */
  align-self: ${props => props.$isUser ? 'flex-end' : 'flex-start'};
  background: ${props => props.$isUser ? '#000' : '#f4f4f4'};
  color: ${props => props.$isUser ? '#fff' : '#000'};
  padding: 10px 16px;
  border-radius: 12px;
  max-width: 70%;
`;

export const InputArea = styled.div`
  padding: 20px;
  border-top: 1px solid #eee;
  display: flex;
  gap: 10px;
`;
const ChatContent = styled.div`
background:grey;
margin:0 auto;
height:100%;
width:100%;
`
function Conversations() {
    let params = useParams();
    let id = params.conversationId;
    const { messages, loading, sendMessage } = useChat(id);
    let [prompt, setPrompt] = useState<string>('');
    function handleValueChange(value: string) {
        setPrompt(value);
    }
    function handleSendMessage() {
        sendMessage(prompt);
        setPrompt('');
    }
    return (
        <Container>
            <Navbar conversationId={id} modelName="Claude Opus 4.6" />
            <ChatContent>
                {
                    loading ? <div> Loading~ </div> : <div> Not Loading~ </div>
                }
                Conversations Page:{id}
                <MessageList>
                    {
                        messages.map(message => (
                            <MessageItem key={message.id} $isUser={message.role === 'user'}>
                                <div>{message.role}</div>
                                <div>{message.content[0].type === 'text' ? message.content[0].text : ''}</div>
                            </MessageItem>
                        ))
                    }
                </MessageList>
                <InputArea>
                    <input type="text" value={prompt} onChange={(e) => handleValueChange(e.target.value)} />
                    <button onClick={() => handleSendMessage()}>发送信息</button>
                </InputArea>
            </ChatContent>
        </Container>
    )


}

export default Conversations;