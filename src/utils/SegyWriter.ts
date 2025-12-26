import type { SegyData, SegyBinaryHeader, SegyTraceHeader, SampleFormat } from './SegyParser';
import { SampleFormat as SF } from './SegyParser';

// ASCII to EBCDIC lookup table (inverse of EBCDIC_TO_ASCII)
const ASCII_TO_EBCDIC: number[] = new Array(256).fill(0);

// Initialize ASCII to EBCDIC conversion table
(() => {
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

    for (let ebcdic = 0; ebcdic < 256; ebcdic++) {
        const ascii = EBCDIC_TO_ASCII[ebcdic];
        ASCII_TO_EBCDIC[ascii] = ebcdic;
    }
})();

export class SegyWriter {
    /**
     * Encode ASCII text to EBCDIC format (3200 bytes for SEG-Y text header)
     */
    static encodeEbcdicHeader(text: string): ArrayBuffer {
        const buffer = new ArrayBuffer(3200);
        const view = new Uint8Array(buffer);

        // Fill with spaces in EBCDIC (0x40)
        view.fill(ASCII_TO_EBCDIC[32]);

        // Convert text to EBCDIC
        const maxLength = Math.min(text.length, 3200);
        for (let i = 0; i < maxLength; i++) {
            const charCode = text.charCodeAt(i);
            view[i] = ASCII_TO_EBCDIC[charCode] || ASCII_TO_EBCDIC[32];
        }

        return buffer;
    }

    /**
     * Encode binary header (400 bytes)
     */
    static encodeBinaryHeader(header: SegyBinaryHeader): ArrayBuffer {
        const buffer = new ArrayBuffer(400);
        const view = new DataView(buffer);
        const bigEndian = false; // SEG-Y is big-endian (littleEndian=false)

        view.setInt32(0, header.jobId, bigEndian);
        view.setInt32(4, header.lineKey, bigEndian);
        view.setInt32(8, header.reelKey, bigEndian);
        view.setInt16(12, header.tracesPerEnsemble, bigEndian);
        view.setInt16(14, header.auxTracesPerEnsemble, bigEndian);
        view.setInt16(16, header.sampleInterval, bigEndian);
        view.setInt16(18, header.sampleIntervalOriginal, bigEndian);
        view.setInt16(20, header.samplesPerTrace, bigEndian);
        view.setInt16(22, header.samplesPerTraceOriginal, bigEndian);
        view.setInt16(24, header.sampleFormat, bigEndian);
        view.setInt16(26, header.ensembleFold, bigEndian);
        view.setInt16(28, header.traceSorting, bigEndian);
        view.setInt16(30, header.verticalSumCode, bigEndian);
        view.setInt16(32, header.sweepFrequencyStart, bigEndian);
        view.setInt16(34, header.sweepFrequencyEnd, bigEndian);
        view.setInt16(36, header.sweepLength, bigEndian);
        view.setInt16(38, header.sweepType, bigEndian);
        view.setInt16(40, header.traceNumberSweepChannel, bigEndian);
        view.setInt16(42, header.sweepTraceTaperLengthStart, bigEndian);
        view.setInt16(44, header.sweepTraceTaperLengthEnd, bigEndian);
        view.setInt16(46, header.taperType, bigEndian);
        view.setInt16(48, header.correlatedDataTraces, bigEndian);
        view.setInt16(50, header.binaryGain, bigEndian);
        view.setInt16(52, header.amplitudeRecoveryMethod, bigEndian);
        view.setInt16(54, header.measurementSystem, bigEndian);
        view.setInt16(56, header.impulseSignalPolarity, bigEndian);
        view.setInt16(58, header.vibratoryPolarityCode, bigEndian);

        return buffer;
    }

