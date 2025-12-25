import { SegyParser, type SegyData } from './SegyParser';

// Define message types
export type WorkerMessage =

    | {
        type: 'RENDER_DENSITY', data: {
            traces: Float32Array[];
            height: number;
            gain: number;
            colorMap: 'grey' | 'rwb' | 'custom';
            customColors: { min: string, zero: string, max: string };
        }
    };

export type WorkerResponse =
    | { type: 'SUCCESS', data: SegyData, header: any, textHeader: string }
    | { type: 'RENDER_SUCCESS', buffer: Uint8ClampedArray, width: number, height: number }
    | { type: 'ERROR', error: string }
    | { type: 'PROGRESS', percent: number };

// Cast self to any to avoid TS lib issues with Worker types in this context
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const ctx: Worker = self as any;

const hexToRgb = (hex: string) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
    } : { r: 0, g: 0, b: 0 };
};

ctx.onmessage = (e: MessageEvent<WorkerMessage>) => {
    const { type } = e.data;

    if (type === 'PARSE') {
        try {
            const buffer = e.data.buffer;

            // We can't easily report progress from inside SegyParser without modifying it to accept a callback
            // For now, let's just parse.
            const parser = new SegyParser(buffer);
            const textHeader = parser.parseEbcidicHeader();
            const binaryHeader = parser.parseBinaryHeader();
            const segyData = parser.parseTraces(binaryHeader);

            // Transfer the buffer back
            const response: WorkerResponse = {
                type: 'SUCCESS',
                data: segyData,
                header: binaryHeader,
                textHeader: textHeader
            };

            // Transfer the huge data buffer to avoid copy
            ctx.postMessage(response, [segyData.data.buffer]);

        } catch (error) {
            ctx.postMessage({
                type: 'ERROR',
                error: (error as Error).message
            });
        }
    } else if (type === 'RENDER_DENSITY') {
        try {
            const { traces, height, gain, colorMap, customColors } = e.data.data;
            const width = traces.length;

            // Create buffer for pixel data (RGBA)
            const buffer = new Uint8ClampedArray(width * height * 4);

            // Pre-calculate colors for custom map
            let minR = 0, minG = 0, minB = 0;
            let zeroR = 0, zeroG = 0, zeroB = 0;
            let maxR = 0, maxG = 0, maxB = 0;
            let customDiffMinR = 0, customDiffMinG = 0, customDiffMinB = 0;
            let customDiffMaxR = 0, customDiffMaxG = 0, customDiffMaxB = 0;

            if (colorMap === 'custom') {
                const minC = hexToRgb(customColors.min);
                const zeroC = hexToRgb(customColors.zero);
                const maxC = hexToRgb(customColors.max);
                minR = minC.r; minG = minC.g; minB = minC.b;
                zeroR = zeroC.r; zeroG = zeroC.g; zeroB = zeroC.b;
                maxR = maxC.r; maxG = maxC.g; maxB = maxC.b;

                customDiffMinR = zeroR - minR;
                customDiffMinG = zeroG - minG;
                customDiffMinB = zeroB - minB;
                customDiffMaxR = maxR - zeroR;
                customDiffMaxG = maxG - zeroG;
                customDiffMaxB = maxB - zeroB;
            }

            for (let x = 0; x < width; x++) {
                const trace = traces[x];
                let bufIdx = x * 4;
                const stride = width * 4;

                for (let y = 0; y < height; y++) {
                    const amp = trace[y];
                    const val = amp * gain;

                    let r = 0, g = 0, b = 0;

                    if (colorMap === 'grey') {
                        let v = (val + 1.0) * 0.5;
                        if (v < 0) v = 0;
                        else if (v > 1) v = 1;
                        const c = (v * 255) | 0;
                        r = c; g = c; b = c;
                    } else if (colorMap === 'rwb') {
                        if (val < 0) {
                            let factor = 1.0 + val;
                            if (factor < 0) factor = 0;
                            const c = (factor * 255) | 0;
                            r = 255; g = c; b = c;
                        } else {
                            let factor = val;
                            if (factor > 1) factor = 1;
                            const c = ((1.0 - factor) * 255) | 0;
                            r = c; g = c; b = 255;
                        }
                    } else {
                        // Custom
                        if (val < 0) {
                            let factor = 1.0 + val;
                            if (factor < 0) factor = 0;
                            r = (minR + customDiffMinR * factor) | 0;
                            g = (minG + customDiffMinG * factor) | 0;
                            b = (minB + customDiffMinB * factor) | 0;
                        } else {
                            let factor = val;
                            if (factor > 1) factor = 1;
                            r = (zeroR + customDiffMaxR * factor) | 0;
                            g = (zeroG + customDiffMaxG * factor) | 0;
                            b = (zeroB + customDiffMaxB * factor) | 0;
                        }
                    }

                    buffer[bufIdx] = r;
                    buffer[bufIdx + 1] = g;
                    buffer[bufIdx + 2] = b;
                    buffer[bufIdx + 3] = 255;

                    bufIdx += stride;
                }
            }

            ctx.postMessage({
                type: 'RENDER_SUCCESS',
                buffer,
                width,
                height
            }, [buffer.buffer]); // Transfer buffer

        } catch (error) {
            ctx.postMessage({
                type: 'ERROR',
                error: (error as Error).message
            });
        }
    }
};
