import React from 'react';
import ReactDOM from 'react-dom';
import styled from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';

interface ModalStyleProps {
    $width?: string;
    $height?: string;
}

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    title?: React.ReactNode;
    children: React.ReactNode;
    footer?: React.ReactNode;
    width?: string;
    height?: string;
}

const Overlay = styled(motion.div)`
    top:0;
    left:0;
    position:fixed;
    width:100vw;
    height:100vh;
    background:rgba(255, 255, 255, 0.85);
    backdrop-filter:blur(1px);
    z-index:1000;
    display:flex;
    align-items:center;
    justify-content:center;
`

const Content = styled(motion.div) <ModalStyleProps>`
    width: ${props => props.$width || '420px'};
    height: ${props => props.$height || 'auto'};
    max-height: 90vh;
    display:flex;
    flex-direction:column;
    background-color:rgb(255,255,255);
    border:1px solid rgb(238,238,238);
    border-radius:16px;
    box-shadow: rgba(0, 0, 0, 0.1) 0 20px 25px -5px, rgba(0, 0, 0, 0.1) 0 8px 10px -6px;
    overflow: hidden;
`

const Header = styled.div`
    display:flex;
    justify-content:space-between;
    align-items:center;
    padding:24px;
    flex-shrink: 0;
`

const Title = styled.div`
    font-size:18px;
    font-weight:700;
    line-height:28px;
    color:rgb(26,26,26);
`

const DotLine = styled.div`
    width:100%;
    height:1px;
    background-color:#eeeeee;
    flex-shrink: 0;
`

const Body = styled.div`
    padding:24px;
    flex: 1;
    overflow-y: auto;
`

const Footer = styled.div`
    padding: 16px 24px;
    border-top: 1px solid #eeeeee;
    display: flex;
    justify-content: flex-end;
    gap: 12px;
    background-color: #fafafa;
    flex-shrink: 0;
`

export const GlobalModal: React.FC<ModalProps> = ({
    isOpen,
    onClose,
    title,
    children,
    footer,
    width,
    height
}) => {
    return ReactDOM.createPortal(
        <AnimatePresence>
            {isOpen && (
                <Overlay
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={onClose}
                >
                    <Content
                        $width={width}
                        $height={height}
                        initial={{ scale: 0.95, opacity: 0, y: 20 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.95, opacity: 0, y: 20 }}
                        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        {title && (
                            <>
                                <Header>
                                    {typeof title === 'string' ? <Title>{title}</Title> : title}
                                    <X onClick={onClose} style={{ cursor: 'pointer' }} size={20} />
                                </Header>
                                <DotLine />
                            </>
                        )}
                        <Body>{children}</Body>
                        {footer && (
                            <Footer>
                                {footer}
                            </Footer>
                        )}
                    </Content>
                </Overlay>
            )}
        </AnimatePresence>,
        document.body
    );
}
