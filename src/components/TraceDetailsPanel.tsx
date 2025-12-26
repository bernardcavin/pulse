import React, { useState, useEffect } from 'react';
import { Paper, Title, Table, ScrollArea, CloseButton, Group, Text, Box, Tabs, NumberInput } from '@mantine/core';
import { List } from 'react-window';
import type { SegyTraceHeader, SegyData } from '../utils/SegyParser';
import { TRACE_HEADER_DESCRIPTIONS } from '../utils/TraceHeaderDescriptions';

interface TraceDetailsPanelProps {
    selectedTrace: { index: number; header: SegyTraceHeader } | null;
    segyData: SegyData | null;
    isOpen: boolean;
    onClose: () => void;
    onTraceHeaderUpdate?: (traceIndex: number, updatedHeader: SegyTraceHeader) => void;
    onTraceDataUpdate?: (traceIndex: number, updatedData: Float32Array) => void;
}

export const TraceDetailsPanel: React.FC<TraceDetailsPanelProps> = ({ selectedTrace, segyData, isOpen, onClose, onTraceHeaderUpdate, onTraceDataUpdate }) => {
    const [activeTab, setActiveTab] = useState<string | null>('header');
    const [editingField, setEditingField] = useState<string | null>(null);
    const [editingDataIndex, setEditingDataIndex] = useState<number | null>(null);
    const [hoveredField, setHoveredField] = useState<string | null>(null);
    const [hoveredDataIndex, setHoveredDataIndex] = useState<number | null>(null);

    // Reset editing state when trace changes
    useEffect(() => {
        setEditingField(null);
        setEditingDataIndex(null);
        setHoveredField(null);
        setHoveredDataIndex(null);
    }, [selectedTrace]);

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

    const handleHeaderUpdate = (key: string, value: number) => {
        if (!selectedTrace || !onTraceHeaderUpdate) return;
        const updatedHeader = {
            ...selectedTrace.header,
            [key]: value
        };
        onTraceHeaderUpdate(selectedTrace.index, updatedHeader);
        setEditingField(null);
    };

    const handleDataUpdate = (index: number, value: number) => {
        if (!selectedTrace || !segyData || !onTraceDataUpdate) return;
        const startIndex = selectedTrace.index * segyData.samplesPerTrace;
        const traceData = segyData.data.slice(startIndex, startIndex + segyData.samplesPerTrace);
        const newData = new Float32Array(traceData);
        newData[index] = value;
        onTraceDataUpdate(selectedTrace.index, newData);
        setEditingDataIndex(null);
    };



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
                                <Table striped withTableBorder withColumnBorders>
                                    <Table.Tbody>
                                        {selectedTrace && Object.entries(selectedTrace.header).map(([key, value]) => {
                                            const headerInfo = TRACE_HEADER_DESCRIPTIONS[key];
                                            const isEditing = editingField === key;
                                            const isHovered = hoveredField === key;
                                            const isEditable = !!onTraceHeaderUpdate;

                                            return (
                                                <Table.Tr
                                                    key={key}
                                                    onMouseEnter={() => isEditable && setHoveredField(key)}
                                                    onMouseLeave={() => setHoveredField(null)}
                                                    style={{ cursor: isEditable ? 'pointer' : 'default' }}
                                                >
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
                                                    <Table.Td
                                                        style={{
                                                            verticalAlign: 'center',
                                                            textAlign: 'center',
                                                            width: '30%',
                                                            backgroundColor: isHovered && !isEditing ? 'rgba(0, 123, 255, 0.1)' : undefined,
                                                            transition: 'background-color 0.2s'
                                                        }}
                                                        onClick={() => isEditable && !isEditing && setEditingField(key)}
                                                    >
                                                        {isEditing ? (
                                                            <NumberInput
                                                                value={value as number}
                                                                onChange={(val) => {
                                                                    const numVal = typeof val === 'number' ? val : parseFloat(val as string) || 0;
                                                                    handleHeaderUpdate(key, numVal);
                                                                }}
                                                                onBlur={() => setEditingField(null)}
                                                                onKeyDown={(e) => {
                                                                    if (e.key === 'Enter') setEditingField(null);
                                                                    if (e.key === 'Escape') setEditingField(null);
                                                                }}
                                                                size="xs"
                                                                hideControls
                                                                styles={{ input: { textAlign: 'center' } }}
                                                                autoFocus
                                                            />
                                                        ) : (
                                                            <Text size="sm">{value}</Text>
                                                        )}
                                                    </Table.Td>
                                                </Table.Tr>
                                            );
                                        })}
                                    </Table.Tbody>
                                </Table>
                            </ScrollArea>
                        </Tabs.Panel>

                        <Tabs.Panel value="data" style={{ flex: 1, overflow: 'hidden', paddingTop: '12px', display: 'flex', flexDirection: 'column' }}>
                            {traceData ? (
                                <Box style={{ flex: 1, minWidth: '300px' }}>
                                    <Table striped withTableBorder withColumnBorders style={{ tableLayout: 'fixed' }}>
                                        <Table.Thead>
                                            <Table.Tr>
                                                <Table.Th style={{ textAlign: 'center', width: '25%' }}>Sample</Table.Th>
                                                <Table.Th style={{ textAlign: 'center', width: '35%' }}>Time (ms)</Table.Th>
                                                <Table.Th style={{ textAlign: 'center', width: '40%' }}>Amplitude</Table.Th>
                                            </Table.Tr>
                                        </Table.Thead>
                                    </Table>
                                    <Box style={{ flex: 1, border: '1px solid #dee2e6', borderTop: 'none' }}>
                                        <List
                                            style={{ height: 600, width: '100%' }}
                                            rowCount={traceData.length}
                                            rowHeight={40}
                                            overscanCount={5}
                                            rowComponent={({ index, style }) => {
                                                const value = traceData[index];
                                                const sampleIntervalUs = selectedTrace.header.sampleInterval || 0;
                                                const delayTimeMs = selectedTrace.header.delayRecordingTime || 0;
                                                const timeMs = (index * sampleIntervalUs / 1000) + delayTimeMs;
                                                const isEditing = editingDataIndex === index;
                                                const isHovered = hoveredDataIndex === index;
                                                const isEditable = !!onTraceDataUpdate;

                                                return (
                                                    <div
                                                        style={{
                                                            ...style,
                                                            display: 'flex',
                                                            borderBottom: '1px solid #dee2e6',
                                                            backgroundColor: index % 2 === 0 ? '#f8f9fa' : '#ffffff',
                                                            cursor: isEditable ? 'pointer' : 'default'
                                                        }}
                                                        onMouseEnter={() => isEditable && setHoveredDataIndex(index)}
                                                        onMouseLeave={() => setHoveredDataIndex(null)}
                                                    >
                                                        <div style={{
                                                            width: '25%',
                                                            textAlign: 'center',
                                                            padding: '8px',
                                                            borderRight: '1px solid #dee2e6',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center'
                                                        }}>
                                                            <Text size="sm">{index + 1}</Text>
                                                        </div>
                                                        <div style={{
                                                            width: '35%',
                                                            textAlign: 'center',
                                                            padding: '8px',
                                                            borderRight: '1px solid #dee2e6',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center'
                                                        }}>
                                                            <Text size="sm" ff="monospace">
                                                                {timeMs.toFixed(2)}
                                                            </Text>
                                                        </div>
                                                        <div
                                                            style={{
                                                                width: '40%',
                                                                textAlign: 'center',
                                                                padding: '8px',
                                                                backgroundColor: isHovered && !isEditing ? 'rgba(0, 123, 255, 0.1)' : undefined,
                                                                transition: 'background-color 0.2s',
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                justifyContent: 'center'
                                                            }}
                                                            onClick={() => isEditable && !isEditing && setEditingDataIndex(index)}
                                                        >
                                                            {isEditing ? (
                                                                <NumberInput
                                                                    value={value}
                                                                    onChange={(val) => {
                                                                        const numVal = typeof val === 'number' ? val : parseFloat(val as string) || 0;
                                                                        handleDataUpdate(index, numVal);
                                                                    }}
                                                                    onBlur={() => setEditingDataIndex(null)}
                                                                    onKeyDown={(e) => {
                                                                        if (e.key === 'Enter') setEditingDataIndex(null);
                                                                        if (e.key === 'Escape') setEditingDataIndex(null);
                                                                    }}
                                                                    size="xs"
                                                                    hideControls
                                                                    step={0.0001}
                                                                    decimalScale={4}
                                                                    styles={{ input: { textAlign: 'center', fontFamily: 'monospace' } }}
                                                                    autoFocus
                                                                />
                                                            ) : (
                                                                <Text size="sm" ff="monospace">
                                                                    {value.toExponential(4)}
                                                                </Text>
                                                            )}
                                                        </div>
                                                    </div>
                                                );
                                            }}
                                            rowProps={{}}
                                        />
                                    </Box>
                                </Box>
                            ) : (
                                <Text c="dimmed" ta="center" mt="md">
                                    No trace data available
                                </Text>
                            )}
                        </Tabs.Panel>
                    </Tabs>
                </>
            )}
        </Paper>
    );
};
