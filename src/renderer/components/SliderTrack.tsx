import styled from "styled-components"
import { useRef } from "react";
import { ValueFix } from "@/shared/utils";
interface SliderProps {
    min?: number;
    max?: number;
    step?: number;
    value: number;
    onChange: (value: number) => void;
    width?: string;
}

const Container = styled.div<{ $width?: string }>`
    position:relative;
    width:${props => props.$width || '100%'};
    height:16px;
    display:flex;
    align-items:center;
    cursor: pointer;
    user-select: none; /* 防止拖拽时选中文字 */
    touch-action: none; /* 防止触摸时触发页面滚动 */
`
const Track = styled.div`
    position:relative;
    width:100%;
    height:4px;
    background-color: #eeeeee;
    border-radius:8px;
    overflow:visible;
`

const Thumb = styled.div<{ $percentage: number }>`
  position: absolute;
  left: ${props => props.$percentage}%;
  top: 50%;
  width: 16px;
  height: 16px;
  background-color: #1a1a1a;
  border-radius: 50%;
  transform: translate(-50%, -50%);
  transition: transform 0.1s ease;
  box-shadow: 0 0 0 2px #fff; /* 白色描边，增加对比度 */

  /* 增加悬停交互感 */
  ${Container}:hover & {
    transform: translate(-50%, -50%) scale(1.2);
  }
  
  /* 增加点击交互感 */
  ${Container}:active & {
    transform: translate(-50%, -50%) scale(1.1);
    background-color: #000;
  }
`;
export const SliderTrack: React.FC<SliderProps> = ({
    min = 0,
    max = 100,
    step = 10,
    value,
    onChange,
    width
}) => {

    const containerRef = useRef<HTMLDivElement>(null);
    const percentage = Math.min(100, Math.max(0, ((value - min) / (max - min)) * 100));


    const calculateValue = (clientX: number) => {
        if (!containerRef.current) return;
        const { left, width } = containerRef.current.getBoundingClientRect();
        let offsetX = clientX - left;
        if (offsetX < 0) offsetX = 0;
        if (offsetX > width) offsetX = width;
        const percentage = offsetX / width;
        let rawValue = min + (max - min) * percentage;
        let steppedValue = Math.round(rawValue / step) * step;
        steppedValue = ValueFix(steppedValue, step);
        // 7. 再次确保不越界 (因为 step 计算可能会导致微小的越界)
        steppedValue = Math.max(min, Math.min(max, steppedValue));

        // 8. 只有值改变时才触发 onChange (防止重复渲染)
        // 注意：这里直接调用 onChange，由父组件控制状态
        onChange(steppedValue);
    }


    const handleMouseDown = (e: React.MouseEvent | React.TouchEvent) => {
        const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
        calculateValue(clientX);

        const handleWindowMouseMove = (moveEvent: MouseEvent | TouchEvent) => {
            const moveClientX = 'touches' in e ? e.touches[0].clientX : (moveEvent as MouseEvent).clientX;
            calculateValue(moveClientX);
        }
        const handleWindowMouseUp = () => {
            // 移除监听器
            window.removeEventListener('mousemove', handleWindowMouseMove);
            window.removeEventListener('mouseup', handleWindowMouseUp);
            window.removeEventListener('touchmove', handleWindowMouseMove);
            window.removeEventListener('touchend', handleWindowMouseUp);
        };

        // 4. 添加监听器
        window.addEventListener('mousemove', handleWindowMouseMove);
        window.addEventListener('mouseup', handleWindowMouseUp);
        window.addEventListener('touchmove', handleWindowMouseMove, { passive: false });
        window.addEventListener('touchend', handleWindowMouseUp);
    }

    return (
        <Container $width={width} ref={containerRef} onMouseDown={handleMouseDown} onTouchStart={handleMouseDown}>
            <Track>
                <Thumb $percentage={percentage} />
            </Track>
        </Container>
    )
}