    /**
     * Encode trace header (240 bytes)
     */
    static encodeTraceHeader(header: SegyTraceHeader): ArrayBuffer {
        const buffer = new ArrayBuffer(240);
        const view = new DataView(buffer);
        const bigEndian = false;

        view.setInt32(0, header.traceSequenceLine, bigEndian);
        view.setInt32(4, header.traceSequenceFile, bigEndian);
        view.setInt32(8, header.fieldRecord, bigEndian);
        view.setInt32(12, header.traceNumber, bigEndian);
        view.setInt32(16, header.energySourcePoint, bigEndian);
        view.setInt32(20, header.cdp, bigEndian);
        view.setInt32(24, header.cdpTrace, bigEndian);
        view.setInt16(28, header.traceId, bigEndian);
        view.setInt16(30, header.nSummedTraces, bigEndian);
        view.setInt16(32, header.nStackedTraces, bigEndian);
        view.setInt16(34, header.dataUse, bigEndian);
        view.setInt32(36, header.offset, bigEndian);
        view.setInt32(40, header.receiverElevation, bigEndian);
        view.setInt32(44, header.sourceElevation, bigEndian);
        view.setInt32(48, header.sourceDepth, bigEndian);
        view.setInt32(52, header.receiverDatumElevation, bigEndian);
        view.setInt32(56, header.sourceDatumElevation, bigEndian);
        view.setInt32(60, header.sourceWaterDepth, bigEndian);
        view.setInt32(64, header.receiverWaterDepth, bigEndian);
        view.setInt16(68, header.scalarElevation, bigEndian);
        view.setInt16(70, header.scalarCoordinates, bigEndian);
        view.setInt32(72, header.sourceX, bigEndian);
        view.setInt32(76, header.sourceY, bigEndian);
        view.setInt32(80, header.groupX, bigEndian);
        view.setInt32(84, header.groupY, bigEndian);
        view.setInt16(88, header.coordinateUnits, bigEndian);
        view.setInt16(90, header.weatheringVelocity, bigEndian);
        view.setInt16(92, header.subweatheringVelocity, bigEndian);
        view.setInt16(94, header.sourceUpholeTime, bigEndian);
        view.setInt16(96, header.groupUpholeTime, bigEndian);
        view.setInt16(98, header.sourceStaticCorrection, bigEndian);
        view.setInt16(100, header.groupStaticCorrection, bigEndian);
        view.setInt16(102, header.totalStaticApplied, bigEndian);
        view.setInt16(104, header.lagTimeA, bigEndian);
        view.setInt16(106, header.lagTimeB, bigEndian);
        view.setInt16(108, header.delayRecordingTime, bigEndian);
        view.setInt16(110, header.muteTimeStart, bigEndian);
        view.setInt16(112, header.muteTimeEnd, bigEndian);
        view.setInt16(114, header.samplesInThisTrace, bigEndian);
        view.setInt16(116, header.sampleInterval, bigEndian);
        view.setInt16(118, header.gainType, bigEndian);
        view.setInt16(120, header.instrumentInitialGain, bigEndian);
        view.setInt16(122, header.instrumentGainConstant, bigEndian);
        view.setInt16(124, header.correlated, bigEndian);
        view.setInt16(126, header.sweepFrequencyStart, bigEndian);
        view.setInt16(128, header.sweepFrequencyEnd, bigEndian);
        view.setInt16(130, header.sweepLength, bigEndian);
        view.setInt16(132, header.sweepType, bigEndian);
        view.setInt16(134, header.sweepTraceTaperLengthStart, bigEndian);
        view.setInt16(136, header.sweepTraceTaperLengthEnd, bigEndian);
        view.setInt16(138, header.taperType, bigEndian);
        view.setInt16(140, header.aliasFilterFrequency, bigEndian);
        view.setInt16(142, header.aliasFilterSlope, bigEndian);
        view.setInt16(144, header.notchFilterFrequency, bigEndian);
        view.setInt16(146, header.notchFilterSlope, bigEndian);
        view.setInt16(148, header.lowCutFrequency, bigEndian);
        view.setInt16(150, header.highCutFrequency, bigEndian);
        view.setInt16(152, header.lowCutSlope, bigEndian);
        view.setInt16(154, header.highCutSlope, bigEndian);
        view.setInt16(156, header.yearDataRecorded, bigEndian);
        view.setInt16(158, header.dayOfYear, bigEndian);
        view.setInt16(160, header.hour, bigEndian);
        view.setInt16(162, header.minute, bigEndian);
        view.setInt16(164, header.second, bigEndian);
        view.setInt16(166, header.timeBasisCode, bigEndian);
        view.setInt16(168, header.traceWeightingFactor, bigEndian);
        view.setInt16(170, header.geophoneGroupNumberRoll1, bigEndian);
        view.setInt16(172, header.geophoneGroupNumberFirstTraceOriginal, bigEndian);
        view.setInt16(174, header.geophoneGroupNumberLastTraceOriginal, bigEndian);
        view.setInt16(176, header.gapSize, bigEndian);
        view.setInt16(178, header.overTravel, bigEndian);
        view.setInt32(180, header.cdpX, bigEndian);
        view.setInt32(184, header.cdpY, bigEndian);
        view.setInt32(188, header.inlineNumber, bigEndian);
        view.setInt32(192, header.crosslineNumber, bigEndian);
        view.setInt32(196, header.shotPointNumber, bigEndian);
        view.setInt16(200, header.shotPointScalar, bigEndian);
        view.setInt16(202, header.traceValueMeasurementUnit, bigEndian);

        return buffer;
    }

