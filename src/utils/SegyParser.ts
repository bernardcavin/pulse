
export const SampleFormat = {
    IBM_FLOAT: 1,
    INT_4_BYTE: 2,
    INT_2_BYTE: 3,
    FLOAT_4_BYTE: 5, // IEEE
    INT_1_BYTE: 8
} as const;

export type SampleFormat = typeof SampleFormat[keyof typeof SampleFormat];

export interface SegyData {
    data: Float32Array; // Flattened data
    headers: SegyTraceHeader[];
    samplesPerTrace: number;
    numTraces: number;
}

export interface SegyBinaryHeader {
    jobId: number;
    lineKey: number;
    reelKey: number;
    tracesPerEnsemble: number;
    auxTracesPerEnsemble: number;
    sampleInterval: number; // microseconds
    sampleIntervalOriginal: number;
    samplesPerTrace: number;
    samplesPerTraceOriginal: number;
    sampleFormat: SampleFormat;
    ensembleFold: number;
    traceSorting: number;
    verticalSumCode: number;
    sweepFrequencyStart: number;
    sweepFrequencyEnd: number;
    sweepLength: number;
    sweepType: number;
    traceNumberSweepChannel: number;
    sweepTraceTaperLengthStart: number;
    sweepTraceTaperLengthEnd: number;
    taperType: number;
    correlatedDataTraces: number;
    binaryGain: number;
    amplitudeRecoveryMethod: number;
    measurementSystem: number; // 1 = Meters, 2 = Feet
    impulseSignalPolarity: number;
    vibratoryPolarityCode: number;
}

