import * as fs from 'fs';

const SAMPLES_PER_TRACE = 100;
const NUM_TRACES = 50;
const SAMPLE_INTERVAL = 4000; // microseconds
const SAMPLE_FORMAT = 5; // IEEE Float

const TEXT_HEADER_SIZE = 3200;
const BINARY_HEADER_SIZE = 400;
const TRACE_HEADER_SIZE = 240;

const bufferSize = TEXT_HEADER_SIZE + BINARY_HEADER_SIZE + NUM_TRACES * (TRACE_HEADER_SIZE + SAMPLES_PER_TRACE * 4);
const buffer = Buffer.alloc(bufferSize);

// Text Header (EBCDIC-ish, just spaces)
buffer.fill(0x40, 0, TEXT_HEADER_SIZE);

// Binary Header
const offset = TEXT_HEADER_SIZE;
buffer.writeInt32BE(1, offset + 0); // Job ID
buffer.writeInt32BE(1, offset + 4); // Line Number
buffer.writeInt32BE(1, offset + 8); // Reel Number
buffer.writeInt16BE(NUM_TRACES, offset + 12); // Traces per ensemble
buffer.writeInt16BE(NUM_TRACES, offset + 14); // Aux traces
buffer.writeInt16BE(SAMPLE_INTERVAL, offset + 16); // sampleInterval
buffer.writeInt16BE(SAMPLE_INTERVAL, offset + 18); // sampleIntervalOriginal
buffer.writeInt16BE(SAMPLES_PER_TRACE, offset + 20); // samplesPerTrace
buffer.writeInt16BE(SAMPLES_PER_TRACE, offset + 22); // samplesPerTraceOriginal
buffer.writeInt16BE(SAMPLE_FORMAT, offset + 24); // sampleFormat

// Traces
let traceOffset = TEXT_HEADER_SIZE + BINARY_HEADER_SIZE;
for (let t = 0; t < NUM_TRACES; t++) {
    // Trace Header
    buffer.writeInt32BE(t + 1, traceOffset + 0); // Trace sequence number
    buffer.writeInt32BE(t + 1, traceOffset + 4); // Trace sequence number in file
    buffer.writeInt16BE(SAMPLES_PER_TRACE, traceOffset + 114); // Samples in this trace

    // Data
    let dataOffset = traceOffset + TRACE_HEADER_SIZE;
    for (let s = 0; s < SAMPLES_PER_TRACE; s++) {
        // Sine wave
        const val = Math.sin((t / 10) * Math.PI * 2 + (s / 20) * Math.PI * 2);
        buffer.writeFloatBE(val, dataOffset);
        dataOffset += 4;
    }
    traceOffset += TRACE_HEADER_SIZE + SAMPLES_PER_TRACE * 4;
}

fs.writeFileSync('public/mock.sgy', buffer);
console.log('Mock SEG-Y file generated at public/mock.sgy');