    /**
     * Convert float to IBM Float format
     */
    private static floatToIbm(value: number): number {
        if (value === 0) return 0;

        const sign = value < 0 ? 1 : 0;
        const absValue = Math.abs(value);

        // Convert to base-16 exponent
        const exponent = Math.floor(Math.log(absValue) / Math.log(16));
        const mantissa = absValue / Math.pow(16, exponent);

        // Normalize mantissa to 0.0625 <= mantissa < 1.0
        const normalizedMantissa = mantissa / 16;

        // IBM exponent is excess-64
        const ibmExponent = exponent + 64 + 1;

        // Convert mantissa to 24-bit integer
        const mantissaInt = Math.floor(normalizedMantissa * Math.pow(2, 24));

        // Combine sign, exponent, and mantissa
        return (sign << 31) | (ibmExponent << 24) | (mantissaInt & 0x00FFFFFF);
    }

    /**
     * Encode trace data samples
     */
    static encodeTraceData(data: Float32Array, format: SampleFormat, samplesPerTrace: number): ArrayBuffer {
        let bytesPerSample = 4;
        if (format === SF.INT_2_BYTE) bytesPerSample = 2;
        if (format === SF.INT_1_BYTE) bytesPerSample = 1;

        const buffer = new ArrayBuffer(samplesPerTrace * bytesPerSample);
        const view = new DataView(buffer);
        const bigEndian = false;

        for (let i = 0; i < samplesPerTrace; i++) {
            const value = i < data.length ? data[i] : 0;

            if (format === SF.IBM_FLOAT) {
                const ibmValue = this.floatToIbm(value);
                view.setUint32(i * 4, ibmValue, bigEndian);
            } else if (format === SF.FLOAT_4_BYTE) {
                view.setFloat32(i * 4, value, bigEndian);
            } else if (format === SF.INT_4_BYTE) {
                view.setInt32(i * 4, Math.round(value), bigEndian);
            } else if (format === SF.INT_2_BYTE) {
                view.setInt16(i * 2, Math.round(value), bigEndian);
            } else if (format === SF.INT_1_BYTE) {
                view.setInt8(i, Math.round(value));
            }
        }

        return buffer;
    }

    /**
     * Write complete SEG-Y file
     */
    static writeSegy(
        textHeader: string,
        binaryHeader: SegyBinaryHeader,
        segyData: SegyData
    ): Blob {
        const parts: ArrayBuffer[] = [];

        // 1. Text header (3200 bytes)
        parts.push(this.encodeEbcdicHeader(textHeader));

        // 2. Binary header (400 bytes)
        parts.push(this.encodeBinaryHeader(binaryHeader));

        // 3. Traces (header + data for each trace)
        for (let i = 0; i < segyData.numTraces; i++) {
            // Trace header (240 bytes)
            parts.push(this.encodeTraceHeader(segyData.headers[i]));

            // Trace data
            const startIndex = i * segyData.samplesPerTrace;
            const endIndex = startIndex + segyData.samplesPerTrace;
            const traceData = segyData.data.slice(startIndex, endIndex);

            parts.push(this.encodeTraceData(traceData, binaryHeader.sampleFormat, segyData.samplesPerTrace));
        }

        return new Blob(parts, { type: 'application/octet-stream' });
    }

    /**
     * Download SEG-Y file to user's computer
     */
    static downloadSegy(
        filename: string,
        textHeader: string,
        binaryHeader: SegyBinaryHeader,
        segyData: SegyData
    ): void {
        const blob = this.writeSegy(textHeader, binaryHeader, segyData);
        const url = URL.createObjectURL(blob);

        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        // Clean up
        setTimeout(() => URL.revokeObjectURL(url), 100);
    }
}
