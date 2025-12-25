import React from 'react';
import { Paper, Title, Table, CloseButton, Group, Text, Box, Tabs } from '@mantine/core';
import type { SegyData, SegyBinaryHeader } from '../utils/SegyParser';
import { BINARY_HEADER_DESCRIPTIONS } from '../utils/BinaryHeaderDescriptions';

interface FileDetailsPanelProps {
    segyData: SegyData | null;
    binaryHeader: SegyBinaryHeader | null;
    textHeader: string | null;
    isOpen: boolean;
    onClose: () => void;
}

export const FileDetailsPanel: React.FC<FileDetailsPanelProps> = ({
    segyData,
    binaryHeader,
    textHeader,
    isOpen,
    onClose
}) => {
    const width = isOpen && segyData && binaryHeader ? '400px' : '0px';
    const padding = isOpen && segyData && binaryHeader ? 'md' : '0';
    const border = isOpen && segyData && binaryHeader ? '1px solid #dee2e6' : 'none';

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
                                    <Text size="xs" ff="monospace" style={{ whiteSpace: 'pre-wrap', lineHeight: '1.4', padding: '8px' }}>
                                        {textHeader}
                                    </Text>
                                ) : (
                                    <Text c="dimmed" style={{ padding: '8px' }}>No text header available</Text>
                                )}
                            </Tabs.Panel>

                            <Tabs.Panel value="bin-header" style={{ flex: 1, overflow: 'auto' }}>
                                <Table striped highlightOnHover withTableBorder withColumnBorders>
                                    <Table.Tbody>
                                        {Object.entries(binaryHeader).map(([key, value]) => {
                                            const headerInfo = BINARY_HEADER_DESCRIPTIONS[key];
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
                            </Tabs.Panel>
                        </Box>
                    </Tabs>
                </>
            )}
        </Paper>
    );
};
