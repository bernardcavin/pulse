import { FileInput, Slider, Paper, Radio, NumberInput, Group, Stack, Switch, ColorInput, Fieldset, Text, Tabs, Button, ScrollArea, Checkbox, SimpleGrid, TextInput } from '@mantine/core';
import { useState } from 'react';
import type { SegyData, SegyBinaryHeader } from '../utils/SegyParser';
import { getHeaderDescription } from '../utils/TraceHeaderDescriptions';
import { IconEye, IconFile, IconSettings, IconFileTypePng, IconFileTypeJpg, IconFileTypePdf, IconFileTypeCsv } from '@tabler/icons-react';

interface ControlPanelProps {
    onFileUpload: (file: File) => void;
    gain: number;
    onGainChange: (val: number) => void;
    loading: boolean;
    segyData: SegyData | null;
    binaryHeader: SegyBinaryHeader | null;
    textHeader: string | null;
    onExport: () => void;
    displayWiggle: boolean;
    onDisplayWiggleChange: (val: boolean) => void;
    displayDensity: boolean;
    onDisplayDensityChange: (val: boolean) => void;
    wiggleFill: 'none' | 'pos' | 'neg';
    onWiggleFillChange: (val: 'none' | 'pos' | 'neg') => void;
    scaleX: number;
    onScaleXChange: (val: number) => void;
    scaleY: number;
    onScaleYChange: (val: number) => void;
    reverse: boolean;
    onReverseChange: (val: boolean) => void;
    colorMap: 'grey' | 'rwb' | 'custom';
    onColorMapChange: (val: 'grey' | 'rwb' | 'custom') => void;
    customColors: { min: string, zero: string, max: string };
    onCustomColorsChange: (val: { min: string, zero: string, max: string }) => void;
    agcEnabled: boolean;
    onAgcEnabledChange: (val: boolean) => void;
    agcWindow: number;
    onAgcWindowChange: (val: number) => void;
    showGridlines: boolean;
    onShowGridlinesChange: (val: boolean) => void;
    allAvailableHeaders: string[];
    selectedXAxisHeaders: string[];
    onSelectedXAxisHeadersChange: (headers: string[]) => void;
    wiggleFillColors: { positive: string; negative: string };
    onWiggleFillColorsChange: (colors: { positive: string; negative: string }) => void;
    fileMetadata: { name: string; size: number; lastModified: number } | null;
    onExportPNG: () => void;
    onExportJPEG: () => void;
    onExportPDF: () => void;
    onExportASCII: () => void;
}