export interface SegyTraceHeader {
    // Bytes 1-4: Trace sequence number within line
    traceSequenceLine: number;
    // Bytes 5-8: Trace sequence number within reel
    traceSequenceFile: number;
    // Bytes 9-12: FFID - Original field record number
    fieldRecord: number;
    // Bytes 13-16: Trace number within field record
    traceNumber: number;
    // Bytes 17-20: SP - Energy source point number
    energySourcePoint: number;
    // Bytes 21-24: CDP ensemble number
    cdp: number;
    // Bytes 25-28: Trace number
    cdpTrace: number;
    // Bytes 29-30: Trace identification code
    traceId: number;
    // Bytes 31-32: Number of vertically summed traces
    nSummedTraces: number;
    // Bytes 33-34: Number of horizontally stacked traces
    nStackedTraces: number;
    // Bytes 35-36: Data use (1-production, 2-test)
    dataUse: number;
    // Bytes 37-40: Distance from source point to receiver group
    offset: number;
    // Bytes 41-44: Receiver group elevation
    receiverElevation: number;
    // Bytes 45-48: Surface elevation at source
    sourceElevation: number;
    // Bytes 49-52: Source depth below surface
    sourceDepth: number;
    // Bytes 53-56: Datum elevation at receiver group
    receiverDatumElevation: number;
    // Bytes 57-60: Datum elevation at source
    sourceDatumElevation: number;
    // Bytes 61-64: Water depth at source
    sourceWaterDepth: number;
    // Bytes 65-68: Water depth at group
    receiverWaterDepth: number;
    // Bytes 69-70: Scalar to all elevations & depths
    scalarElevation: number;
    // Bytes 71-72: Scalar to all coordinates
    scalarCoordinates: number;
    // Bytes 73-76: Source X coordinate
    sourceX: number;
    // Bytes 77-80: Source Y coordinate
    sourceY: number;
    // Bytes 81-84: Group X coordinate
    groupX: number;
    // Bytes 85-88: Group Y coordinate
    groupY: number;
    // Bytes 89-90: Coordinate units (1-len/m, 2-sec/arc)
    coordinateUnits: number;
    // Bytes 91-92: Weathering velocity
    weatheringVelocity: number;
    // Bytes 93-94: Subweathering velocity
    subweatheringVelocity: number;
    // Bytes 95-96: Uphole time at source
    sourceUpholeTime: number;
    // Bytes 97-98: Uphole time at group
    groupUpholeTime: number;
    // Bytes 99-100: Source static correction
    sourceStaticCorrection: number;
    // Bytes 101-102: Group static correction
    groupStaticCorrection: number;
    // Bytes 103-104: Total static applied
    totalStaticApplied: number;
    // Bytes 105-106: Lag time A
    lagTimeA: number;
    // Bytes 107-108: Lag time B
    lagTimeB: number;
    // Bytes 109-110: Delay recording time
    delayRecordingTime: number;
    // Bytes 111-112: Mute time start
    muteTimeStart: number;
    // Bytes 113-114: Mute time end
    muteTimeEnd: number;
    // Bytes 115-116: Number of samples in this trace
    samplesInThisTrace: number;
    // Bytes 117-118: Sample interval (µs)
    sampleInterval: number;
    // Bytes 119-120: Gain type of field instruments
    gainType: number;
    // Bytes 121-122: Instrument gain
    instrumentInitialGain: number;
    // Bytes 123-124: Instrument gain constant
    instrumentGainConstant: number;
    // Bytes 125-126: Correlated (1-yes / 2-no)
    correlated: number;
    // Bytes 127-128: Sweep frequency at start
    sweepFrequencyStart: number;
    // Bytes 129-130: Sweep frequency at end
    sweepFrequencyEnd: number;
    // Bytes 131-132: Sweep length (ms)
    sweepLength: number;
    // Bytes 133-134: Sweep type (1-lin,2-parabol,3-exp,4-other)
    sweepType: number;
    // Bytes 135-136: Sweep trace taper length at start (ms)
    sweepTraceTaperLengthStart: number;
    // Bytes 137-138: Sweep trace taper length at end (ms)
    sweepTraceTaperLengthEnd: number;
    // Bytes 139-140: Taper type (1-lin,2-cos²,3-other)
    taperType: number;
    // Bytes 141-142: Alias filter frequency (if used)
    aliasFilterFrequency: number;
    // Bytes 143-144: Alias filter slope
    aliasFilterSlope: number;
    // Bytes 145-146: Notch filter frequency (if used)
    notchFilterFrequency: number;
    // Bytes 147-148: Notch filter slope
    notchFilterSlope: number;
    // Bytes 149-150: Low-cut frequency (if used)
    lowCutFrequency: number;
    // Bytes 151-152: High-cut frequency (if used)
    highCutFrequency: number;
    // Bytes 153-154: Low-cut slope
    lowCutSlope: number;
    // Bytes 155-156: High-cut slope
    highCutSlope: number;
    // Bytes 157-158: Year data recorded
    yearDataRecorded: number;
    // Bytes 159-160: Day of year
    dayOfYear: number;
    // Bytes 161-162: Hour of day
    hour: number;
    // Bytes 163-164: Minute of hour
    minute: number;
    // Bytes 165-166: Second of minute
    second: number;
    // Bytes 167-168: Time basis code (1-local,2-GMT,3-other)
    timeBasisCode: number;
    // Bytes 169-170: Trace weighting factor
    traceWeightingFactor: number;
    // Bytes 171-172: Geophone group number of roll sw pos 1
    geophoneGroupNumberRoll1: number;
    // Bytes 173-174: Geophone group number of trace #1
    geophoneGroupNumberFirstTraceOriginal: number;
    // Bytes 175-176: Geophone group number of last trace
    geophoneGroupNumberLastTraceOriginal: number;
    // Bytes 177-178: Gap size (total # of groups dropped)
    gapSize: number;
    // Bytes 179-180: Overtravel assoc w taper of beg/end line
    overTravel: number;
    // Bytes 181-184: CDP X
    cdpX: number;
    // Bytes 185-188: CDP Y
    cdpY: number;
    // Bytes 189-192: Inline number
    inlineNumber: number;
    // Bytes 193-196: Crossline number
    crosslineNumber: number;
    // Bytes 197-200: Shot point number
    shotPointNumber: number;
    // Bytes 201-202: Shot point scalar
    shotPointScalar: number;
    // Bytes 203-204: Trace value measurement unit
    traceValueMeasurementUnit: number;
}

export interface Trace {
    header: SegyTraceHeader;
    data: Float32Array;
}

