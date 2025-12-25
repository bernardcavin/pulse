import { Stack, ActionIcon, Tooltip } from '@mantine/core';
import {
    IconPointer,
    IconZoomScan,
    IconRectangle,
    IconZoomIn,
    IconZoomOut
} from '@tabler/icons-react';

export type ToolMode = 'pick' | 'zoom-fit' | 'zoom-window' | 'zoom-in' | 'zoom-out' | null;

interface ViewerToolbarProps {
    activeTool: ToolMode;
    onToolChange: (tool: ToolMode) => void;
}

export const ViewerToolbar: React.FC<ViewerToolbarProps> = ({ activeTool, onToolChange }) => {
    return (
        <Stack
            gap="xs"
            style={{
                position: 'absolute',
                left: 10,
                top: '50%',
                transform: 'translateY(-50%)',
                backgroundColor: 'white',
                padding: '8px',
                borderRadius: '8px',
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
                zIndex: 1000
            }}
        >
            <Tooltip label="Pick Trace" position="right" withArrow>
                <ActionIcon
                    variant={activeTool === 'pick' ? 'filled' : 'default'}
                    color={activeTool === 'pick' ? 'blue' : 'gray'}
                    size="lg"
                    onClick={() => onToolChange(activeTool === 'pick' ? null : 'pick')}
                >
                    <IconPointer size={18} />
                </ActionIcon>
            </Tooltip>

            <Tooltip label="Zoom to Fit" position="right" withArrow>
                <ActionIcon
                    variant="default"
                    color="gray"
                    size="lg"
                    onClick={() => onToolChange('zoom-fit')}
                >
                    <IconZoomScan size={18} />
                </ActionIcon>
            </Tooltip>

            <Tooltip label="Window Zoom" position="right" withArrow>
                <ActionIcon
                    variant={activeTool === 'zoom-window' ? 'filled' : 'default'}
                    color={activeTool === 'zoom-window' ? 'blue' : 'gray'}
                    size="lg"
                    onClick={() => onToolChange(activeTool === 'zoom-window' ? null : 'zoom-window')}
                >
                    <IconRectangle size={18} />
                </ActionIcon>
            </Tooltip>

            <Tooltip label="Zoom In" position="right" withArrow>
                <ActionIcon
                    variant="default"
                    color="gray"
                    size="lg"
                    onClick={() => onToolChange('zoom-in')}
                >
                    <IconZoomIn size={18} />
                </ActionIcon>
            </Tooltip>

            <Tooltip label="Zoom Out" position="right" withArrow>
                <ActionIcon
                    variant="default"
                    color="gray"
                    size="lg"
                    onClick={() => onToolChange('zoom-out')}
                >
                    <IconZoomOut size={18} />
                </ActionIcon>
            </Tooltip>
        </Stack>
    );
};