export const ControlPanel: React.FC<ControlPanelProps> = ({
    onFileUpload,
    gain,
    onGainChange,
    loading,
    segyData,
    binaryHeader,
    textHeader,
    onExport,
    displayWiggle,
    onDisplayWiggleChange,
    displayDensity,
    onDisplayDensityChange,
    wiggleFill,
    onWiggleFillChange,
    scaleX,
    onScaleXChange,
    scaleY,
    onScaleYChange,
    reverse,
    onReverseChange,
    colorMap,
    onColorMapChange,
    customColors,
    onCustomColorsChange,
    agcEnabled,
    onAgcEnabledChange,
    agcWindow,
    onAgcWindowChange,
    showGridlines,
    onShowGridlinesChange,
    allAvailableHeaders,
    selectedXAxisHeaders,
    onSelectedXAxisHeadersChange,
    wiggleFillColors,
    onWiggleFillColorsChange,
    fileMetadata,
    onExportPNG,
    onExportJPEG,
    onExportPDF,
    onExportASCII
}) => {
    const [headerSearch, setHeaderSearch] = useState('');

    const handleFileChange = (payload: File | null) => {
        if (payload) {
            onFileUpload(payload);
        }
    };

    // Filter headers based on search query
    const filteredHeaders = allAvailableHeaders.filter((header) => {
        const searchLower = headerSearch.toLowerCase();
        return (
            header.toLowerCase().includes(searchLower) ||
            getHeaderDescription(header).toLowerCase().includes(searchLower)
        );
    });

    // Helper functions for formatting
    const formatFileSize = (bytes: number): string => {
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
        return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
    };

    const formatDate = (timestamp: number): string => {
        return new Date(timestamp).toLocaleString();
    };

    const getDataFormatLabel = (sampleFormat: number): string => {
        const formats: { [key: number]: string } = {
            1: 'IBM Float',
            2: '4-byte Integer',
            3: '2-byte Integer',
            5: 'IEEE Float',
            8: '1-byte Integer'
        };
        return formats[sampleFormat] || `Unknown (${sampleFormat})`;
    };

    const calculateTotalDuration = (samples: number, interval: number): number => {
        return (samples - 1) * interval / 1000; // Convert to ms
    };

    return (
        <Paper p={8} withBorder style={{ width: '100%', height: '200px', zIndex: 10, overflow: 'hidden' }} >
            <Tabs defaultValue="file" variant='outline' radius="sm" >
                <Tabs.List mb={6}>
                    <Tabs.Tab leftSection={<IconFile size={16} stroke={1.5} />} value="file" style={{ fontSize: '11px', padding: '4px 10px', height: '24px', outline: 'none' }}>File</Tabs.Tab>
                    <Tabs.Tab leftSection={<IconEye size={16} stroke={1.5} />} value="display" style={{ fontSize: '11px', padding: '4px 10px', height: '24px', outline: 'none' }}>Display</Tabs.Tab>
                    <Tabs.Tab leftSection={<IconSettings size={16} stroke={1.5} />} value="processing" style={{ fontSize: '11px', padding: '4px 10px', height: '24px', outline: 'none' }}>Processing</Tabs.Tab>
                </Tabs.List>

                <Tabs.Panel value="file" pt={0}>
                    <Group align="flex-start" gap="md" wrap="nowrap">
                        <Fieldset legend="File Management" p="sm" style={{ minWidth: '200px', height: '138px' }}>
                            <Stack gap="xs">
                                <Text size="10px" c="dimmed" mb={2}>Load and manage SEG-Y files</Text>
                                <FileInput
                                    placeholder="Load SEG-Y file"
                                    onChange={handleFileChange}
                                    accept=".sgy,.segy"
                                    disabled={loading}
                                    size="xs"
                                />
                            </Stack>
                        </Fieldset>

                        {fileMetadata && (
                            <Fieldset legend="File Metadata" p="sm" style={{ minWidth: '320px', height: '138px' }}>
                                <Stack gap="xs">
                                    <Group gap="xs">
                                        <Text size="xs" fw={500} w={80}>File Name:</Text>
                                        <Text size="xs" c="dimmed" truncate style={{ flex: 1 }}>{fileMetadata.name}</Text>
                                    </Group>
                                    <Group gap="xs">
                                        <Text size="xs" fw={500} w={80}>File Size:</Text>
                                        <Text size="xs" c="dimmed">{formatFileSize(fileMetadata.size)}</Text>
                                    </Group>
                                    <Group gap="xs">
                                        <Text size="xs" fw={500} w={80}>Last Modified:</Text>
                                        <Text size="xs" c="dimmed">{formatDate(fileMetadata.lastModified)}</Text>
                                    </Group>
                                </Stack>
                            </Fieldset>
                        )}
                        {segyData && binaryHeader && (

                            <Fieldset legend="File Information" p="sm" style={{ minWidth: '420px', height: '138px' }}>
                                <SimpleGrid cols={2} spacing="xs">
                                    <Group gap="xs">
                                        <Text size="xs" fw={500} w={130}>Number of Traces:</Text>
                                        <Text size="xs" c="dimmed">{segyData.numTraces}</Text>
                                    </Group>
                                    <Group gap="xs">
                                        <Text size="xs" fw={500} w={130}>Samples per Trace:</Text>
                                        <Text size="xs" c="dimmed">{binaryHeader.samplesPerTrace}</Text>
                                    </Group>
                                    <Group gap="xs">
                                        <Text size="xs" fw={500} w={130}>Sample Interval:</Text>
                                        <Text size="xs" c="dimmed">{binaryHeader.sampleInterval} μs</Text>
                                    </Group>
                                    <Group gap="xs">
                                        <Text size="xs" fw={500} w={130}>Data Format:</Text>
                                        <Text size="xs" c="dimmed">{getDataFormatLabel(binaryHeader.sampleFormat)}</Text>
                                    </Group>
                                    <Group gap="xs">
                                        <Text size="xs" fw={500} w={130}>Measurement System:</Text>
                                        <Text size="xs" c="dimmed">{binaryHeader.measurementSystem === 1 ? 'Meters' : 'Feet'}</Text>
                                    </Group>
                                    <Group gap="xs">
                                        <Text size="xs" fw={500} w={130}>Total Duration:</Text>
                                        <Text size="xs" c="dimmed">{calculateTotalDuration(binaryHeader.samplesPerTrace, binaryHeader.sampleInterval).toFixed(2)} ms</Text>
                                    </Group>
                                </SimpleGrid>
                            </Fieldset>
                        )}
                        {segyData && binaryHeader && (
                            <Fieldset legend="Export" p="sm" style={{ minWidth: '320px', height: '138px' }}>
                                <Stack gap={4}>
                                    <Text size="10px" c="dimmed" mb={2}>Export data and visualization</Text>
                                    <SimpleGrid cols={3} spacing="xs" >
                                        <Button
                                            variant="subtle"
                                            size="xs"
                                            onClick={onExport}
                                            color="black"
                                            leftSection={<IconFile size={12} />}
                                        >
                                            <Text size="xs" fw={500} mt={2}>
                                                Export as SEG-Y
                                            </Text>
                                        </Button>
                                        <Button
                                            variant="subtle"
                                            size="xs"
                                            onClick={onExportPNG}
                                            color="black"
                                            leftSection={<IconFileTypePng size={14} />}
                                        >
                                            <Text size="xs" fw={500} mt={2}>
                                                Export as PNG
                                            </Text>
                                        </Button>
                                        <Button
                                            variant="subtle"
                                            size="xs"
                                            onClick={onExportJPEG}
                                            color="black"
                                            leftSection={<IconFileTypeJpg size={12} />}
                                        >
                                            <Text size="xs" fw={500} mt={2}>
                                                Export as JPEG
                                            </Text>
                                        </Button>
                                        <Button
                                            variant="subtle"
                                            size="xs"
                                            onClick={onExportPDF}
                                            color="black"
                                            leftSection={<IconFileTypePdf size={12} />}
                                        >
                                            <Text size="xs" fw={500} mt={2}>
                                                Export as PDF
                                            </Text>
                                        </Button>
                                        <Button
                                            variant="subtle"
                                            size="xs"
                                            onClick={onExportASCII}
                                            color="black"
                                            leftSection={<IconFileTypeCsv size={12} />}
                                        >
                                            <Text size="xs" fw={500} mt={2}>
                                                Export as CSV
                                            </Text>
                                        </Button>
                                    </SimpleGrid>
                                </Stack>
                            </Fieldset>
                        )}

                    </Group>
                </Tabs.Panel>

                <Tabs.Panel value="display" pt={0}>
                    <Group align="flex-start" gap="md" wrap="nowrap">
                        <Fieldset legend="Display Mode" p="sm" style={{ minWidth: '160px', height: '138px' }}>
                            <Stack gap="xs">
                                <Text size="10px" c="dimmed" mb={2}>Choose visualization type</Text>
                                <Switch
                                    label="Wiggle Traces"
                                    description="Show seismic traces as wiggles"
                                    checked={displayWiggle}
                                    onChange={(e) => onDisplayWiggleChange(e.currentTarget.checked)}
                                    disabled={loading}
                                    size="xs"
                                    styles={{ description: { fontSize: '9px' } }}
                                />
                                <Switch
                                    label="Density Plot"
                                    description="Show amplitude as color density"
                                    checked={displayDensity}
                                    onChange={(e) => onDisplayDensityChange(e.currentTarget.checked)}
                                    disabled={loading}
                                    size="xs"
                                    styles={{ description: { fontSize: '9px' } }}
                                />
                            </Stack>
                        </Fieldset>

                        <Fieldset legend="Scale & Grid" p="sm" style={{ minWidth: '220px', height: '138px' }}>
                            <Stack gap="xs">
                                <Text size="10px" c="dimmed" mb={2}>Adjust display scaling</Text>
                                <Group gap="xs" align="center">
                                    <Text size="xs" w={20}>X:</Text>
                                    <Slider
                                        w={80}
                                        min={0.5}
                                        max={5.0}
                                        step={0.1}
                                        onChange={onScaleXChange}
                                        value={scaleX}
                                        disabled={loading}
                                        label={(val) => val.toFixed(1)}
                                        size="xs"
                                    />
                                    <Text size="10px" c="dimmed">{scaleX.toFixed(1)}x</Text>
                                </Group>
                                <Group gap="xs" align="center">
                                    <Text size="xs" w={20}>Y:</Text>
                                    <Slider
                                        w={80}
                                        min={0.1}
                                        max={5.0}
                                        step={0.1}
                                        onChange={onScaleYChange}
                                        value={scaleY}
                                        disabled={loading}
                                        label={(val) => val.toFixed(1)}
                                        size="xs"
                                    />
                                    <Text size="10px" c="dimmed">{scaleY.toFixed(1)}x</Text>
                                </Group>
                                <Switch
                                    label="Show Gridlines"
                                    description="Display reference grid"
                                    checked={showGridlines}
                                    onChange={(e) => onShowGridlinesChange(e.currentTarget.checked)}
                                    disabled={loading}
                                    size="xs"
                                    styles={{ description: { fontSize: '9px' } }}
                                />
                            </Stack>
                        </Fieldset>

                        <Fieldset legend="Wiggle Fill" p="sm" style={{ minWidth: '200px', height: '138px' }}>
                            <Stack gap="xs">
                                <Text size="10px" c="dimmed" mb={2}>Fill wiggle traces with color</Text>
                                <Radio.Group
                                    value={wiggleFill}
                                    onChange={(value) => onWiggleFillChange(value as 'none' | 'pos' | 'neg')}
                                    size="xs"
                                >
                                    <Stack gap={4}>
                                        <Radio label="No Fill" value="none" disabled={loading || !displayWiggle} size="xs" />
                                        <Radio label="Positive (+)" value="pos" disabled={loading || !displayWiggle} size="xs" />
                                        <Radio label="Negative (−)" value="neg" disabled={loading || !displayWiggle} size="xs" />
                                    </Stack>
                                </Radio.Group>
                                {wiggleFill === 'pos' && (
                                    <Group gap="xs" align="center" mt={4}>
                                        <Text size="xs">Color:</Text>
                                        <ColorInput
                                            value={wiggleFillColors.positive}
                                            onChange={(val) => onWiggleFillColorsChange({ ...wiggleFillColors, positive: val })}
                                            disabled={loading}
                                            size="xs"
                                            w={100}
                                        />
                                    </Group>
                                )}
                                {wiggleFill === 'neg' && (
                                    <Group gap="xs" align="center" mt={4}>
                                        <Text size="xs">Color:</Text>
                                        <ColorInput
                                            value={wiggleFillColors.negative}
                                            onChange={(val) => onWiggleFillColorsChange({ ...wiggleFillColors, negative: val })}
                                            disabled={loading}
                                            size="xs"
                                            w={100}
                                        />
                                    </Group>
                                )}
                            </Stack>
                        </Fieldset>

                        {displayDensity && (
                            <Fieldset legend="Density Colormap" p="sm" style={{ minWidth: '240px', height: '138px' }}>
                                <Stack gap="xs">
                                    <Text size="10px" c="dimmed" mb={2}>Configure density visualization colors</Text>
                                    <Radio.Group
                                        value={colorMap}
                                        onChange={(val) => onColorMapChange(val as 'grey' | 'rwb' | 'custom')}
                                        size="xs"
                                    >
                                        <Group gap="xs">
                                            <Radio label="Greyscale" value="grey" disabled={loading} size="xs" />
                                            <Radio label="Red-White-Blue" value="rwb" disabled={loading} size="xs" />
                                            <Radio label="Custom" value="custom" disabled={loading} size="xs" />
                                        </Group>
                                    </Radio.Group>
                                    <Switch
                                        label="Reverse Colormap"
                                        description="Invert color scale"
                                        checked={reverse}
                                        onChange={(e) => onReverseChange(e.currentTarget.checked)}
                                        disabled={loading}
                                        size="xs"
                                        styles={{ description: { fontSize: '9px' } }}
                                    />
                                    {colorMap === 'custom' && (
                                        <Group gap="xs" align="center" mt={4}>
                                            <Text size="xs">Colors:</Text>
                                            <ColorInput
                                                value={customColors.min}
                                                onChange={(val) => onCustomColorsChange({ ...customColors, min: val })}
                                                disabled={loading}
                                                size="xs"
                                                w={35}
                                                variant="unstyled"
                                                withEyeDropper={false}
                                            />
                                            <ColorInput
                                                value={customColors.zero}
                                                onChange={(val) => onCustomColorsChange({ ...customColors, zero: val })}
                                                disabled={loading}
                                                size="xs"
                                                w={35}
                                                variant="unstyled"
                                                withEyeDropper={false}
                                            />
                                            <ColorInput
                                                value={customColors.max}
                                                onChange={(val) => onCustomColorsChange({ ...customColors, max: val })}
                                                disabled={loading}
                                                size="xs"
                                                w={35}
                                                variant="unstyled"
                                                withEyeDropper={false}
                                            />
                                        </Group>
                                    )}
                                </Stack>
                            </Fieldset>
                        )}

                        <Fieldset legend="Axis Headers" p="sm" style={{ width: '700px', height: '138px' }}>
                            <Stack gap="xs">
                                <Group justify='space-between' align='top'>
                                    <Text size="10px" c="dimmed" mb={2}>Select trace headers to display on X-axis</Text>
                                    <TextInput
                                        mt={-15}
                                        placeholder="Search headers..."
                                        value={headerSearch}
                                        onChange={(e) => setHeaderSearch(e.currentTarget.value)}
                                        size="xs"
                                        w={120}
                                    />
                                </Group>
                                <ScrollArea h={60} >
                                    <SimpleGrid cols={3} w="95%">
                                        {filteredHeaders.map((header) => (
                                            <Checkbox
                                                key={header}
                                                label={`${header} - ${getHeaderDescription(header)}`}
                                                checked={selectedXAxisHeaders.includes(header)}
                                                onChange={(e) => {
                                                    if (e.currentTarget.checked) {
                                                        onSelectedXAxisHeadersChange([...selectedXAxisHeaders, header]);
                                                    } else {
                                                        onSelectedXAxisHeadersChange(
                                                            selectedXAxisHeaders.filter((h) => h !== header)
                                                        );
                                                    }
                                                }}
                                                size="xs"
                                                styles={{
                                                    label: { fontSize: '10px', lineHeight: '1.4' }
                                                }}
                                            />
                                        ))}
                                    </SimpleGrid>
                                </ScrollArea>
                            </Stack>
                        </Fieldset>
                    </Group>
                </Tabs.Panel>

                <Tabs.Panel value="processing" pt={0} >
                    <Group align="flex-start" gap="md">
                        <Fieldset legend="Amplitude Gain" p="sm" style={{ minWidth: '280px', height: '138px' }}>
                            <Stack gap="xs">
                                <Text size="10px" c="dimmed" mb={2}>Adjust signal amplitude and apply automatic gain control</Text>
                                <Group gap="xs" align="center">
                                    <Text size="xs" w={40}>Level:</Text>
                                    <Slider
                                        w={120}
                                        min={0}
                                        max={100}
                                        step={1}
                                        label={(val) => (Math.pow(val / 100, 2) * 10).toFixed(2)}
                                        onChange={(value) => {
                                            const expGain = Math.pow(value / 100, 2) * 10;
                                            onGainChange(expGain);
                                        }}
                                        value={Math.sqrt(gain / 10) * 100}
                                        disabled={loading}
                                        size="xs"
                                    />
                                    <NumberInput
                                        value={gain}
                                        onChange={(val) => onGainChange(typeof val === 'number' ? val : parseFloat(val as string))}
                                        min={0}
                                        max={10}
                                        step={0.1}
                                        decimalScale={2}
                                        disabled={loading}
                                        w={60}
                                        size="xs"
                                        hideControls
                                    />
                                </Group>
                                <Switch
                                    label="AGC (Automatic Gain Control)"
                                    description="Apply time-variant scaling"
                                    checked={agcEnabled}
                                    onChange={(e) => onAgcEnabledChange(e.currentTarget.checked)}
                                    disabled={loading}
                                    size="xs"
                                    styles={{ description: { fontSize: '9px' } }}
                                />
                                {agcEnabled && (
                                    <Group gap="xs" align="center">
                                        <Text size="xs" w={80}>Window (ms):</Text>
                                        <NumberInput
                                            value={agcWindow}
                                            onChange={(val) => onAgcWindowChange(typeof val === 'number' ? val : parseFloat(val as string))}
                                            min={10}
                                            max={2000}
                                            step={10}
                                            disabled={loading}
                                            w={80}
                                            size="xs"
                                            hideControls
                                        />
                                        <Text size="10px" c="dimmed">ms</Text>
                                    </Group>
                                )}
                            </Stack>
                        </Fieldset>
                    </Group>
                </Tabs.Panel>
            </Tabs>
        </Paper>
    );
};
