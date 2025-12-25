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
