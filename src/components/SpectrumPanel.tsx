import { Paper, Group, CloseButton, ScrollArea, Title, Badge } from '@mantine/core';
import { IconChartLine } from '@tabler/icons-react';
import type { SpectrumResult } from '../utils/SignalProcessing';
import { SpectrumVisualization } from './SpectrumVisualization';

interface SpectrumPanelProps {
    spectrumData: SpectrumResult | null;
    isOpen: boolean;
    onClose: () => void;
    traceIndex: number | null;
    selection?: {
        traceStart: number;
        traceEnd: number;
        sampleStart: number;
        sampleEnd: number;
    } | null;
    activeSelections?: Array<{
        id: string;
        selection: { traceStart: number; traceEnd: number; sampleStart: number; sampleEnd: number };
        color: string;
        spectrumData?: SpectrumResult;
    }>;
}

export const SpectrumPanel: React.FC<SpectrumPanelProps> = ({
    spectrumData,
    isOpen,
    onClose,
    traceIndex,
    selection,
    activeSelections = []
}) => {
    const width = isOpen ? '450px' : '0px';
    const padding = isOpen ? 'md' : '0';
    const border = isOpen ? '1px solid #dee2e6' : 'none';

    return (
        <Paper
            style={{
                width,
                height: '100%',
                overflow: 'hidden',
                borderLeft: border,
                borderRadius: 0,
                display: 'flex',
                flexDirection: 'column',
                backgroundColor: 'white',
                zIndex: 10,
                transition: 'width 0.2s ease'
            }}
            shadow="none"
            p={padding as any}
        >
            {isOpen && (
                <>
                    <Group justify="space-between" mb="md" style={{ minWidth: '400px' }}>
                        <Group gap="xs">
                            <IconChartLine size={20} />
                            <Title order={4}>Spectral Analysis</Title>
                            {activeSelections.length > 0 && (
                                <Badge color="blue" >
                                    {activeSelections.length} {activeSelections.length === 1 ? 'Selection' : 'Selections'}
                                </Badge>
                            )}
                        </Group>
                        <CloseButton onClick={onClose} />
                    </Group>

                    <ScrollArea type="auto" style={{ flex: 1 }}>
                        <SpectrumVisualization
                            spectrumData={spectrumData}
                            traceIndex={traceIndex}
                            selection={selection}
                            canvasWidth={400}
                            canvasHeight={300}
                            activeSelections={activeSelections}
                        />
                    </ScrollArea>
                </>
            )}
        </Paper>
    );
};
