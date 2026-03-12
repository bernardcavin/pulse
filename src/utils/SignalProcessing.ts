/**
 * Applies Automatic Gain Control (AGC) to a seismic trace using an RMS sliding window.
 * 
 * @param data The input trace data array (float32).
 * @param sampleRateMs Sample rate in milliseconds.
 * @param windowSizeMs The size of the sliding window in milliseconds.
 * @returns A new Float32Array with AGC applied.
 */
export function applyAGC(data: Float32Array | number[], sampleRateMs: number, windowSizeMs: number): Float32Array {
    const n = data.length;
    const output = new Float32Array(n);
    const windowSamples = Math.max(1, Math.round(windowSizeMs / sampleRateMs));
    const halfWindow = Math.floor(windowSamples / 2);

    // Epsilon to prevent division by zero
    const epsilon = 1e-10;

    // Calculate squared amplitudes
    const squared = new Float32Array(n);
    for (let i = 0; i < n; i++) {
        squared[i] = data[i] * data[i];
    }

    // Calculate RMS in a sliding window
    // Optimized sliding window average
    let currentSum = 0;

    // Initial window sum
    // For the start, we assume zeros before index 0
    // We'll compute the sum for the window centered at 0: [-halfWindow, +halfWindow]
    // Valid indices are [0, halfWindow]
    for (let i = 0; i <= halfWindow && i < n; i++) {
        currentSum += squared[i];
    }

    // Process each sample
    for (let i = 0; i < n; i++) {
        // Window range for center 'i' is [i - halfWindow, i + halfWindow]
        // As we move from i to i+1:
        // Remove (i - halfWindow) if it was in range
        // Add (i + 1 + halfWindow) if it is in range

        const removeIdx = i - halfWindow - 1;
        const addIdx = i + halfWindow;

        if (removeIdx >= 0) {
            currentSum -= squared[removeIdx];
        }
        if (addIdx < n) {
            currentSum += squared[addIdx];
        }

        // Avoid negative sums due to float precision
        if (currentSum < 0) currentSum = 0;

        // Current window size (handling edges)
        const start = Math.max(0, i - halfWindow);
        const end = Math.min(n - 1, i + halfWindow);
        const count = end - start + 1;

        const meanSquare = currentSum / count;
        const rms = Math.sqrt(meanSquare);

        // Apply gain: sample / rms
        // Scale by a factor to maintain reasonable amplitude range (e.g., target RMS of 1.0 or similar)
        // Without scaling, RMS normalized data will have amplitude ~1.0
        output[i] = data[i] / (rms + epsilon);
    }

    return output;
}

/**
 * Complex number representation for FFT
 */
interface Complex {
    real: number;
    imag: number;
}

/**
 * Window function types for spectral analysis
 */
export type WindowType = 'none' | 'hanning' | 'hamming' | 'blackman';

/**
 * Apply a window function to the input data to reduce spectral leakage
 * 
 * @param data Input signal data
 * @param windowType Type of window to apply
 * @returns Windowed data
 */
export function applyWindow(data: Float32Array | number[], windowType: WindowType): Float32Array {
    const n = data.length;
    const output = new Float32Array(n);

    switch (windowType) {
        case 'hanning':
            for (let i = 0; i < n; i++) {
                const window = 0.5 * (1 - Math.cos(2 * Math.PI * i / (n - 1)));
                output[i] = data[i] * window;
            }
            break;

        case 'hamming':
            for (let i = 0; i < n; i++) {
                const window = 0.54 - 0.46 * Math.cos(2 * Math.PI * i / (n - 1));
                output[i] = data[i] * window;
            }
            break;

        case 'blackman':
            for (let i = 0; i < n; i++) {
                const window = 0.42 - 0.5 * Math.cos(2 * Math.PI * i / (n - 1)) + 0.08 * Math.cos(4 * Math.PI * i / (n - 1));
                output[i] = data[i] * window;
            }
            break;

        case 'none':
        default:
            for (let i = 0; i < n; i++) {
                output[i] = data[i];
            }
            break;
    }

    return output;
}

/**
 * Fast Fourier Transform using Cooley-Tukey algorithm
 * Input size must be a power of 2
 * 
 * @param data Input signal (real values)
 * @returns Array of complex numbers representing frequency domain
 */
