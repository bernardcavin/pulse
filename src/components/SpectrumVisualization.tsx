import { useMemo, useState } from 'react';
import { Stack, Group, Text, Select, Button, NumberInput, Switch, Divider, Loader, Center, Box } from '@mantine/core';
import { IconDownload } from '@tabler/icons-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import type { SpectrumResult, WindowType } from '../utils/SignalProcessing';

interface SpectrumVisualizationProps {
    spectrumData: SpectrumResult | null;
    traceIndex?: number | null;
    selection?: {
        traceStart: number;
        traceEnd: number;
        sampleStart: number;
        sampleEnd: number;
    } | null;
    canvasWidth?: number;
    canvasHeight?: number;
    isLoading?: boolean;
    activeSelections?: Array<{
        id: string;
        selection: { traceStart: number; traceEnd: number; sampleStart: number; sampleEnd: number };
        color: string;
        spectrumData?: SpectrumResult;
    }>;
}

export const SpectrumVisualization: React.FC<SpectrumVisualizationProps> = ({
    spectrumData,
    traceIndex = null,
    selection = null,
    canvasWidth = 400,
    canvasHeight = 300,
    isLoading = false,
    activeSelections = []
}) => {
    const [showGrid, setShowGrid] = useState(true);
    const [windowType, setWindowType] = useState<WindowType>('hanning');
    const [spectrumType, setSpectrumType] = useState<'magnitude' | 'power' | 'phase'>('magnitude');
    const [scaleType, setScaleType] = useState<'linear' | 'log'>('linear');
    const [maxFrequency, setMaxFrequency] = useState<number>(200);

    // Prepare chart data for multiple selections
    const chartData = useMemo(() => {
        if (activeSelections.length === 0) {
            // Fallback to single spectrum data if no active selections
            if (!spectrumData) return [];

            const data: Array<{ frequency: number;[key: string]: number }> = [];
            const frequencies = spectrumData.frequencies;
            let values: Float32Array;

            // Select data based on spectrum type
            switch (spectrumType) {
                case 'power':
                    values = spectrumData.power;
                    break;
                case 'phase':
                    values = spectrumData.phase;
                    break;
                case 'magnitude':
                default:
                    values = spectrumData.magnitude;
                    break;
            }

            // Filter by max frequency and apply scale
            for (let i = 0; i < frequencies.length; i++) {
                const freq = frequencies[i];
                if (freq > maxFrequency) break;

                let value = values[i];
                if (scaleType === 'log' && value > 0) {
                    value = Math.log10(value);
                }

                data.push({
                    frequency: Math.round(freq),
                    value: value
                });
            }

            return data;
        }

        // Multi-selection mode: combine all spectrums
        // Filter out selections without spectrum data
        const selectionsWithData = activeSelections.filter(sel => sel.spectrumData !== undefined);

        if (selectionsWithData.length === 0) {
            return [];
        }

        const data: Array<{ frequency: number;[key: string]: number }> = [];
        const maxLength = Math.max(...selectionsWithData.map(sel => sel.spectrumData!.frequencies.length));

        for (let i = 0; i < maxLength; i++) {
            const dataPoint: { frequency: number;[key: string]: number } = { frequency: 0 };

            selectionsWithData.forEach((sel, index) => {
                const specData = sel.spectrumData!;
                if (i >= specData.frequencies.length) return;

                const freq = specData.frequencies[i];
                if (freq > maxFrequency) return;

                // Use first selection's frequency as reference
                if (index === 0) {
                    dataPoint.frequency = Math.round(freq);
                }

                let values: Float32Array;
                switch (spectrumType) {
                    case 'power':
                        values = specData.power;
                        break;
                    case 'phase':
                        values = specData.phase;
                        break;
                    case 'magnitude':
                    default:
                        values = specData.magnitude;
                        break;
                }

                let value = values[i];
                if (scaleType === 'log' && value > 0) {
                    value = Math.log10(value);
                }

                dataPoint[`selection${index + 1}`] = value;
            });

            if (dataPoint.frequency > 0 && dataPoint.frequency <= maxFrequency) {
                data.push(dataPoint);
            }
        }

        return data;
    }, [spectrumData, activeSelections, spectrumType, scaleType, maxFrequency]);

    // Get Y-axis label
    const getYAxisLabel = () => {
        let label = '';
        switch (spectrumType) {
            case 'power':
                label = 'Power';
                break;
            case 'phase':
                label = 'Phase (rad)';
                break;
            case 'magnitude':
            default:
                label = 'Amplitude';
                break;
        }
        return scaleType === 'log' ? `${label} (log10)` : label;
    };

    // Custom tooltip
    const CustomTooltip = ({ active, payload }: any) => {
        if (active && payload && payload.length) {
            return (
                <div style={{
                    backgroundColor: 'white',
                    padding: '8px 12px',
                    border: '1px solid #ccc',
                    borderRadius: '4px',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                }}>
                    <Text size="xs" fw={600}>Frequency: {payload[0].payload.frequency.toFixed(2)} Hz</Text>
                    <Text size="xs" c="blue">{getYAxisLabel()}: {payload[0].value.toFixed(4)}</Text>
                    {spectrumData && (
                        <Text size="xs" c="dimmed" mt={4}>
                            Dominant: {spectrumData.dominantFrequency.toFixed(2)} Hz
                        </Text>
                    )}
                </div>
            );
        }
        return null;
    };

    if (isLoading) {
        return (
            <Center style={{ minHeight: '200px' }}>
                <Stack align="center" gap="md">
                    <Loader size="md" />
                    <Text size="sm" c="dimmed">Calculating spectrum...</Text>
                </Stack>
            </Center>
        );
    }

    if (!spectrumData) {
        return (
            <Center style={{ minHeight: '200px' }}>
                <Text c="dimmed">No spectrum data available</Text>
            </Center>
        );
    }

    return (
        <Stack gap="md">


            {/* Controls */}
            <Stack gap="xs">
                <Group grow>
                    <Select
                        label="Window Type"
                        value={windowType}
                        onChange={(val) => setWindowType(val as WindowType)}
                        data={[
                            { value: 'hanning', label: 'Hanning' },
                            { value: 'hamming', label: 'Hamming' },
                            { value: 'blackman', label: 'Blackman' },
                            { value: 'none', label: 'None' }
                        ]}
                        size="xs"
                    />
                    <Select
                        label="Spectrum Type"
                        value={spectrumType}
                        onChange={(val) => setSpectrumType(val as 'magnitude' | 'power' | 'phase')}
                        data={[
                            { value: 'magnitude', label: 'Magnitude' },
                            { value: 'power', label: 'Power' },
                            { value: 'phase', label: 'Phase' }
                        ]}
                        size="xs"
                    />
                </Group>

                <Group grow>
                    <Select
                        label="Scale Type"
                        value={scaleType}
                        onChange={(val) => setScaleType(val as 'linear' | 'log')}
                        data={[
                            { value: 'linear', label: 'Linear' },
                            { value: 'log', label: 'Logarithmic' }
                        ]}
                        size="xs"
                    />
                    <NumberInput
                        label="Max Frequency (Hz)"
                        value={maxFrequency}
                        onChange={(val) => setMaxFrequency(typeof val === 'number' ? val : parseFloat(val as string))}
                        min={10}
                        max={1000}
                        step={10}
                        size="xs"
                    />
                </Group>
            </Stack>

            {/* Chart */}
            <div style={{ width: '100%', height: canvasHeight }}>
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                        data={chartData}
                        margin={{ top: 10, right: 30, left: 10, bottom: 10 }}
                    >
                        {showGrid && <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />}
                        <XAxis
                            dataKey="frequency"
                            label={{ value: 'Frequency (Hz)', position: 'insideBottom', offset: -5 }}
                            tick={{ fontSize: 12 }}
                        />
                        <YAxis
                            label={{ value: getYAxisLabel(), angle: -90, position: 'insideLeft' }}
                            tick={{ fontSize: 12 }}
                        />
                        <Tooltip content={<CustomTooltip />} />
                        {activeSelections.length > 0 && <Legend wrapperStyle={{ paddingTop: '16px' }} />}

                        {activeSelections.length === 0 ? (
                            <Line
                                type="monotone"
                                dataKey="value"
                                stroke="#2563eb"
                                strokeWidth={2}
                                dot={false}
                                name={getYAxisLabel()}
                                isAnimationActive={false}
                            />
                        ) : (
                            activeSelections.map((sel, index) => {
                                // Convert rgba color to hex for stroke
                                const strokeColor = sel.color.replace('0.3', '1.0');
                                return (
                                    <Line
                                        key={sel.id}
                                        type="monotone"
                                        dataKey={`selection${index + 1}`}
                                        stroke={strokeColor}
                                        strokeWidth={2}
                                        dot={false}
                                        name={`Selection #${index + 1}`}
                                        isAnimationActive={false}
                                    />
                                );
                            })
                        )}
                    </LineChart>
                </ResponsiveContainer>
            </div>

            {/* Info */}
            <Group gap="xl" justify="center">
                <div>
                    <Text size="xs" c="dimmed">Dominant Frequency</Text>
                    <Text size="sm" fw={600}>{spectrumData.dominantFrequency.toFixed(2)} Hz</Text>
                </div>
                <div>
                    <Text size="xs" c="dimmed">Nyquist Frequency</Text>
                    <Text size="sm" fw={600}>{spectrumData.frequencies[spectrumData.frequencies.length - 1].toFixed(2)} Hz</Text>
                </div>
                <div>
                    <Text size="xs" c="dimmed">Sample Rate</Text>
                    <Text size="sm" fw={600}>{(spectrumData.frequencies[spectrumData.frequencies.length - 1] * 2).toFixed(2)} Hz</Text>
                </div>
            </Group>

            <Divider />



            <Stack gap="xs">
                <Switch
                    label="Show Grid"
                    checked={showGrid}
                    onChange={(e) => setShowGrid(e.currentTarget.checked)}
                    size="sm"
                />
            </Stack>

            <Divider />

            <Button
                leftSection={<IconDownload size={16} />}
                onClick={() => {
                    if (!spectrumData) return;
                    const lines = ['Frequency (Hz),Magnitude,Power,Phase (rad)'];
                    for (let i = 0; i < spectrumData.frequencies.length; i++) {
                        lines.push(
                            `${spectrumData.frequencies[i]},${spectrumData.magnitude[i]},${spectrumData.power[i]},${spectrumData.phase[i]}`
                        );
                    }
                    const csv = lines.join('\n');
                    const blob = new Blob([csv], { type: 'text/csv' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    const filename = selection
                        ? `spectrum_2d_selection_${Date.now()}.csv`
                        : `spectrum_trace_${traceIndex ?? 'unknown'}_${Date.now()}.csv`;
                    a.download = filename;
                    a.click();
                    URL.revokeObjectURL(url);
                }}
                variant="light"
                size="xs"
                fullWidth
            >
                Export Spectrum Data (CSV)
            </Button>
        </Stack>
    );
};