// Simple lookup for EBCDIC to ASCII (subset)
const EBCDIC_TO_ASCII = [
    0, 1, 2, 3, 156, 9, 134, 127, 151, 141, 142, 11, 12, 13, 14, 15,
    16, 17, 18, 19, 157, 133, 8, 135, 24, 25, 146, 143, 28, 29, 30, 31,
    128, 129, 130, 131, 132, 10, 23, 27, 136, 137, 138, 139, 140, 5, 6, 7,
    144, 145, 22, 147, 148, 149, 150, 4, 152, 153, 154, 155, 20, 21, 158, 26,
    32, 160, 161, 162, 163, 164, 165, 166, 167, 168, 91, 46, 60, 40, 43, 33,
    38, 169, 170, 171, 172, 173, 174, 175, 176, 177, 93, 36, 42, 41, 59, 94,
    45, 47, 178, 179, 180, 181, 182, 183, 184, 185, 124, 44, 37, 95, 62, 63,
    186, 187, 188, 189, 190, 191, 192, 193, 194, 96, 58, 35, 64, 39, 61, 34,
    195, 97, 98, 99, 100, 101, 102, 103, 104, 105, 196, 197, 198, 199, 200, 201,
    202, 106, 107, 108, 109, 110, 111, 112, 113, 114, 203, 204, 205, 206, 207, 208,
    209, 126, 115, 116, 117, 118, 119, 120, 121, 122, 210, 211, 212, 213, 214, 215,
    216, 217, 218, 219, 220, 221, 222, 223, 224, 225, 226, 227, 228, 229, 230, 231,
    123, 65, 66, 67, 68, 69, 70, 71, 72, 73, 232, 233, 234, 235, 236, 237,
    125, 74, 75, 76, 77, 78, 79, 80, 81, 82, 238, 239, 240, 241, 242, 243,
    92, 159, 83, 84, 85, 86, 87, 88, 89, 90, 244, 245, 246, 247, 248, 249,
    48, 49, 50, 51, 52, 53, 54, 55, 56, 57, 250, 251, 252, 253, 254, 255
];

export class SegyParser {
    private buffer: ArrayBuffer;
    private dataView: DataView;

    constructor(buffer: ArrayBuffer) {
        this.buffer = buffer;
        this.dataView = new DataView(buffer);
    }

    parseEbcidicHeader(): string {
        let header = "";
        for (let i = 0; i < 3200; i++) {
            const byte = this.dataView.getUint8(i);
            header += String.fromCharCode(EBCDIC_TO_ASCII[byte]);
        }
        return header;
    }

    parseBinaryHeader(): SegyBinaryHeader {
        const offset = 3200;
        const dv = this.dataView;
        const bigEndian = false; // SEG-Y is usually Big Endian, so littleEndian=false

        return {
            jobId: dv.getInt32(offset + 0, bigEndian),
            lineKey: dv.getInt32(offset + 4, bigEndian),
            reelKey: dv.getInt32(offset + 8, bigEndian),
            tracesPerEnsemble: dv.getInt16(offset + 12, bigEndian),
            auxTracesPerEnsemble: dv.getInt16(offset + 14, bigEndian),
            sampleInterval: dv.getInt16(offset + 16, bigEndian),
            sampleIntervalOriginal: dv.getInt16(offset + 18, bigEndian),
            samplesPerTrace: dv.getInt16(offset + 20, bigEndian),
            samplesPerTraceOriginal: dv.getInt16(offset + 22, bigEndian),
            sampleFormat: dv.getInt16(offset + 24, bigEndian) as SampleFormat,
            ensembleFold: dv.getInt16(offset + 26, bigEndian),
            traceSorting: dv.getInt16(offset + 28, bigEndian),
            verticalSumCode: dv.getInt16(offset + 30, bigEndian),
            sweepFrequencyStart: dv.getInt16(offset + 32, bigEndian),
            sweepFrequencyEnd: dv.getInt16(offset + 34, bigEndian),
            sweepLength: dv.getInt16(offset + 36, bigEndian),
            sweepType: dv.getInt16(offset + 38, bigEndian),
            traceNumberSweepChannel: dv.getInt16(offset + 40, bigEndian),
            sweepTraceTaperLengthStart: dv.getInt16(offset + 42, bigEndian),
            sweepTraceTaperLengthEnd: dv.getInt16(offset + 44, bigEndian),
            taperType: dv.getInt16(offset + 46, bigEndian),
            correlatedDataTraces: dv.getInt16(offset + 48, bigEndian),
            binaryGain: dv.getInt16(offset + 50, bigEndian),
            amplitudeRecoveryMethod: dv.getInt16(offset + 52, bigEndian),
            measurementSystem: dv.getInt16(offset + 54, bigEndian),
            impulseSignalPolarity: dv.getInt16(offset + 56, bigEndian),
            vibratoryPolarityCode: dv.getInt16(offset + 58, bigEndian),
        };
    }

    // Basic IBM Float conversion (simplified)
    private ibmToFloat(val: number): number {
        if (val === 0) return 0.0;
        const sign = (val >> 31) & 0x01;
        const exponent = (val >> 24) & 0x7f;
        const mantissa = val & 0x00ffffff;

        // IBM float: 16^exponent * fraction
        // Exponent is excess-64
        const p = Math.pow(16, exponent - 64);
        const f = mantissa / Math.pow(2, 24);

        const res = (sign ? -1 : 1) * f * p;
        return res;
    }

