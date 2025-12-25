/**
 * SEG-Y Trace Header field descriptions according to the standard
 */
export const TRACE_HEADER_DESCRIPTIONS: Record<string, { description: string; bytes: string }> = {
    traceSequenceLine: {
        description: 'Trace sequence number within line',
        bytes: '1–4'
    },
    traceSequenceFile: {
        description: 'Trace sequence number within reel',
        bytes: '5–8'
    },
    fieldRecord: {
        description: 'FFID – Original field record number',
        bytes: '9–12'
    },
    traceNumber: {
        description: 'Trace number within field record',
        bytes: '13–16'
    },
    energySourcePoint: {
        description: 'SP – Energy source point number',
        bytes: '17–20'
    },
    cdp: {
        description: 'CDP ensemble number',
        bytes: '21–24'
    },
    cdpTrace: {
        description: 'Trace number',
        bytes: '25–28'
    },
    traceId: {
        description: 'Trace identification code',
        bytes: '29–30'
    },
    nSummedTraces: {
        description: 'Number of vertically summed traces',
        bytes: '31–32'
    },
    nStackedTraces: {
        description: 'Number of horizontally stacked traces',
        bytes: '33–34'
    },
    dataUse: {
        description: 'Data use (1-production, 2-test)',
        bytes: '35–36'
    },
    offset: {
        description: 'Distance from source point to receiver group',
        bytes: '37–40'
    },
    receiverElevation: {
        description: 'Receiver group elevation',
        bytes: '41–44'
    },
    sourceElevation: {
        description: 'Surface elevation at source',
        bytes: '45–48'
    },
    sourceDepth: {
        description: 'Source depth below surface',
        bytes: '49–52'
    },
    receiverDatumElevation: {
        description: 'Datum elevation at receiver group',
        bytes: '53–56'
    },
    sourceDatumElevation: {
        description: 'Datum elevation at source',
        bytes: '57–60'
    },
    sourceWaterDepth: {
        description: 'Water depth at source',
        bytes: '61–64'
    },
    receiverWaterDepth: {
        description: 'Water depth at group',
        bytes: '65–68'
    },
    scalarElevation: {
        description: 'Scalar to all elevations & depths',
        bytes: '69–70'
    },
    scalarCoordinates: {
        description: 'Scalar to all coordinates',
        bytes: '71–72'
    },
    sourceX: {
        description: 'Source X coordinate',
        bytes: '73–76'
    },
    sourceY: {
        description: 'Source Y coordinate',
        bytes: '77–80'
    },
    groupX: {
        description: 'Group X coordinate',
        bytes: '81–84'
    },
    groupY: {
        description: 'Group Y coordinate',
        bytes: '85–88'
    },
    coordinateUnits: {
        description: 'Coordinate units (1-len/m, 2-sec/arc)',
        bytes: '89–90'
    },
    weatheringVelocity: {
        description: 'Weathering velocity',
        bytes: '91–92'
    },
    subweatheringVelocity: {
        description: 'Subweathering velocity',
        bytes: '93–94'
    },
    sourceUpholeTime: {
        description: 'Uphole time at source',
        bytes: '95–96'
    },
    groupUpholeTime: {
        description: 'Uphole time at group',
        bytes: '97–98'
    },
    sourceStaticCorrection: {
        description: 'Source static correction',
        bytes: '99–100'
    },
    groupStaticCorrection: {
        description: 'Group static correction',
        bytes: '101–102'
    },
    totalStaticApplied: {
        description: 'Total static applied',
        bytes: '103–104'
    },
    lagTimeA: {
        description: 'Lag time A',
        bytes: '105–106'
    },
    lagTimeB: {
        description: 'Lag time B',
        bytes: '107–108'
    },
    delayRecordingTime: {
        description: 'Delay recording time',
        bytes: '109–110'
    },
    muteTimeStart: {
        description: 'Mute time start',
        bytes: '111–112'
    },
    muteTimeEnd: {
        description: 'Mute time end',
        bytes: '113–114'
    },
    samplesInThisTrace: {
        description: 'Number of samples in this trace',
        bytes: '115–116'
    },
    sampleInterval: {
        description: 'Sample interval (µs)',
        bytes: '117–118'
    },
    gainType: {
        description: 'Gain type of field instruments',
        bytes: '119–120'
    },
    instrumentInitialGain: {
        description: 'Instrument gain',
        bytes: '121–122'
    },
    instrumentGainConstant: {
        description: 'Instrument gain constant',
        bytes: '123–124'
    },
    correlated: {
        description: 'Correlated (1-yes / 2-no)',
        bytes: '125–126'
    },
    sweepFrequencyStart: {
        description: 'Sweep frequency at start',
        bytes: '127–128'
    },
    sweepFrequencyEnd: {
        description: 'Sweep frequency at end',
        bytes: '129–130'
    },
    sweepLength: {
        description: 'Sweep length (ms)',
        bytes: '131–132'
    },
    sweepType: {
        description: 'Sweep type (1-lin,2-parabol,3-exp,4-other)',
        bytes: '133–134'
    },
    sweepTraceTaperLengthStart: {
        description: 'Sweep trace taper length at start (ms)',
        bytes: '135–136'
    },
    sweepTraceTaperLengthEnd: {
        description: 'Sweep trace taper length at end (ms)',
        bytes: '137–138'
    },
    taperType: {
        description: 'Taper type (1-lin,2-cos²,3-other)',
        bytes: '139–140'
    },
    aliasFilterFrequency: {
        description: 'Alias filter frequency (if used)',
        bytes: '141–142'
    },
    aliasFilterSlope: {
        description: 'Alias filter slope',
        bytes: '143–144'
    },
    notchFilterFrequency: {
        description: 'Notch filter frequency (if used)',
        bytes: '145–146'
    },
    notchFilterSlope: {
        description: 'Notch filter slope',
        bytes: '147–148'
    },
    lowCutFrequency: {
        description: 'Low-cut frequency (if used)',
        bytes: '149–150'
    },
    highCutFrequency: {
        description: 'High-cut frequency (if used)',
        bytes: '151–152'
    },
    lowCutSlope: {
        description: 'Low-cut slope',
        bytes: '153–154'
    },
    highCutSlope: {
        description: 'High-cut slope',
        bytes: '155–156'
    },
    yearDataRecorded: {
        description: 'Year data recorded',
        bytes: '157–158'
    },
    dayOfYear: {
        description: 'Day of year',
        bytes: '159–160'
    },
    hour: {
        description: 'Hour of day',
        bytes: '161–162'
    },
    minute: {
        description: 'Minute of hour',
        bytes: '163–164'
    },
    second: {
        description: 'Second of minute',
        bytes: '165–166'
    },
    timeBasisCode: {
        description: 'Time basis code (1-local,2-GMT,3-other)',
        bytes: '167–168'
    },
    traceWeightingFactor: {
        description: 'Trace weighting factor',
        bytes: '169–170'
    },
    geophoneGroupNumberRoll1: {
        description: 'Geophone group number of roll sw pos 1',
        bytes: '171–172'
    },
    geophoneGroupNumberFirstTraceOriginal: {
        description: 'Geophone group number of trace #1',
        bytes: '173–174'
    },
    geophoneGroupNumberLastTraceOriginal: {
        description: 'Geophone group number of last trace',
        bytes: '175–176'
    },
    gapSize: {
        description: 'Gap size (total # of groups dropped)',
        bytes: '177–178'
    },
    overTravel: {
        description: 'Overtravel assoc w taper of beg/end line',
        bytes: '179–180'
    },
    cdpX: {
        description: 'CDP X',
        bytes: '181–184'
    },
    cdpY: {
        description: 'CDP Y',
        bytes: '185–188'
    },
    inlineNumber: {
        description: 'Inline number',
        bytes: '189–192'
    },
    crosslineNumber: {
        description: 'Crossline number',
        bytes: '193–196'
    },
    shotPointNumber: {
        description: 'Shot point number',
        bytes: '197–200'
    },
    shotPointScalar: {
        description: 'Shot point scalar',
        bytes: '201–202'
    },
    traceValueMeasurementUnit: {
        description: 'Trace value measurement unit',
        bytes: '203–204'
    }
};

/**
 * Get the description for a trace header field
 */
export function getHeaderDescription(fieldName: string): string {
    return TRACE_HEADER_DESCRIPTIONS[fieldName]?.description || fieldName;
}

/**
 * Get the byte range for a trace header field
 */
export function getHeaderBytes(fieldName: string): string {
    return TRACE_HEADER_DESCRIPTIONS[fieldName]?.bytes || '';
}
