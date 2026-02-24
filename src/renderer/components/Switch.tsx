import React from 'react';
import styled from 'styled-components';
import { motion } from 'framer-motion';

// -----------------------------------------------------------------------------
// Props
// -----------------------------------------------------------------------------
interface SwitchProps {
    checked: boolean;
    onChange: (checked: boolean) => void;
    disabled?: boolean;
}

// -----------------------------------------------------------------------------
// Styles
// -----------------------------------------------------------------------------

// 容器：控制背景色和形状
const Container = styled.div<{ $checked: boolean; $disabled?: boolean }>`
  width: 44px;  /* 经典 iOS 风格尺寸 */
  height: 24px;
  background-color: ${props => props.$checked ? '#1a1a1a' : '#e0e0e0'}; /* 开=黑，关=灰 */
  border-radius: 12px; /* 高度的一半，形成胶囊形 */
  padding: 2px; /* 内边距，确保滑块不贴边 */
  cursor: ${props => props.$disabled ? 'not-allowed' : 'pointer'};
  opacity: ${props => props.$disabled ? 0.5 : 1};
  display: flex;
  align-items: center; /* 垂直居中 */
  /* 关键：利用 justify-content 控制初始位置，但为了动画流畅，我们主要靠 motion 的 x 属性 */
  justify-content: flex-start; 
  transition: background-color 0.2s ease; /* 背景色平滑过渡 */
  box-sizing: border-box;
`;

// 滑块：白色的圆
// 使用 motion.div 实现动画
const Handle = styled(motion.div)`
  width: 20px;
  height: 20px;
  background-color: white;
  border-radius: 50%;
  box-shadow: 0 1px 3px rgba(0,0,0,0.2); /* 微微的投影，增加立体感 */
`;

// -----------------------------------------------------------------------------
// Component
// -----------------------------------------------------------------------------
export const Switch: React.FC<SwitchProps> = ({ checked, onChange, disabled }) => {
    return (
        <Container
            $checked={checked}
            $disabled={disabled}
            onClick={() => !disabled && onChange(!checked)}
        >
            <Handle
                // Framer Motion 魔法
                layout // 开启布局动画
                transition={{
                    type: "spring",
                    stiffness: 700,
                    damping: 30
                }}
                // 根据状态控制位移：
                // 关: x = 0
                // 开: x = 20px (容器宽44 - 滑块宽20 - padding*2(4) = 20px)
                animate={{ x: checked ? 20 : 0 }}
            />
        </Container>
    );
};