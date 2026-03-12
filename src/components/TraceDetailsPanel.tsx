import React, { useState, useEffect, useRef } from 'react';
import { Paper, Title, Table, ScrollArea, CloseButton, Group, Text, Box, Tabs, NumberInput } from '@mantine/core';
import { DataTable } from 'mantine-datatable';
import 'mantine-datatable/styles.css';
import type { SegyTraceHeader, SegyData } from '../utils/SegyParser';
import { TRACE_HEADER_DESCRIPTIONS } from '../utils/TraceHeaderDescriptions';
import { IconTable, IconWaveSine, IconChartLine } from '@tabler/icons-react';
import type { SpectrumResult, WindowType } from '../utils/SignalProcessing';
import { SpectrumVisualization } from './SpectrumVisualization';

interface TraceDetailsPanelProps {
    selectedTrace: { index: number; header: SegyTraceHeader } | null;
    segyData: SegyData | null;
    isOpen: boolean;
    onClose: () => void;
    onTraceHeaderUpdate?: (traceIndex: number, updatedHeader: SegyTraceHeader) => void;
    onTraceDataUpdate?: (traceIndex: number, updatedData: Float32Array) => void;
    spectrumData: SpectrumResult | null;
    onComputeSpectrum: () => void;
    isSpectrumLoading?: boolean;
}

export const TraceDetailsPanel: React.FC<TraceDetailsPanelProps> = ({
    selectedTrace,
    segyData,
    isOpen,
    onClose,
    onTraceHeaderUpdate,
    onTraceDataUpdate,
    spectrumData,
    onComputeSpectrum,
    isSpectrumLoading = false
}) => {
    const [activeTab, setActiveTab] = useState<string | null>('header');
    const [editingField, setEditingField] = useState<string | null>(null);
    const [editingDataIndex, setEditingDataIndex] = useState<number | null>(null);
    const [hoveredField, setHoveredField] = useState<string | null>(null);
    const [loadedRecordsCount, setLoadedRecordsCount] = useState(100); // Start with first 100 records
    const [loadingMore, setLoadingMore] = useState(false);
    const scrollViewportRef = useRef<HTMLDivElement>(null);

    // Reset editing state when trace changes
    useEffect(() => {
        setEditingField(null);
        setEditingDataIndex(null);
        setHoveredField(null);
        setLoadedRecordsCount(100); // Reset to initial batch
        scrollViewportRef.current?.scrollTo(0, 0); // Scroll to top
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

    // Auto-compute spectrum when Spectrum tab is opened
    useEffect(() => {
        if (activeTab === 'spectrum' && selectedTrace && !spectrumData) {
            console.log("Auto-computing spectrum for trace", selectedTrace.index);
            // Trigger spectrum computation via callback
            onComputeSpectrum();
        }
    }, [activeTab, selectedTrace?.index, spectrumData]); // Don't include onComputeSpectrum to avoid loops

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

    const loadMoreRecords = () => {
        if (!traceData) return;
        if (loadedRecordsCount < traceData.length) {
            setLoadingMore(true);
            // Use setTimeout to simulate async loading and prevent blocking
            setTimeout(() => {
                setLoadedRecordsCount(prev => Math.min(prev + 100, traceData.length));
                setLoadingMore(false);
            }, 100);
        }
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

                    <Tabs value={activeTab} onChange={setActiveTab} variant="outline" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                        <Tabs.List>
                            <Tabs.Tab leftSection={<IconTable size={12} stroke={1.5} />} style={{ fontSize: '11px', padding: '15px 10px', height: '24px', outline: 'none' }} value="header">Header</Tabs.Tab>
                            <Tabs.Tab leftSection={<IconWaveSine size={12} stroke={1.5} />} style={{ fontSize: '11px', padding: '15px 10px', height: '24px', outline: 'none' }} value="data">Data</Tabs.Tab>
                            <Tabs.Tab leftSection={<IconChartLine size={12} stroke={1.5} />} style={{ fontSize: '11px', padding: '15px 10px', height: '24px', outline: 'none' }} value="spectrum">Spectrum</Tabs.Tab>
                        </Tabs.List>

                        <Tabs.Panel value="header" style={{ flex: 1, overflow: 'hidden', paddingTop: '12px' }}>
                            <ScrollArea style={{ height: '100%', minWidth: '300px' }}>
                                <Table withTableBorder withColumnBorders>
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
                                <>
                                    <DataTable
                                        withTableBorder
                                        withColumnBorders
                                        striped
                                        highlightOnHover
                                        height={600}
                                        records={Array.from(traceData)
                                            .slice(0, loadedRecordsCount) // Only show loaded records
                                            .map((value, index) => ({
                                                index,
                                                sample: index + 1,
                                                time: ((index * (selectedTrace.header.sampleInterval || 0) / 1000) + (selectedTrace.header.delayRecordingTime || 0)).toFixed(2),
                                                amplitude: value
                                            }))}
                                        fetching={loadingMore}
                                        onScrollToBottom={loadMoreRecords}
                                        scrollViewportRef={scrollViewportRef}
                                        columns={[
                                            {
                                                accessor: 'sample',
                                                title: 'Sample',
                                                textAlign: 'center',
                                                width: '25%'
                                            },
                                            {
                                                accessor: 'time',
                                                title: 'Time (ms)',
                                                textAlign: 'center',
                                                width: '35%',
                                                render: ({ time }) => <Text size="sm" ff="monospace">{time}</Text>
                                            },
                                            {
                                                accessor: 'amplitude',
                                                title: 'Amplitude',
                                                textAlign: 'center',
                                                width: '40%',
                                                render: ({ amplitude, index }) => {
                                                    const isEditing = editingDataIndex === index;
                                                    const isEditable = !!onTraceDataUpdate;

                                                    return isEditing ? (
                                                        <NumberInput
                                                            value={amplitude}
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
                                                        <Text
                                                            size="sm"
                                                            ff="monospace"
                                                            style={{ cursor: isEditable ? 'pointer' : 'default' }}
                                                            onClick={() => isEditable && setEditingDataIndex(index)}
                                                        >
                                                            {amplitude.toExponential(4)}
                                                        </Text>
                                                    );
                                                }
                                            }
                                        ]}
                                    />
                                    <Box p="xs" style={{ borderTop: '1px solid #dee2e6', backgroundColor: '#f8f9fa' }}>
                                        <Text size="xs" c="dimmed" ta="center">
                                            Showing {loadedRecordsCount} of {traceData.length} samples
                                            {loadedRecordsCount < traceData.length}
                                        </Text>
                                    </Box>
                                </>
                            ) : (
                                <Text c="dimmed" ta="center" mt="md">
                                    No trace data available
                                </Text>
                            )}
                        </Tabs.Panel>

                        <Tabs.Panel value="spectrum" style={{ flex: 1, overflow: 'hidden', paddingTop: '12px' }}>
                            <ScrollArea style={{ height: '100%', minWidth: '300px' }}>
                                <SpectrumVisualization
                                    spectrumData={spectrumData}
                                    traceIndex={selectedTrace?.index}
                                    canvasWidth={300}
                                    canvasHeight={250}
                                    isLoading={isSpectrumLoading}
                                />
                            </ScrollArea>
                        </Tabs.Panel>
                    </Tabs>
                </>
            )}
        </Paper>
    );
};