    parseTraces(binaryHeader: SegyBinaryHeader): SegyData {
        const headers: SegyTraceHeader[] = [];
        let offset = 3600; // 3200 + 400
        const bigEndian = false;
        const samplesPerTrace = binaryHeader.samplesPerTrace;
        const sampleFormat = binaryHeader.sampleFormat;

        // Safety check for infinite loop or bad file
        const fileSize = this.buffer.byteLength;

        // Calculate trace size
        let bytesPerSample = 4;
        if (sampleFormat === SampleFormat.INT_2_BYTE) bytesPerSample = 2;
        if (sampleFormat === SampleFormat.INT_1_BYTE) bytesPerSample = 1;

        const traceDataSize = samplesPerTrace * bytesPerSample;
        const traceBlockSize = 240 + traceDataSize;

        // Estimate number of traces to pre-allocate
        // Available bytes / bytes per trace
        const availableBytes = fileSize - 3600;
        const numTracesEstimate = Math.floor(availableBytes / traceBlockSize);

        // Allocate flattened buffer
        // Using SharedArrayBuffer could be even better for workers, but standard Float32Array is fine for transfer
        const totalSamples = numTracesEstimate * samplesPerTrace;
        const allData = new Float32Array(totalSamples);

        let traceIndex = 0;

        while (offset + traceBlockSize <= fileSize) {
            const dv = this.dataView;

            // Parse Trace Header (all 76 fields according to SEG-Y standard)
            const header: SegyTraceHeader = {
                traceSequenceLine: dv.getInt32(offset + 0, bigEndian),
                traceSequenceFile: dv.getInt32(offset + 4, bigEndian),
                fieldRecord: dv.getInt32(offset + 8, bigEndian),
                traceNumber: dv.getInt32(offset + 12, bigEndian),
                energySourcePoint: dv.getInt32(offset + 16, bigEndian),
                cdp: dv.getInt32(offset + 20, bigEndian),
                cdpTrace: dv.getInt32(offset + 24, bigEndian),
                traceId: dv.getInt16(offset + 28, bigEndian),
                nSummedTraces: dv.getInt16(offset + 30, bigEndian),
                nStackedTraces: dv.getInt16(offset + 32, bigEndian),
                dataUse: dv.getInt16(offset + 34, bigEndian),
                offset: dv.getInt32(offset + 36, bigEndian),
                receiverElevation: dv.getInt32(offset + 40, bigEndian),
                sourceElevation: dv.getInt32(offset + 44, bigEndian),
                sourceDepth: dv.getInt32(offset + 48, bigEndian),
                receiverDatumElevation: dv.getInt32(offset + 52, bigEndian),
                sourceDatumElevation: dv.getInt32(offset + 56, bigEndian),
                sourceWaterDepth: dv.getInt32(offset + 60, bigEndian),
                receiverWaterDepth: dv.getInt32(offset + 64, bigEndian),
                scalarElevation: dv.getInt16(offset + 68, bigEndian),
                scalarCoordinates: dv.getInt16(offset + 70, bigEndian),
                sourceX: dv.getInt32(offset + 72, bigEndian),
                sourceY: dv.getInt32(offset + 76, bigEndian),
                groupX: dv.getInt32(offset + 80, bigEndian),
                groupY: dv.getInt32(offset + 84, bigEndian),
                coordinateUnits: dv.getInt16(offset + 88, bigEndian),
                weatheringVelocity: dv.getInt16(offset + 90, bigEndian),
                subweatheringVelocity: dv.getInt16(offset + 92, bigEndian),
                sourceUpholeTime: dv.getInt16(offset + 94, bigEndian),
                groupUpholeTime: dv.getInt16(offset + 96, bigEndian),
                sourceStaticCorrection: dv.getInt16(offset + 98, bigEndian),
                groupStaticCorrection: dv.getInt16(offset + 100, bigEndian),
                totalStaticApplied: dv.getInt16(offset + 102, bigEndian),
                lagTimeA: dv.getInt16(offset + 104, bigEndian),
                lagTimeB: dv.getInt16(offset + 106, bigEndian),
                delayRecordingTime: dv.getInt16(offset + 108, bigEndian),
                muteTimeStart: dv.getInt16(offset + 110, bigEndian),
                muteTimeEnd: dv.getInt16(offset + 112, bigEndian),
                samplesInThisTrace: dv.getInt16(offset + 114, bigEndian),
                sampleInterval: dv.getInt16(offset + 116, bigEndian),
                gainType: dv.getInt16(offset + 118, bigEndian),
                instrumentInitialGain: dv.getInt16(offset + 120, bigEndian),
                instrumentGainConstant: dv.getInt16(offset + 122, bigEndian),
                correlated: dv.getInt16(offset + 124, bigEndian),
                sweepFrequencyStart: dv.getInt16(offset + 126, bigEndian),
                sweepFrequencyEnd: dv.getInt16(offset + 128, bigEndian),
                sweepLength: dv.getInt16(offset + 130, bigEndian),
                sweepType: dv.getInt16(offset + 132, bigEndian),
                sweepTraceTaperLengthStart: dv.getInt16(offset + 134, bigEndian),
                sweepTraceTaperLengthEnd: dv.getInt16(offset + 136, bigEndian),
                taperType: dv.getInt16(offset + 138, bigEndian),
                aliasFilterFrequency: dv.getInt16(offset + 140, bigEndian),
                aliasFilterSlope: dv.getInt16(offset + 142, bigEndian),
                notchFilterFrequency: dv.getInt16(offset + 144, bigEndian),
                notchFilterSlope: dv.getInt16(offset + 146, bigEndian),
                lowCutFrequency: dv.getInt16(offset + 148, bigEndian),
                highCutFrequency: dv.getInt16(offset + 150, bigEndian),
                lowCutSlope: dv.getInt16(offset + 152, bigEndian),
                highCutSlope: dv.getInt16(offset + 154, bigEndian),
                yearDataRecorded: dv.getInt16(offset + 156, bigEndian),
                dayOfYear: dv.getInt16(offset + 158, bigEndian),
                hour: dv.getInt16(offset + 160, bigEndian),
                minute: dv.getInt16(offset + 162, bigEndian),
                second: dv.getInt16(offset + 164, bigEndian),
                timeBasisCode: dv.getInt16(offset + 166, bigEndian),
                traceWeightingFactor: dv.getInt16(offset + 168, bigEndian),
                geophoneGroupNumberRoll1: dv.getInt16(offset + 170, bigEndian),
                geophoneGroupNumberFirstTraceOriginal: dv.getInt16(offset + 172, bigEndian),
                geophoneGroupNumberLastTraceOriginal: dv.getInt16(offset + 174, bigEndian),
                gapSize: dv.getInt16(offset + 176, bigEndian),
                overTravel: dv.getInt16(offset + 178, bigEndian),
                cdpX: dv.getInt32(offset + 180, bigEndian),
                cdpY: dv.getInt32(offset + 184, bigEndian),
                inlineNumber: dv.getInt32(offset + 188, bigEndian),
                crosslineNumber: dv.getInt32(offset + 192, bigEndian),
                shotPointNumber: dv.getInt32(offset + 196, bigEndian),
                shotPointScalar: dv.getInt16(offset + 200, bigEndian),
                traceValueMeasurementUnit: dv.getInt16(offset + 202, bigEndian),
            };

            headers.push(header);

            // Parse Trace Data
            // Write directly to the flattened array
            let dataOffset = offset + 240;
            const startSampleIndex = traceIndex * samplesPerTrace;

            for (let i = 0; i < samplesPerTrace; i++) {
                let val = 0;
                if (sampleFormat === SampleFormat.IBM_FLOAT) {
                    const raw = dv.getUint32(dataOffset, bigEndian);
                    val = this.ibmToFloat(raw);
                    dataOffset += 4;
                } else if (sampleFormat === SampleFormat.FLOAT_4_BYTE) {
                    val = dv.getFloat32(dataOffset, bigEndian);
                    dataOffset += 4;
                } else if (sampleFormat === SampleFormat.INT_4_BYTE) {
                    val = dv.getInt32(dataOffset, bigEndian);
                    dataOffset += 4;
                } else if (sampleFormat === SampleFormat.INT_2_BYTE) {
                    val = dv.getInt16(dataOffset, bigEndian);
                    dataOffset += 2;
                } else if (sampleFormat === SampleFormat.INT_1_BYTE) {
                    val = dv.getInt8(dataOffset);
                    dataOffset += 1;
                } else {
                    // Fallback
                    dataOffset += bytesPerSample;
                }
                allData[startSampleIndex + i] = val;
            }

            offset += traceBlockSize;
            traceIndex++;
        }

        // If we overestimated, slice the array?
        // Actually it's better to just return the whole thing or slice if there's a significant difference.
        // Usually file size estimation is accurate for SEG-Y.

        // However, if the file was truncated, traceIndex might be less than estimate.
        if (traceIndex < numTracesEstimate) {
            return {
                data: allData.slice(0, traceIndex * samplesPerTrace),
                headers,
                samplesPerTrace,
                numTraces: traceIndex
            };
        }

        return {
            data: allData,
            headers,
            samplesPerTrace,
            numTraces: traceIndex
        };
    }
}
