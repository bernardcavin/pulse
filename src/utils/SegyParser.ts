
export const SampleFormat = {
    IBM_FLOAT: 1,
    INT_4_BYTE: 2,
    INT_2_BYTE: 3,
    FLOAT_4_BYTE: 5, // IEEE
    INT_1_BYTE: 8
} as const;

export type SampleFormat = typeof SampleFormat[keyof typeof SampleFormat];

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
    traceSequenceLine: number;
    traceSequenceFile: number;
    fieldRecord: number;
    traceNumber: number;
    energySourcePoint: number;
    cdp: number;
    cdpTrace: number;
    traceId: number;
    nSummedTraces: number;
    nStackedTraces: number;
    dataUse: number;
    offset: number;
    receiverElevation: number;
    sourceElevation: number;
    sourceDepth: number;
    receiverDatumElevation: number;
    sourceDatumElevation: number;
    sourceWaterDepth: number;
    receiverWaterDepth: number;
    scalarElevation: number;
    scalarCoordinates: number;
    sourceX: number;
    sourceY: number;
    groupX: number;
    groupY: number;
    coordinateUnits: number;
    weatheringVelocity: number;
    subweatheringVelocity: number;
    sourceUpholeTime: number;
    groupUpholeTime: number;
    sourceStaticCorrection: number;
    groupStaticCorrection: number;
    totalStaticApplied: number;
    lagTimeA: number;
    lagTimeB: number;
    delayRecordingTime: number;
    muteTimeStart: number;
    muteTimeEnd: number;
    samplesInThisTrace: number;
    sampleInterval: number;
    gainType: number;
    instrumentGainConstant: number;
    instrumentInitialGain: number;
    correlated: number;
    sweepFrequencyStart: number;
    sweepFrequencyEnd: number;
    sweepLength: number;
    sweepType: number;
    sweepTraceTaperLengthStart: number;
    sweepTraceTaperLengthEnd: number;
    taperType: number;
    aliasFilterFrequency: number;
    aliasFilterSlope: number;
    notchFilterFrequency: number;
    notchFilterSlope: number;
    lowCutFrequency: number;
    highCutFrequency: number;
    lowCutSlope: number;
    highCutSlope: number;
    yearDataRecorded: number;
    dayOfYear: number;
    hour: number;
    minute: number;
    second: number;
    timeBasisCode: number;
    traceWeightingFactor: number;
    geophoneGroupNumberRoll1: number;
    geophoneGroupNumberFirstTraceOriginal: number;
    geophoneGroupNumberLastTraceOriginal: number;
    gapSize: number;
    overTravel: number;
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

    parseTraces(binaryHeader: SegyBinaryHeader): Trace[] {
        const traces: Trace[] = [];
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

        while (offset + traceBlockSize <= fileSize) {
            const dv = this.dataView;

            // Parse Trace Header (subset of important fields)
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
                instrumentGainConstant: dv.getInt16(offset + 120, bigEndian),
                instrumentInitialGain: dv.getInt16(offset + 122, bigEndian),
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
            };

            // Parse Trace Data
            const data = new Float32Array(samplesPerTrace);
            let dataOffset = offset + 240;

            for (let i = 0; i < samplesPerTrace; i++) {
                if (sampleFormat === SampleFormat.IBM_FLOAT) {
                    const val = dv.getUint32(dataOffset, bigEndian);
                    data[i] = this.ibmToFloat(val);
                    dataOffset += 4;
                } else if (sampleFormat === SampleFormat.FLOAT_4_BYTE) {
                    data[i] = dv.getFloat32(dataOffset, bigEndian);
                    dataOffset += 4;
                } else if (sampleFormat === SampleFormat.INT_4_BYTE) {
                    data[i] = dv.getInt32(dataOffset, bigEndian);
                    dataOffset += 4;
                } else if (sampleFormat === SampleFormat.INT_2_BYTE) {
                    data[i] = dv.getInt16(dataOffset, bigEndian);
                    dataOffset += 2;
                } else if (sampleFormat === SampleFormat.INT_1_BYTE) {
                    data[i] = dv.getInt8(dataOffset);
                    dataOffset += 1;
                } else {
                    // Fallback or unknown
                    data[i] = 0;
                    dataOffset += bytesPerSample;
                }
            }

            traces.push({ header, data });
            offset += traceBlockSize;
        }

        return traces;
    }
}