export function fft(data: Float32Array | number[]): Complex[] {
    const n = data.length;

    // Check if n is a power of 2
    if (n === 0 || (n & (n - 1)) !== 0) {
        throw new Error('FFT input size must be a power of 2');
    }

    // Base case
    if (n === 1) {
        return [{ real: data[0], imag: 0 }];
    }

    // Divide
    const even: number[] = [];
    const odd: number[] = [];
    for (let i = 0; i < n; i++) {
        if (i % 2 === 0) {
            even.push(data[i]);
        } else {
            odd.push(data[i]);
        }
    }

    // Conquer
    const fftEven = fft(new Float32Array(even));
    const fftOdd = fft(new Float32Array(odd));

    // Combine
    const result: Complex[] = new Array(n);
    for (let k = 0; k < n / 2; k++) {
        const angle = -2 * Math.PI * k / n;
        const twiddle: Complex = {
            real: Math.cos(angle),
            imag: Math.sin(angle)
        };

        // Complex multiplication: twiddle * fftOdd[k]
        const twiddleOdd: Complex = {
            real: twiddle.real * fftOdd[k].real - twiddle.imag * fftOdd[k].imag,
            imag: twiddle.real * fftOdd[k].imag + twiddle.imag * fftOdd[k].real
        };

        result[k] = {
            real: fftEven[k].real + twiddleOdd.real,
            imag: fftEven[k].imag + twiddleOdd.imag
        };

        result[k + n / 2] = {
            real: fftEven[k].real - twiddleOdd.real,
            imag: fftEven[k].imag - twiddleOdd.imag
        };
    }

    return result;
}

/**
 * Pad data to the next power of 2 with zeros
 * 
 * @param data Input data
 * @returns Padded data with length as power of 2
 */
export function padToPowerOfTwo(data: Float32Array | number[]): Float32Array {
    const n = data.length;
    const nextPowerOfTwo = Math.pow(2, Math.ceil(Math.log2(n)));
    const padded = new Float32Array(nextPowerOfTwo);
    for (let i = 0; i < n; i++) {
        padded[i] = data[i];
    }
    return padded;
}

/**
 * Calculate magnitude spectrum from FFT output
 * 
 * @param fftOutput Complex FFT output
 * @returns Magnitude spectrum (only positive frequencies)
 */
export function getMagnitudeSpectrum(fftOutput: Complex[]): Float32Array {
    const n = fftOutput.length;
    const halfN = Math.floor(n / 2) + 1; // Include DC and Nyquist
    const magnitude = new Float32Array(halfN);

    for (let i = 0; i < halfN; i++) {
        magnitude[i] = Math.sqrt(fftOutput[i].real * fftOutput[i].real + fftOutput[i].imag * fftOutput[i].imag);
    }

    return magnitude;
}

/**
 * Calculate power spectrum from FFT output
 * 
 * @param fftOutput Complex FFT output
 * @returns Power spectrum (only positive frequencies)
 */
export function getPowerSpectrum(fftOutput: Complex[]): Float32Array {
    const n = fftOutput.length;
    const halfN = Math.floor(n / 2) + 1;
    const power = new Float32Array(halfN);

    for (let i = 0; i < halfN; i++) {
        const magnitude = Math.sqrt(fftOutput[i].real * fftOutput[i].real + fftOutput[i].imag * fftOutput[i].imag);
        power[i] = magnitude * magnitude;
    }

    return power;
}

/**
 * Calculate phase spectrum from FFT output
 * 
 * @param fftOutput Complex FFT output
 * @returns Phase spectrum in radians (only positive frequencies)
 */
export function getPhaseSpectrum(fftOutput: Complex[]): Float32Array {
    const n = fftOutput.length;
    const halfN = Math.floor(n / 2) + 1;
    const phase = new Float32Array(halfN);

    for (let i = 0; i < halfN; i++) {
        phase[i] = Math.atan2(fftOutput[i].imag, fftOutput[i].real);
    }

    return phase;
}

/**
 * Generate frequency axis for spectrum
 * 
 * @param numSamples Number of samples in the original signal
 * @param sampleRateMs Sample rate in milliseconds
 * @returns Frequency values in Hz (only positive frequencies)
 */
export function getFrequencyAxis(numSamples: number, sampleRateMs: number): Float32Array {
    const sampleRateHz = 1000 / sampleRateMs; // Convert ms to Hz
    const halfN = Math.floor(numSamples / 2) + 1;
    const frequencies = new Float32Array(halfN);

    for (let i = 0; i < halfN; i++) {
        frequencies[i] = i * sampleRateHz / numSamples;
    }

    return frequencies;
}

/**
 * Spectrum analysis result
 */
