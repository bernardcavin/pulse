import React from 'react';
import { Paper, Title, Table, ScrollArea, CloseButton, Group, Text, Box, Center } from '@mantine/core';
import type { SegyTraceHeader } from '../utils/SegyParser';
import { TRACE_HEADER_DESCRIPTIONS } from '../utils/TraceHeaderDescriptions';

interface TraceDetailsPanelProps {
    selectedTrace: { index: number; header: SegyTraceHeader } | null;
    isOpen: boolean;
    onClose: () => void;
}

export const TraceDetailsPanel: React.FC<TraceDetailsPanelProps> = ({ selectedTrace, isOpen, onClose }) => {
    // If not open or no trace, we can render nothing or an empty placeholder. 
    // To support animation, we might render it with width 0, but for now simple conditional rendering or CSS width is easiest.
    // The prompt asked for "collapsable". 

    // We'll use a wider width to accommodate descriptions
    const width = isOpen && selectedTrace ? '300px' : '0px';
    const padding = isOpen && selectedTrace ? 'md' : '0';
    const border = isOpen && selectedTrace ? '1px solid #dee2e6' : 'none';

    return (
        <Paper
            style={{
                width,
                height: '100%',
                overflow: 'hidden',
                borderRight: border,
                borderRadius: 0,
                display: 'flex',
                flexDirection: 'column',
                backgroundColor: 'white',
                zIndex: 10
            }}
            shadow="none"
            p={padding as any}
        >
            {selectedTrace && (
                <>
                    <Group justify="space-between" mb="md" style={{ minWidth: '250px' }}>
                        <Title order={4}>Trace #{selectedTrace.index + 1}</Title>
                        <CloseButton onClick={onClose} />
                    </Group>
                    <ScrollArea style={{ flex: 1, minWidth: '250px' }}>
                        <Table striped highlightOnHover withTableBorder withColumnBorders>

                            <Table.Tbody>
                                {Object.entries(selectedTrace.header).map(([key, value]) => {
                                    const headerInfo = TRACE_HEADER_DESCRIPTIONS[key];
                                    return (
                                        <Table.Tr key={key}>
                                            <Table.Td style={{ verticalAlign: 'top', width: '70%' }}>
                                                <Box>
                                                    <Text size="sm" fw={600} c="gray.8">
                                                        {headerInfo?.description || key}
                                                    </Text>
                                                    {headerInfo?.bytes && (
                                                        <Text size="xs" c="gray.6" mt={2}>
                                                            Bytes {headerInfo.bytes}
                                                        </Text>
                                                    )}
                                                </Box>
                                            </Table.Td>
                                            <Table.Td style={{ verticalAlign: 'center', textAlign: 'center', width: '30%' }}>
                                                {value}
                                            </Table.Td>
                                        </Table.Tr>
                                    );
                                })}
                            </Table.Tbody>
                        </Table>
                    </ScrollArea>
                </>
            )}
        </Paper>
    );
};
