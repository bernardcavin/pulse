/**
 * Web Worker for Seismic Data Processing
 * Offloads CPU-intensive operations to background thread
 */

// Type definitions for messages
interface ProcessDensityMessage {
    type: 'processDensity';
    data: {
        traceData: Float32Array;
        numTraces: number;
        samplesPerTrace: number;
        gain: number;
        colorMap: 'grey' | 'rwb' | 'custom';
        customColors?: { min: string; zero: string; max: string };
        start: number;
        end: number;
    };
}

interface ProcessAGCMessage {
    type: 'processAGC';
    data: {
        traces: Float32Array[];
        sampleRateMs: number;
        windowMs: number;
    };
}

type WorkerMessage = ProcessDensityMessage | ProcessAGCMessage;

// Helper functions from SignalProcessing
function applyAGC(trace: Float32Array, sampleRateMs: number, windowMs: number): Float32Array {
    const windowSamples = Math.ceil(windowMs / sampleRateMs);
    const numSamples = trace.length;
    const output = new Float32Array(numSamples);

    for (let i = 0; i < numSamples; i++) {
        const start = Math.max(0, i - Math.floor(windowSamples / 2));
        const end = Math.min(numSamples, i + Math.ceil(windowSamples / 2));

        // Calculate RMS in window
        let sumSquares = 0;
        for (let j = start; j < end; j++) {
            sumSquares += trace[j] * trace[j];
        }
        const rms = Math.sqrt(sumSquares / (end - start));

        // Apply gain
        output[i] = rms > 0 ? trace[i] / rms : trace[i];
    }

    return output;
}

// Color mapping helper
function hexToRgb(hex: string): { r: number; g: number; b: number } {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
    } : { r: 0, g: 0, b: 0 };
}

function getRgbFromAmp(
    amp: number,
    gain: number,
    colorMap: 'grey' | 'rwb' | 'custom',
    customColors?: { min: string; zero: string; max: string }
): [number, number, number] {
    const val = amp * gain;

    if (colorMap === 'grey') {
        let v = (val + 1.0) * 0.5;
        v = Math.max(0, Math.min(1, v));
        const c = Math.floor(v * 255);
        return [c, c, c];
    } else if (colorMap === 'rwb') {
        if (val < 0) {
            const factor = Math.max(0, 1.0 + Math.max(-1.0, val));
            const c = Math.floor(factor * 255);
            return [255, c, c];
        } else {
            const factor = Math.min(1.0, val);
            const c = Math.floor((1 - factor) * 255);
            return [c, c, 255];
        }
    } else {
        if (!customColors) return [0, 0, 0];

        const minRgb = hexToRgb(customColors.min);
        const zeroRgb = hexToRgb(customColors.zero);
        const maxRgb = hexToRgb(customColors.max);

        if (val < 0) {
            const factor = Math.max(0, 1.0 + Math.max(-1.0, val));
            const r = minRgb.r + (zeroRgb.r - minRgb.r) * factor;
            const g = minRgb.g + (zeroRgb.g - minRgb.g) * factor;
            const b = minRgb.b + (zeroRgb.b - minRgb.b) * factor;
            return [r, g, b];
        } else {
            const factor = Math.min(1.0, val);
            const r = zeroRgb.r + (maxRgb.r - zeroRgb.r) * factor;
            const g = zeroRgb.g + (maxRgb.g - zeroRgb.g) * factor;
            const b = zeroRgb.b + (maxRgb.b - zeroRgb.b) * factor;
            return [r, g, b];
        }
    }
}

// Message handler
self.onmessage = (e: MessageEvent<WorkerMessage>) => {
    const message = e.data;

    if (message.type === 'processDensity') {
        const { traceData, samplesPerTrace, gain, colorMap, customColors, start, end } = message.data;
        const numLoaded = end - start;

        // Create ImageData buffer
        const imageDataBuffer = new Uint8ClampedArray(numLoaded * samplesPerTrace * 4);

        // Process each pixel
        for (let x = 0; x < numLoaded; x++) {
            const traceIndex = start + x;
            const offset = traceIndex * samplesPerTrace;

            for (let y = 0; y < samplesPerTrace; y++) {
                const amp = traceData[offset + y];
                const [r, g, b] = getRgbFromAmp(amp, gain, colorMap, customColors);

                const idx = (y * numLoaded + x) * 4;
                imageDataBuffer[idx] = r;
                imageDataBuffer[idx + 1] = g;
                imageDataBuffer[idx + 2] = b;
                imageDataBuffer[idx + 3] = 255; // Alpha
            }
        }

        // Return result with transfer for performance
        self.postMessage(
            {
                type: 'densityComplete',
                imageData: imageDataBuffer,
                width: numLoaded,
                height: samplesPerTrace
            },
            { transfer: [imageDataBuffer.buffer] }
        );
    } else if (message.type === 'processAGC') {
        const { traces, sampleRateMs, windowMs } = message.data;
        const processedTraces: Float32Array[] = [];

        for (const trace of traces) {
            processedTraces.push(applyAGC(trace, sampleRateMs, windowMs));
        }

        self.postMessage({
            type: 'agcComplete',
            traces: processedTraces
        });
    }
};

// Export empty object to make TypeScript happy as a module
export { };
