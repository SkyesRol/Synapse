import React from 'react';
import styled from 'styled-components';
import {
  Sparkles,
  Code2,
  PenTool,
  BarChart3,
  Languages,
  GraduationCap,
  Palette,
  KanbanSquare,
  Megaphone,
  CheckCircle2,
  Swords,
  LucideIcon
} from 'lucide-react';

// -----------------------------------------------------------------------------
// Type Definitions
// -----------------------------------------------------------------------------

export type AvatarId = 
  | 'general' 
  | 'coding' 
  | 'creative' 
  | 'data' 
  | 'language' 
  | 'academic' 
  | 'design' 
  | 'product' 
  | 'marketing' 
  | 'life' 
  | 'debate';

interface AvatarConfigItem {
  icon: LucideIcon;
  bg: string;
  color: string;
}

// -----------------------------------------------------------------------------
// Icon Configuration Map
// -----------------------------------------------------------------------------
// Maps internal IDs to Lucide components and colors
// Background colors are hex codes derived from Tailwind classes

export const avatarConfig: Record<AvatarId, AvatarConfigItem> = {
  general: {
    icon: Sparkles,
    bg: '#fef9c3',
    color: '#ca8a04',
  },
  coding: {
    icon: Code2,
    bg: '#dbeafe',
    color: '#2563eb',
  },
  creative: {
    icon: PenTool,
    bg: '#f3e8ff',
    color: '#9333ea',
  },
  data: {
    icon: BarChart3,
    bg: '#dcfce7',
    color: '#16a34a',
  },
  language: {
    icon: Languages,
    bg: '#ccfbf1',
    color: '#0d9488',
  },
  academic: {
    icon: GraduationCap,
    bg: '#e0e7ff',
    color: '#4f46e5',
  },
  design: {
    icon: Palette,
    bg: '#fce7f3',
    color: '#db2777',
  },
  product: {
    icon: KanbanSquare,
    bg: '#ffedd5',
    color: '#ea580c',
  },
  marketing: {
    icon: Megaphone,
    bg: '#fee2e2',
    color: '#dc2626',
  },
  life: {
    icon: CheckCircle2,
    bg: '#ecfccb',
    color: '#65a30d',
  },
  debate: {
    icon: Swords,
    bg: '#e2e8f0',
    color: '#334155',
  },
};

// -----------------------------------------------------------------------------
// Styled Components
// -----------------------------------------------------------------------------

interface SvgContainerProps {
  size?: string | number;
}

const SvgContainer = styled.svg<SvgContainerProps>`
  display: block;
  /* Default size, can be overridden by props */
  width: ${props => props.size || '32px'};
  height: ${props => props.size || '32px'};
`;

// -----------------------------------------------------------------------------
// Component Implementation
// -----------------------------------------------------------------------------

export interface AssistantAvatarProps {
  id: string; // We allow string to handle potential dynamic IDs, but ideally it matches AvatarId
  size?: string | number;
  className?: string;
}

/**
 * AssistantAvatar
 * 
 * Renders a complete SVG avatar with a colored rounded background and a centered icon.
 * This component is self-contained and can be exported as an image if needed.
 */
const AssistantAvatar: React.FC<AssistantAvatarProps> = ({ id, size = '32px', className }) => {
  const config = avatarConfig[id as AvatarId];

  if (!config) {
    console.warn(`AssistantAvatar: Unknown id "${id}". Rendering fallback.`);
    return null; // Or render a fallback gray box
  }

  const { icon: IconComponent, bg, color } = config;

  // STRATEGY:
  // Instead of complex SVG nesting, we'll create a simple SVG where:
  // 1. <rect> is the background
  // 2. We render the Lucide Icon inside a <g> translated to center it.

  return (
    <SvgContainer
      viewBox="0 0 32 32"
      size={size}
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* 1. Background Rounded Rect */}
      <rect
        x="0"
        y="0"
        width="32"
        height="32"
        rx="8"
        ry="8"
        fill={bg}
      />

      {/* 2. Icon Content 
          Lucide icons are usually 24x24 on a 24x24 viewBox.
          We want to center a roughly 18px-20px icon in our 32px box.
          
          If we scale the 24x24 icon to 18x18:
          Scale factor = 18/24 = 0.75
          
          Centering:
          (32 - 18) / 2 = 7px offset
      */}
      <g transform="translate(7, 7) scale(0.75)">
        <IconComponent
          color={color}
          size={24} // Render at native size, then scaled by <g>
          strokeWidth={2.5} // Slightly thicker to match small scale
        />
      </g>
    </SvgContainer>
  );
};

// -----------------------------------------------------------------------------
// Selector Component
// -----------------------------------------------------------------------------

const GridContainer = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  padding: 0.5rem;
`;

interface SelectableItemProps {
  $isSelected: boolean;
  $activeColor: string;
}

const SelectableItem = styled.div<SelectableItemProps>`
  cursor: pointer;
  border-radius: 12px;
  border: 2px solid ${props => props.$isSelected ? props.$activeColor : 'transparent'};
  transition: all 0.2s;
  display: flex;
  justify-content: center;
  align-items: center;
  width: fit-content;
  height: fit-content;

  &:hover {
    background-color: #f3f4f6;
  }
`;

export interface AvatarSelectorProps {
  selectedId: string;
  onSelect?: (id: string) => void;
}

/**
 * AvatarSelector
 * 
 * Renders a grid of all available avatars for user selection.
 */
export const AvatarSelector: React.FC<AvatarSelectorProps> = ({ selectedId, onSelect }) => {
  return (
    <GridContainer>
      {(Object.entries(avatarConfig) as [AvatarId, AvatarConfigItem][]).map(([id, config]) => (
        <SelectableItem
          key={id}
          $isSelected={selectedId === id}
          $activeColor={config.color}
          onClick={() => onSelect && onSelect(id)}
          title={id} // Tooltip showing the ID
        >
          <AssistantAvatar id={id} size="40px" />
        </SelectableItem>
      ))}
    </GridContainer>
  );
};

export default AssistantAvatar;
