import React, { useState, useEffect } from 'react';
import { Paper, Title, Table, CloseButton, Group, Text, Box, Tabs, Textarea, NumberInput } from '@mantine/core';
import type { SegyData, SegyBinaryHeader } from '../utils/SegyParser';
import { BINARY_HEADER_DESCRIPTIONS } from '../utils/BinaryHeaderDescriptions';

interface FileDetailsPanelProps {
    segyData: SegyData | null;
    binaryHeader: SegyBinaryHeader | null;
    textHeader: string | null;
    isOpen: boolean;
    onClose: () => void;
    onBinaryHeaderUpdate?: (updatedHeader: SegyBinaryHeader) => void;
    onTextHeaderUpdate?: (updatedText: string) => void;
}

export const FileDetailsPanel: React.FC<FileDetailsPanelProps> = ({
    segyData,
    binaryHeader,
    textHeader,
    isOpen,
    onClose,
    onBinaryHeaderUpdate,
    onTextHeaderUpdate
}) => {
    const [editingBinaryField, setEditingBinaryField] = useState<string | null>(null);
    const [editingTextHeader, setEditingTextHeader] = useState(false);
    const [hoveredBinaryField, setHoveredBinaryField] = useState<string | null>(null);

    // Reset editing states when panel closes
    useEffect(() => {
        if (!isOpen) {
            setEditingBinaryField(null);
            setEditingTextHeader(false);
            setHoveredBinaryField(null);
        }
    }, [isOpen]);
    const width = isOpen && segyData && binaryHeader ? '400px' : '0px';
    const padding = isOpen && segyData && binaryHeader ? 'md' : '0';
    const border = isOpen && segyData && binaryHeader ? '1px solid #dee2e6' : 'none';

    const handleBinaryHeaderUpdate = (key: string, value: number) => {
        if (!binaryHeader || !onBinaryHeaderUpdate) return;
        const updatedHeader = {
            ...binaryHeader,
            [key]: value
        };
        onBinaryHeaderUpdate(updatedHeader);
        setEditingBinaryField(null);
    };

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
            {segyData && binaryHeader && (
                <>
                    <Group justify="space-between" mb="md" style={{ minWidth: '350px' }}>
                        <Title order={4}>File Information</Title>
                        <CloseButton onClick={onClose} />
                    </Group>

                    <Tabs defaultValue="summary" variant="pills" style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: '350px', overflow: 'hidden' }}>
                        <Tabs.List mb="xs">
                            <Tabs.Tab value="summary">Summary</Tabs.Tab>
                            <Tabs.Tab value="text-header">Text Header</Tabs.Tab>
                            <Tabs.Tab value="bin-header">Bin Header</Tabs.Tab>
                        </Tabs.List>

                        <Box style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                            <Tabs.Panel value="summary" style={{ flex: 1, overflow: 'auto' }}>
                                <Table striped highlightOnHover withTableBorder withColumnBorders>
                                    <Table.Tbody>
                                        <Table.Tr>
                                            <Table.Td><Text size="sm" fw={600}>Number of Traces</Text></Table.Td>
                                            <Table.Td style={{ textAlign: 'center' }}>{segyData.numTraces}</Table.Td>
                                        </Table.Tr>
                                        <Table.Tr>
                                            <Table.Td><Text size="sm" fw={600}>Samples per Trace</Text></Table.Td>
                                            <Table.Td style={{ textAlign: 'center' }}>{binaryHeader.samplesPerTrace}</Table.Td>
                                        </Table.Tr>
                                        <Table.Tr>
                                            <Table.Td><Text size="sm" fw={600}>Sample Interval</Text></Table.Td>
                                            <Table.Td style={{ textAlign: 'center' }}>{binaryHeader.sampleInterval} μs</Table.Td>
                                        </Table.Tr>
                                        <Table.Tr>
                                            <Table.Td><Text size="sm" fw={600}>Data Format</Text></Table.Td>
                                            <Table.Td style={{ textAlign: 'center' }}>
                                                {binaryHeader.sampleFormat === 1 ? 'IBM Float' :
                                                    binaryHeader.sampleFormat === 5 ? 'IEEE Float' :
                                                        `Code ${binaryHeader.sampleFormat}`}
                                            </Table.Td>
                                        </Table.Tr>
                                        <Table.Tr>
                                            <Table.Td><Text size="sm" fw={600}>Measurement System</Text></Table.Td>
                                            <Table.Td style={{ textAlign: 'center' }}>
                                                {binaryHeader.measurementSystem === 1 ? 'Meters' :
                                                    binaryHeader.measurementSystem === 2 ? 'Feet' :
                                                        'Unknown'}
                                            </Table.Td>
                                        </Table.Tr>
                                        <Table.Tr>
                                            <Table.Td><Text size="sm" fw={600}>Total Duration</Text></Table.Td>
                                            <Table.Td style={{ textAlign: 'center' }}>
                                                {((binaryHeader.samplesPerTrace * binaryHeader.sampleInterval) / 1000).toFixed(2)} ms
                                            </Table.Td>
                                        </Table.Tr>
                                    </Table.Tbody>
                                </Table>
                            </Tabs.Panel>

                            <Tabs.Panel value="text-header" style={{ flex: 1, overflow: 'auto' }}>
                                {textHeader ? (
                                    <Box>
                                        {editingTextHeader ? (
                                            <Textarea
                                                value={textHeader}
                                                onChange={(e) => {
                                                    if (onTextHeaderUpdate) {
                                                        onTextHeaderUpdate(e.currentTarget.value);
                                                    }
                                                }}
                                                onBlur={() => setEditingTextHeader(false)}
                                                minRows={25}
                                                maxRows={25}
                                                styles={{ input: { fontFamily: 'monospace', fontSize: '12px', lineHeight: '1.4' } }}
                                                autoFocus
                                            />
                                        ) : (
                                            <Box
                                                onClick={() => onTextHeaderUpdate && setEditingTextHeader(true)}
                                                style={{
                                                    cursor: onTextHeaderUpdate ? 'pointer' : 'default',
                                                    padding: '8px',
                                                    borderRadius: '4px',
                                                    transition: 'background-color 0.2s'
                                                }}
                                                onMouseEnter={(e) => {
                                                    if (onTextHeaderUpdate) {
                                                        e.currentTarget.style.backgroundColor = 'rgba(0, 123, 255, 0.05)';
                                                    }
                                                }}
                                                onMouseLeave={(e) => {
                                                    e.currentTarget.style.backgroundColor = 'transparent';
                                                }}
                                            >
                                                <Text size="xs" ff="monospace" style={{ whiteSpace: 'pre-wrap', lineHeight: '1.4' }}>
                                                    {textHeader}
                                                </Text>
                                            </Box>
                                        )}
                                    </Box>
                                ) : (
                                    <Text c="dimmed" style={{ padding: '8px' }}>No text header available</Text>
                                )}
                            </Tabs.Panel>

                            <Tabs.Panel value="bin-header" style={{ flex: 1, overflow: 'auto' }}>
                                <Table striped withTableBorder withColumnBorders>
                                    <Table.Tbody>
                                        {binaryHeader && Object.entries(binaryHeader).map(([key, value]) => {
                                            const headerInfo = BINARY_HEADER_DESCRIPTIONS[key];
                                            const isEditing = editingBinaryField === key;
                                            const isHovered = hoveredBinaryField === key;
                                            const isEditable = !!onBinaryHeaderUpdate;

                                            return (
                                                <Table.Tr
                                                    key={key}
                                                    onMouseEnter={() => isEditable && setHoveredBinaryField(key)}
                                                    onMouseLeave={() => setHoveredBinaryField(null)}
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
                                                        onClick={() => isEditable && !isEditing && setEditingBinaryField(key)}
                                                    >
                                                        {isEditing ? (
                                                            <NumberInput
                                                                value={value as number}
                                                                onChange={(val) => {
                                                                    const numVal = typeof val === 'number' ? val : parseFloat(val as string) || 0;
                                                                    handleBinaryHeaderUpdate(key, numVal);
                                                                }}
                                                                onBlur={() => setEditingBinaryField(null)}
                                                                onKeyDown={(e) => {
                                                                    if (e.key === 'Enter') setEditingBinaryField(null);
                                                                    if (e.key === 'Escape') setEditingBinaryField(null);
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
                            </Tabs.Panel>
                        </Box>
                    </Tabs>
                </>
            )}
        </Paper>
    );
};