export interface SpectrumResult {
    frequencies: Float32Array;  // Frequency values in Hz
    magnitude: Float32Array;    // Magnitude spectrum
    power: Float32Array;        // Power spectrum
    phase: Float32Array;        // Phase spectrum in radians
    dominantFrequency: number;  // Frequency with maximum amplitude
    peakAmplitude: number;      // Maximum amplitude value
}

/**
 * Compute complete spectrum analysis for a trace
 * 
 * @param data Input trace data
 * @param sampleRateMs Sample rate in milliseconds
 * @param windowType Window function to apply
 * @returns Complete spectrum analysis result
 */
export function computeSpectrum(
    data: Float32Array | number[],
    sampleRateMs: number,
    windowType: WindowType = 'hanning'
): SpectrumResult {
    // Apply window function
    const windowed = applyWindow(data, windowType);

    // Pad to power of 2
    const padded = padToPowerOfTwo(windowed);

    // Compute FFT
    const fftOutput = fft(padded);

    // Calculate spectra
    const magnitude = getMagnitudeSpectrum(fftOutput);
    const power = getPowerSpectrum(fftOutput);
    const phase = getPhaseSpectrum(fftOutput);
    const frequencies = getFrequencyAxis(padded.length, sampleRateMs);

    // Find dominant frequency (excluding DC component at index 0)
    let maxAmplitude = 0;
    let dominantFreqIndex = 0;
    for (let i = 1; i < magnitude.length; i++) {
        if (magnitude[i] > maxAmplitude) {
            maxAmplitude = magnitude[i];
            dominantFreqIndex = i;
        }
    }

    return {
        frequencies,
        magnitude,
        power,
        phase,
        dominantFrequency: frequencies[dominantFreqIndex],
        peakAmplitude: maxAmplitude
    };
}

/**
 * Compute averaged spectrum from a 2D selection (multiple traces and time window)
 * 
 * @param allData Flattened seismic data array
 * @param selection Selection bounds (trace and sample indices)
 * @param samplesPerTrace Number of samples per trace
 * @param sampleRateMs Sample rate in milliseconds
 * @param windowType Window function to apply
 * @returns Averaged spectrum result
 */
export function compute2DSpectrum(
    allData: Float32Array,
    selection: {
        traceStart: number;
        traceEnd: number;
        sampleStart: number;
        sampleEnd: number;
    },
    samplesPerTrace: number,
    sampleRateMs: number,
    windowType: WindowType = 'hanning'
): SpectrumResult {
    const { traceStart, traceEnd, sampleStart, sampleEnd } = selection;
    const numTraces = traceEnd - traceStart + 1;
    const numSamples = sampleEnd - sampleStart + 1;

    // Collect all spectra
    const spectra: SpectrumResult[] = [];

    for (let traceIdx = traceStart; traceIdx <= traceEnd; traceIdx++) {
        // Extract time window from this trace
        const traceOffset = traceIdx * samplesPerTrace;
        const traceData = allData.subarray(
            traceOffset + sampleStart,
            traceOffset + sampleEnd + 1
        );

        // Compute spectrum for this trace
        const spectrum = computeSpectrum(traceData, sampleRateMs, windowType);
        spectra.push(spectrum);
    }

    // Average all spectra (element-wise)
    const firstSpectrum = spectra[0];
    const avgMagnitude = new Float32Array(firstSpectrum.magnitude.length);
    const avgPower = new Float32Array(firstSpectrum.power.length);
    const avgPhase = new Float32Array(firstSpectrum.phase.length);

    // Sum all spectra
    for (const spectrum of spectra) {
        for (let i = 0; i < avgMagnitude.length; i++) {
            avgMagnitude[i] += spectrum.magnitude[i];
            avgPower[i] += spectrum.power[i];
            avgPhase[i] += spectrum.phase[i];
        }
    }

    // Divide by number of traces to get average
    for (let i = 0; i < avgMagnitude.length; i++) {
        avgMagnitude[i] /= numTraces;
        avgPower[i] /= numTraces;
        avgPhase[i] /= numTraces;
    }

    // Find dominant frequency from averaged magnitude spectrum
    let maxAmplitude = 0;
    let dominantFreqIndex = 0;
    for (let i = 1; i < avgMagnitude.length; i++) {
        if (avgMagnitude[i] > maxAmplitude) {
            maxAmplitude = avgMagnitude[i];
            dominantFreqIndex = i;
        }
    }

    return {
        frequencies: firstSpectrum.frequencies,
        magnitude: avgMagnitude,
        power: avgPower,
        phase: avgPhase,
        dominantFrequency: firstSpectrum.frequencies[dominantFreqIndex],
        peakAmplitude: maxAmplitude
    };
}
