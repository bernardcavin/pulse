import React, { useState } from 'react';
import { Paper, Title, Table, ScrollArea, CloseButton, Group, Text, Box, Tabs } from '@mantine/core';
import type { SegyTraceHeader, SegyData } from '../utils/SegyParser';
import { TRACE_HEADER_DESCRIPTIONS } from '../utils/TraceHeaderDescriptions';

interface TraceDetailsPanelProps {
    selectedTrace: { index: number; header: SegyTraceHeader } | null;
    segyData: SegyData | null;
    isOpen: boolean;
    onClose: () => void;
}

export const TraceDetailsPanel: React.FC<TraceDetailsPanelProps> = ({ selectedTrace, segyData, isOpen, onClose }) => {
    const [activeTab, setActiveTab] = useState<string | null>('header');

    // We'll use a wider width to accommodate descriptions and data
    const width = isOpen && selectedTrace ? '350px' : '0px';
    const padding = isOpen && selectedTrace ? 'md' : '0';
    const border = isOpen && selectedTrace ? '1px solid #dee2e6' : 'none';

    // Extract trace data samples if available
    const getTraceData = (): Float32Array | null => {
        if (!selectedTrace || !segyData) return null;

        const { index } = selectedTrace;
        const { samplesPerTrace, data } = segyData;
        const startIndex = index * samplesPerTrace;
        const endIndex = startIndex + samplesPerTrace;

        return data.slice(startIndex, endIndex);
    };

    const traceData = getTraceData();

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
                    <Group justify="space-between" mb="md" style={{ minWidth: '300px' }}>
                        <Title order={4}>Trace #{selectedTrace.index + 1}</Title>
                        <CloseButton onClick={onClose} />
                    </Group>

                    <Tabs value={activeTab} onChange={setActiveTab} style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                        <Tabs.List>
                            <Tabs.Tab value="header">Header</Tabs.Tab>
                            <Tabs.Tab value="data">Data</Tabs.Tab>
                        </Tabs.List>

                        <Tabs.Panel value="header" style={{ flex: 1, overflow: 'hidden', paddingTop: '12px' }}>
                            <ScrollArea style={{ height: '100%', minWidth: '300px' }}>
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
                        </Tabs.Panel>

                        <Tabs.Panel value="data" style={{ flex: 1, overflow: 'hidden', paddingTop: '12px' }}>
                            <ScrollArea style={{ height: '100%', minWidth: '300px' }}>
                                {traceData ? (
                                    <Table striped highlightOnHover withTableBorder withColumnBorders>
                                        <Table.Thead>
                                            <Table.Tr>
                                                <Table.Th style={{ textAlign: 'center' }}>Sample</Table.Th>
                                                <Table.Th style={{ textAlign: 'center' }}>Time (ms)</Table.Th>
                                                <Table.Th style={{ textAlign: 'center' }}>Amplitude</Table.Th>
                                            </Table.Tr>
                                        </Table.Thead>
                                        <Table.Tbody>
                                            {Array.from(traceData).map((value, index) => {
                                                // Calculate time: (sample_index * sample_interval_us / 1000) + delay_time
                                                const sampleIntervalUs = selectedTrace.header.sampleInterval || 0;
                                                const delayTimeMs = selectedTrace.header.delayRecordingTime || 0;
                                                const timeMs = (index * sampleIntervalUs / 1000) + delayTimeMs;

                                                return (
                                                    <Table.Tr key={index}>
                                                        <Table.Td style={{ textAlign: 'center', width: '25%' }}>
                                                            {index + 1}
                                                        </Table.Td>
                                                        <Table.Td style={{ textAlign: 'center', width: '35%' }}>
                                                            <Text size="sm" ff="monospace">
                                                                {timeMs.toFixed(2)}
                                                            </Text>
                                                        </Table.Td>
                                                        <Table.Td style={{ textAlign: 'center', width: '40%' }}>
                                                            <Text size="sm" ff="monospace">
                                                                {value.toExponential(4)}
                                                            </Text>
                                                        </Table.Td>
                                                    </Table.Tr>
                                                );
                                            })}
                                        </Table.Tbody>
                                    </Table>
                                ) : (
                                    <Text c="dimmed" ta="center" mt="md">
                                        No trace data available
                                    </Text>
                                )}
                            </ScrollArea>
                        </Tabs.Panel>
                    </Tabs>
                </>
            )}
        </Paper>
    );
};
