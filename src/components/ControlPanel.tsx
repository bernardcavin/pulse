
import React from 'react';
import { FileInput, Slider, FormGroup, Card, Elevation, Radio, RadioGroup, NumericInput } from '@blueprintjs/core';

interface ControlPanelProps {
    onFileUpload: (file: File) => void;
    gain: number;
    onGainChange: (val: number) => void;
    loading: boolean;
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
}

export const ControlPanel: React.FC<ControlPanelProps> = ({
    onFileUpload,
    gain,
    onGainChange,
    loading,
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
    onCustomColorsChange
}) => {

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        if (event.target.files && event.target.files.length > 0) {
            onFileUpload(event.target.files[0]);
        }
    };

    return (
        <Card elevation={Elevation.TWO} style={{ padding: '20px', height: '100%', minWidth: '300px', overflowY: 'auto' }}>
            <h3 className="bp5-heading">SEG-Y Viewer</h3>


            <FormGroup label="Load SEG-Y File" labelFor="file-input">
                <FileInput
                    text="Choose file..."
                    onInputChange={handleFileChange}
                    inputProps={{ accept: ".sgy,.segy" }}
                    disabled={loading}
                    fill
                />
            </FormGroup>

            <FormGroup label="Display Mode">
                <RadioGroup
                    onChange={(e) => {
                        const value = e.currentTarget.value;
                        if (value === 'wiggle') {
                            onDisplayWiggleChange(true);
                            onDisplayDensityChange(false);
                        } else if (value === 'density') {
                            onDisplayWiggleChange(false);
                            onDisplayDensityChange(true);
                        } else {
                            onDisplayWiggleChange(true);
                            onDisplayDensityChange(true);
                        }
                    }}
                    selectedValue={displayWiggle && displayDensity ? 'both' : displayWiggle ? 'wiggle' : 'density'}
                    disabled={loading}
                >
                    <Radio label="Wiggle Trace" value="wiggle" />
                    <Radio label="Variable Density" value="density" />
                    <Radio label="Both" value="both" />
                </RadioGroup>
            </FormGroup>

            <FormGroup label="Gain" labelFor="gain-slider">
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                    <div style={{ flex: 1 }}>
                        <Slider
                            min={0}
                            max={100}
                            stepSize={1}
                            labelStepSize={20}
                            labelRenderer={(value) => {
                                // Convert slider value to actual gain for display
                                const actualGain = Math.pow(value / 100, 2) * 10;
                                return actualGain.toFixed(1);
                            }}
                            onChange={(value) => {
                                // Exponential mapping: slider 0-100 -> gain 0-10
                                // Using exp to give more precision at lower values
                                const expGain = Math.pow(value / 100, 2) * 10;
                                onGainChange(expGain);
                            }}
                            value={Math.sqrt(gain / 10) * 100}
                            disabled={loading}
                        />
                    </div>
                    <NumericInput
                        value={gain}
                        onValueChange={onGainChange}
                        min={0}
                        max={10}
                        stepSize={0.1}
                        minorStepSize={0.01}
                        majorStepSize={1}
                        disabled={loading}
                        style={{ width: '80px' }}
                    />
                </div>
            </FormGroup>

            <FormGroup label="Wiggle Fill">
                <RadioGroup
                    onChange={(e) => onWiggleFillChange(e.currentTarget.value as 'none' | 'pos' | 'neg')}
                    selectedValue={wiggleFill}
                    disabled={loading || !displayWiggle}
                >
                    <Radio label="None" value="none" />
                    <Radio label="Positive (+)" value="pos" />
                    <Radio label="Negative (-)" value="neg" />
                </RadioGroup>
            </FormGroup>

            <FormGroup label="Horizontal Scale (Trace Width)">
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                    <div style={{ flex: 1 }}>
                        <Slider
                            min={0.5}
                            max={5.0}
                            stepSize={0.1}
                            labelStepSize={1}
                            onChange={onScaleXChange}
                            value={scaleX}
                            disabled={loading}
                        />
                    </div>
                    <NumericInput
                        value={scaleX}
                        onValueChange={onScaleXChange}
                        min={0.5}
                        max={5}
                        stepSize={0.1}
                        minorStepSize={0.01}
                        majorStepSize={0.5}
                        disabled={loading}
                        style={{ width: '80px' }}
                    />
                </div>
            </FormGroup>

            <FormGroup label="Vertical Scale (Sample Height)">
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                    <div style={{ flex: 1 }}>
                        <Slider
                            min={0.1}
                            max={5.0}
                            stepSize={0.1}
                            labelStepSize={1}
                            onChange={onScaleYChange}
                            value={scaleY}
                            disabled={loading}
                        />
                    </div>
                    <NumericInput
                        value={scaleY}
                        onValueChange={onScaleYChange}
                        min={0.1}
                        max={5}
                        stepSize={0.1}
                        minorStepSize={0.01}
                        majorStepSize={0.5}
                        disabled={loading}
                        style={{ width: '80px' }}
                    />

            <FormGroup label="X-Axis Display">
                <RadioGroup
                    onChange={(e) => onXAxisHeaderChange(e.currentTarget.value as 'trace' | 'cdp' | 'inline' | 'crossline')}
                    selectedValue={xAxisHeader}
                    disabled={loading}
                >
                    <Radio label="Trace Number" value="trace" />
                    <Radio label="CDP" value="cdp" />
                    <Radio label="Inline" value="inline" />
                    <Radio label="Crossline" value="crossline" />
                </RadioGroup>
            </FormGroup>
                </div>
            </FormGroup>

            <FormGroup label="Direction">
                <RadioGroup
                    onChange={(e) => onReverseChange(e.currentTarget.value === 'true')}
                    selectedValue={reverse.toString()}
                    disabled={loading}
                >
                    <Radio label="Normal" value="false" />
                    <Radio label="Reversed" value="true" />
                </RadioGroup>
            </FormGroup>

            {displayDensity && (
                <>
                    <FormGroup label="Color Map">
                        <RadioGroup
                            onChange={(e) => onColorMapChange(e.currentTarget.value as 'grey' | 'rwb' | 'custom')}
                            selectedValue={colorMap}
                            disabled={loading}
                        >
                            <Radio label="Greyscale" value="grey" />
                            <Radio label="Red-White-Blue" value="rwb" />
                            <Radio label="Custom" value="custom" />
                        </RadioGroup>
                    </FormGroup>

                    {colorMap === 'custom' && (
                        <FormGroup label="Custom Colors">
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    Negative (Min):
                                    <input
                                        type="color"
                                        value={customColors.min}
                                        onChange={(e) => onCustomColorsChange({ ...customColors, min: e.target.value })}
                                        disabled={loading}
                                    />
                                </label>
                                <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    Zero:
                                    <input
                                        type="color"
                                        value={customColors.zero}
                                        onChange={(e) => onCustomColorsChange({ ...customColors, zero: e.target.value })}
                                        disabled={loading}
                                    />
                                </label>
                                <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    Positive (Max):
                                    <input
                                        type="color"
                                        value={customColors.max}
                                        onChange={(e) => onCustomColorsChange({ ...customColors, max: e.target.value })}
                                        disabled={loading}
                                    />
                                </label>
                            </div>
                        </FormGroup>
                    )}
                </>
            )}
        </Card>
    );
};
