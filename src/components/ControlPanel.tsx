import { FileInput, Slider, Paper, Radio, NumberInput, Group, Stack, Switch, ColorInput, Fieldset, Text, Select, Tabs, Button } from '@mantine/core';
import type { SegyData, SegyBinaryHeader } from '../utils/SegyParser';

interface ControlPanelProps {
    onFileUpload: (file: File) => void;
    gain: number;
    onGainChange: (val: number) => void;
    loading: boolean;
    segyData: SegyData | null;
    binaryHeader: SegyBinaryHeader | null;
    textHeader: string | null;
    onShowFileDetails: () => void;
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
    xAxisHeader: 'trace' | 'cdp' | 'inline' | 'crossline';
    onXAxisHeaderChange: (val: 'trace' | 'cdp' | 'inline' | 'crossline') => void;
    availableHeaders: string[]; // ['trace', 'cdp', 'inline', 'crossline'] (subset)
    agcEnabled: boolean;
    onAgcEnabledChange: (val: boolean) => void;
    agcWindow: number;
    onAgcWindowChange: (val: number) => void;
    showGridlines: boolean;
    onShowGridlinesChange: (val: boolean) => void;
}

export const ControlPanel: React.FC<ControlPanelProps> = ({
    onFileUpload,
    gain,
    onGainChange,
    loading,
    segyData,
    binaryHeader,
    textHeader,
    onShowFileDetails,
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
    xAxisHeader,
    onXAxisHeaderChange,
    onColorMapChange,
    customColors,
    onCustomColorsChange,
    availableHeaders = ['trace'],
    agcEnabled,
    onAgcEnabledChange,
    agcWindow,
    onAgcWindowChange,
    showGridlines,
    onShowGridlinesChange
}) => {

    const handleFileChange = (payload: File | null) => {
        if (payload) {
            onFileUpload(payload);
        }
    };

    return (
        <Paper shadow="xs" p={6} withBorder style={{ width: '100%', height: '160px', zIndex: 10, overflow: 'hidden' }}>
            <Tabs defaultValue="file" variant='outline' radius="sm">
                <Tabs.List mb={4}>
                    <Tabs.Tab value="file" style={{ fontSize: '11px', padding: '4px 10px', height: '24px', outline: 'none' }}>File</Tabs.Tab>
                    <Tabs.Tab value="display" style={{ fontSize: '11px', padding: '4px 10px', height: '24px', outline: 'none' }}>Display</Tabs.Tab>
                    <Tabs.Tab value="processing" style={{ fontSize: '11px', padding: '4px 10px', height: '24px', outline: 'none' }}>Processing</Tabs.Tab>
                </Tabs.List>

                <Tabs.Panel value="file" pt={0}>
                    <Group align="flex-start" gap="xs" style={{ height: '124px' }}>
                        <Fieldset legend="File" p="xs" style={{ minWidth: '140px' }}>
                            <Stack gap="xs">
                                <FileInput
                                    placeholder="Load .sgy"
                                    onChange={handleFileChange}
                                    accept=".sgy,.segy"
                                    disabled={loading}
                                    size="xs"
                                    w={120}
                                />
                                {segyData && binaryHeader && (
                                    <Button
                                        variant="light"
                                        size="xs"
                                        onClick={onShowFileDetails}
                                        w={120}
                                    >
                                        Show Details
                                    </Button>
                                )}
                            </Stack>
                        </Fieldset>
                    </Group>
                </Tabs.Panel>

                <Tabs.Panel value="display" pt={0}>
                    <Group align="flex-start" gap="xs">
                        <Fieldset legend="Display Mode" p="xs">
                            <Stack gap={4}>
                                <Switch
                                    label="Wiggle"
                                    checked={displayWiggle}
                                    onChange={(e) => onDisplayWiggleChange(e.currentTarget.checked)}
                                    disabled={loading}
                                    size="xs"
                                />
                                <Switch
                                    label="Density"
                                    checked={displayDensity}
                                    onChange={(e) => onDisplayDensityChange(e.currentTarget.checked)}
                                    disabled={loading}
                                    size="xs"
                                />
                            </Stack>
                        </Fieldset>

                        <Fieldset legend="Scale" p="xs">
                            <Stack gap={4}>
                                <Group gap="xs">
                                    <Text size="xs">X:</Text>
                                    <Slider
                                        w={60}
                                        min={0.5}
                                        max={5.0}
                                        step={0.1}
                                        onChange={onScaleXChange}
                                        value={scaleX}
                                        disabled={loading}
                                        label={null}
                                        size="xs"
                                    />
                                    <Text size="xs">Y:</Text>
                                    <Slider
                                        w={60}
                                        min={0.1}
                                        max={5.0}
                                        step={0.1}
                                        onChange={onScaleYChange}
                                        value={scaleY}
                                        disabled={loading}
                                        label={null}
                                        size="xs"
                                    />
                                </Group>
                                <Switch
                                    label="Gridlines"
                                    checked={showGridlines}
                                    onChange={(e) => onShowGridlinesChange(e.currentTarget.checked)}
                                    disabled={loading}
                                    size="xs"
                                />
                                <Select
                                    data={[
                                        { value: 'trace', label: 'Trace' },
                                        { value: 'cdp', label: 'CDP', disabled: !availableHeaders.includes('cdp') },
                                        { value: 'inline', label: 'Inline', disabled: !availableHeaders.includes('inline') },
                                        { value: 'crossline', label: 'XLine', disabled: !availableHeaders.includes('crossline') }
                                    ]}
                                    value={xAxisHeader}
                                    onChange={(val) => onXAxisHeaderChange(val as any)}
                                    size="xs"
                                    placeholder="X-Axis"
                                    w={100}
                                />
                            </Stack>
                        </Fieldset>

                        <Fieldset legend="Wiggle" p="xs">
                            <Radio.Group
                                value={wiggleFill}
                                onChange={(value) => onWiggleFillChange(value as 'none' | 'pos' | 'neg')}
                                size="xs"
                            >
                                <Group gap="xs">
                                    <Radio label="None" value="none" disabled={loading || !displayWiggle} size="xs" />
                                    <Radio label="Pos (+)" value="pos" disabled={loading || !displayWiggle} size="xs" />
                                    <Radio label="Neg (-)" value="neg" disabled={loading || !displayWiggle} size="xs" />
                                </Group>
                            </Radio.Group>
                        </Fieldset>

                        {displayDensity && (
                            <Fieldset legend="Density" p="xs">
                                <Stack gap={4}>
                                    <Radio.Group
                                        value={colorMap}
                                        onChange={(val) => onColorMapChange(val as 'grey' | 'rwb' | 'custom')}
                                        size="xs"
                                    >
                                        <Group gap="xs">
                                            <Radio label="Grey" value="grey" disabled={loading} size="xs" />
                                            <Radio label="RWB" value="rwb" disabled={loading} size="xs" />
                                            <Radio label="Custom" value="custom" disabled={loading} size="xs" />
                                        </Group>
                                    </Radio.Group>
                                    <Group gap="xs">
                                        <Switch
                                            label="Reverse"
                                            checked={reverse}
                                            onChange={(e) => onReverseChange(e.currentTarget.checked)}
                                            disabled={loading}
                                            size="xs"
                                        />
                                        {colorMap === 'custom' && (
                                            <>
                                                <ColorInput
                                                    value={customColors.min}
                                                    onChange={(val) => onCustomColorsChange({ ...customColors, min: val })}
                                                    disabled={loading}
                                                    size="xs"
                                                    w={30}
                                                    variant="unstyled"
                                                    withEyeDropper={false}
                                                />
                                                <ColorInput
                                                    value={customColors.zero}
                                                    onChange={(val) => onCustomColorsChange({ ...customColors, zero: val })}
                                                    disabled={loading}
                                                    size="xs"
                                                    w={30}
                                                    variant="unstyled"
                                                    withEyeDropper={false}
                                                />
                                                <ColorInput
                                                    value={customColors.max}
                                                    onChange={(val) => onCustomColorsChange({ ...customColors, max: val })}
                                                    disabled={loading}
                                                    size="xs"
                                                    w={30}
                                                    variant="unstyled"
                                                    withEyeDropper={false}
                                                />
                                            </>
                                        )}
                                    </Group>
                                </Stack>
                            </Fieldset>
                        )}
                    </Group>
                </Tabs.Panel>

                <Tabs.Panel value="processing" pt={0}>
                    <Group align="flex-start" gap="xs">
                        <Fieldset legend="Gain" p="xs">
                            <Stack gap={4}>
                                <Group gap="xs" align="center">
                                    <Text size="xs" component="label">Level:</Text>
                                    <Slider
                                        w={80}
                                        min={0}
                                        max={100}
                                        step={1}
                                        label={null}
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
                                        w={50}
                                        size="xs"
                                        hideControls
                                    />
                                </Group>
                                <Group gap="xs">
                                    <Switch
                                        label="AGC"
                                        checked={agcEnabled}
                                        onChange={(e) => onAgcEnabledChange(e.currentTarget.checked)}
                                        disabled={loading}
                                        size="xs"
                                    />
                                    {agcEnabled && (
                                        <NumberInput
                                            placeholder="Window"
                                            value={agcWindow}
                                            onChange={(val) => onAgcWindowChange(typeof val === 'number' ? val : parseFloat(val as string))}
                                            min={10}
                                            max={2000}
                                            step={10}
                                            disabled={loading}
                                            w={60}
                                            size="xs"
                                            hideControls
                                        />
                                    )}
                                </Group>
                            </Stack>
                        </Fieldset>
                    </Group>
                </Tabs.Panel>
            </Tabs>
        </Paper>
    );
};
