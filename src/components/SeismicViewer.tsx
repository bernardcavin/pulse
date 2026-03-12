import { useEffect, useRef, useState } from 'react';
import type { SegyData, SegyBinaryHeader } from '../utils/SegyParser';
import { applyAGC } from '../utils/SignalProcessing';
import type { ToolMode } from './ViewerToolbar';
import { getHeaderDescription } from '../utils/TraceHeaderDescriptions';

interface SeismicViewerProps {
    data: SegyData;
    header: SegyBinaryHeader | null;
    xAxisHeader: 'trace' | 'cdp' | 'inline' | 'crossline';
    width: number;
    height: number;
    gain: number;
    displayWiggle: boolean;
    displayDensity: boolean;
    wiggleFill: 'none' | 'pos' | 'neg';
    scaleX: number;
    scaleY: number;
    reverse: boolean;
    colorMap: 'grey' | 'rwb' | 'custom';
    customColors: { min: string, zero: string, max: string };
    offsetX: number;
    offsetY: number;
    onOffsetChange: (x: number, y: number) => void;
    agcEnabled: boolean;
    agcWindow: number;
    onTraceSelect?: (traceIndex: number, header: any) => void;
    selectedTraceIndex?: number | null;
    selectedTraceForPanel?: number | null;
    showGridlines: boolean;
    toolMode: ToolMode;
    zoom: number;
    onZoomChange?: (zoom: number) => void;
    selectedXAxisHeaders: string[];
    wiggleFillColors: { positive: string; negative: string };
    onSpectrumSelectionComplete?: (selection: {
        traceStart: number;
        traceEnd: number;
        sampleStart: number;
        sampleEnd: number;
    }) => void;
    activeSpectrumSelections?: Array<{
        id: string;
        selection: { traceStart: number; traceEnd: number; sampleStart: number; sampleEnd: number };
        color: string;
    }>;
}



const hexToRgb = (hex: string) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
    } : { r: 0, g: 0, b: 0 };
};

export const SeismicViewer: React.FC<SeismicViewerProps> = ({
    data,
    xAxisHeader,
    header,
    width,
    height,
    gain,
    displayWiggle,
    displayDensity,
    wiggleFill,
    scaleX,
    scaleY,
    reverse,
    colorMap,
    customColors,
    offsetX,
    offsetY,
    onOffsetChange,
    agcEnabled,
    agcWindow,
    onTraceSelect,
    selectedTraceIndex,
    selectedTraceForPanel,
    showGridlines,
    toolMode,
    zoom,
    onZoomChange,
    selectedXAxisHeaders,
    wiggleFillColors,
    onSpectrumSelectionComplete,
    activeSpectrumSelections = []
}) => {

    const densityCanvasRef = useRef<HTMLCanvasElement>(null);
    const canvas2dRef = useRef<HTMLCanvasElement>(null);
    const axisCanvasRef = useRef<HTMLCanvasElement>(null);
    const highlightCanvasRef = useRef<HTMLCanvasElement>(null);
    const zoomRectCanvasRef = useRef<HTMLCanvasElement>(null);

    // Cache for processed traces (e.g. AGC applied) to avoid re-computation every frame
    const processedDataRef = useRef<{
        start: number;
        traces: Float32Array[];
        agcEnabled: boolean;
        agcWindow: number;
        reverse: boolean;
    } | null>(null);

    const isDragging = useRef(false);
    const dragStartMousePos = useRef({ x: 0, y: 0 });
    const dragStartOffset = useRef({ x: 0, y: 0 });
    const [isGrabbing, setIsGrabbing] = useState(false);
    const [hoveredTrace, setHoveredTrace] = useState<number | null>(null);
    const [zoomRect, setZoomRect] = useState<{ startX: number; startY: number; endX: number; endY: number } | null>(null);
    const [spectrumRect, setSpectrumRect] = useState<{ startX: number; startY: number; endX: number; endY: number } | null>(null);

    // Zoom optimization refs
    const accumulatedZoomRef = useRef(1);
    const zoomTimeoutRef = useRef<number | null>(null);
    const isZoomingRef = useRef(false);
    const zoomMousePosRef = useRef({ x: 0, y: 0 }); // Track initial mouse position
    const zoomBaseStateRef = useRef({ zoom: 1, offsetX: 0, offsetY: 0 }); // Track base state

    const handleMouseDown = (e: React.MouseEvent) => {
        if (toolMode === 'zoom-window') {
            const canvas = canvas2dRef.current;
            if (!canvas) return;
            const rect = canvas.getBoundingClientRect();
            const mouseX = e.clientX - rect.left;
            const mouseY = e.clientY - rect.top;
            setZoomRect({ startX: mouseX, startY: mouseY, endX: mouseX, endY: mouseY });
            return;
        }

        if (toolMode === 'spectrum-select') {
            const canvas = canvas2dRef.current;
            if (!canvas) return;
            const rect = canvas.getBoundingClientRect();
            const mouseX = e.clientX - rect.left;
            const mouseY = e.clientY - rect.top;
            setSpectrumRect({ startX: mouseX, startY: mouseY, endX: mouseX, endY: mouseY });
            return;
        }

        isDragging.current = true;
        setIsGrabbing(true);
        dragStartMousePos.current = { x: e.clientX, y: e.clientY };
        dragStartOffset.current = { x: offsetX, y: offsetY };
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (toolMode === 'zoom-window' && zoomRect) {
            const canvas = canvas2dRef.current;
            if (!canvas) return;
            const rect = canvas.getBoundingClientRect();
            const mouseX = e.clientX - rect.left;
            const mouseY = e.clientY - rect.top;
            setZoomRect({ ...zoomRect, endX: mouseX, endY: mouseY });
            return;
        }

        if (toolMode === 'spectrum-select' && spectrumRect) {
            const canvas = canvas2dRef.current;
            if (!canvas) return;
            const rect = canvas.getBoundingClientRect();
            const mouseX = e.clientX - rect.left;
            const mouseY = e.clientY - rect.top;
            setSpectrumRect({ ...spectrumRect, endX: mouseX, endY: mouseY });
            return;
        }

        if (!isDragging.current) {
            // Hover logic only when pick mode is active
            if (toolMode !== 'pick') {
                // Keep trace highlighted if panel is open
                if (selectedTraceForPanel !== null && selectedTraceForPanel !== undefined) {
                    setHoveredTrace(selectedTraceForPanel);
                } else {
                    setHoveredTrace(null);
                }
                return;
            }

            if (!data) return;
            const canvas = canvas2dRef.current;
            if (!canvas) return;

            const rect = canvas.getBoundingClientRect();
            const mouseX = e.clientX - rect.left;

            const baseTraceWidth = width / data.numTraces;
            const traceWidth = baseTraceWidth * scaleX * zoom;

            const gridX = (mouseX - offsetX);
            const traceVisualIndex = Math.floor(gridX / traceWidth);

            if (traceVisualIndex >= 0 && traceVisualIndex < data.numTraces) {
                const actualTraceIndex = reverse ? data.numTraces - 1 - traceVisualIndex : traceVisualIndex;
                setHoveredTrace(actualTraceIndex);
            } else {
                setHoveredTrace(null);
            }
            return;
        }

        const dx = e.clientX - dragStartMousePos.current.x;
        const dy = e.clientY - dragStartMousePos.current.y;

        // Apply visual transform instead of re-rendering
        const transform = `translate(${dx}px, ${dy}px)`;
        if (densityCanvasRef.current) densityCanvasRef.current.style.transform = transform;
        if (canvas2dRef.current) canvas2dRef.current.style.transform = transform;
        if (highlightCanvasRef.current) highlightCanvasRef.current.style.transform = transform;
        if (axisCanvasRef.current) axisCanvasRef.current.style.transform = transform;
        if (zoomRectCanvasRef.current) zoomRectCanvasRef.current.style.transform = transform;
    };

    const handleMouseUp = (e: React.MouseEvent) => {
        if (toolMode === 'zoom-window' && zoomRect) {
            const canvas = canvas2dRef.current;
            if (!canvas) return;

            // Calculate the zoom based on the rectangle
            const rectWidth = Math.abs(zoomRect.endX - zoomRect.startX);
            const rectHeight = Math.abs(zoomRect.endY - zoomRect.startY);

            if (rectWidth > 10 && rectHeight > 10) {
                // Calculate new zoom and offset
                const centerX = (zoomRect.startX + zoomRect.endX) / 2;
                const centerY = (zoomRect.startY + zoomRect.endY) / 2;

                const zoomFactorX = width / rectWidth;
                const zoomFactorY = height / rectHeight;
                const newZoom = Math.min(zoomFactorX, zoomFactorY) * zoom;

                // Calculate grid coordinates of the center
                const gridCenterX = (centerX - offsetX) / zoom;
                const gridCenterY = (centerY - offsetY) / zoom;

                // Calculate new offsets to center the selection
                const newOffsetX = width / 2 - gridCenterX * newZoom;
                const newOffsetY = height / 2 - gridCenterY * newZoom;

                if (onZoomChange) onZoomChange(Math.max(0.1, Math.min(50, newZoom)));
                onOffsetChange(newOffsetX, newOffsetY);
                if (onZoomChange) onZoomChange(newZoom);
            }

            setZoomRect(null);
            return;
        }

        if (toolMode === 'spectrum-select' && spectrumRect) {
            const canvas = canvas2dRef.current;
            if (!canvas) return;

            const rectWidth = Math.abs(spectrumRect.endX - spectrumRect.startX);
            const rectHeight = Math.abs(spectrumRect.endY - spectrumRect.startY);

            if (rectWidth > 10 && rectHeight > 10) {
                // Convert pixel coordinates to trace and sample indices
                const minX = Math.min(spectrumRect.startX, spectrumRect.endX);
                const maxX = Math.max(spectrumRect.startX, spectrumRect.endX);
                const minY = Math.min(spectrumRect.startY, spectrumRect.endY);
                const maxY = Math.max(spectrumRect.startY, spectrumRect.endY);

                // Calculate trace indices
                const baseTraceWidth = width / data.numTraces;
                const traceWidth = baseTraceWidth * scaleX * zoom;

                const gridMinX = (minX - offsetX);
                const gridMaxX = (maxX - offsetX);

                let traceStart = Math.floor(gridMinX / traceWidth);
                let traceEnd = Math.floor(gridMaxX / traceWidth);

                // Clamp to valid range
                traceStart = Math.max(0, Math.min(data.numTraces - 1, traceStart));
                traceEnd = Math.max(0, Math.min(data.numTraces - 1, traceEnd));

                // Handle reverse mode
                if (reverse) {
                    const temp = traceStart;
                    traceStart = data.numTraces - 1 - traceEnd;
                    traceEnd = data.numTraces - 1 - temp;
                }

                // Calculate sample indices
                const baseSampleHeight = height / data.samplesPerTrace;
                const sampleHeight = baseSampleHeight * scaleY * zoom;

                const gridMinY = (minY - offsetY);
                const gridMaxY = (maxY - offsetY);

                let sampleStart = Math.floor(gridMinY / sampleHeight);
                let sampleEnd = Math.floor(gridMaxY / sampleHeight);

                // Clamp to valid range
                sampleStart = Math.max(0, Math.min(data.samplesPerTrace - 1, sampleStart));
                sampleEnd = Math.max(0, Math.min(data.samplesPerTrace - 1, sampleEnd));

                // Call the callback
                if (onSpectrumSelectionComplete) {
                    onSpectrumSelectionComplete({
                        traceStart,
                        traceEnd,
                        sampleStart,
                        sampleEnd
                    });
                }
            }

            setSpectrumRect(null);
            return;
        }

        if (isDragging.current) {
            const dx = e.clientX - dragStartMousePos.current.x;
            const dy = e.clientY - dragStartMousePos.current.y;

            // Commit the new offset
            onOffsetChange(dragStartOffset.current.x + dx, dragStartOffset.current.y + dy);

            // Reset transforms (React will re-render with new offset)
            const resetTransform = 'none';
            if (densityCanvasRef.current) densityCanvasRef.current.style.transform = resetTransform;
            if (canvas2dRef.current) canvas2dRef.current.style.transform = resetTransform;
            if (highlightCanvasRef.current) highlightCanvasRef.current.style.transform = resetTransform;
            if (axisCanvasRef.current) axisCanvasRef.current.style.transform = resetTransform;
            if (zoomRectCanvasRef.current) zoomRectCanvasRef.current.style.transform = resetTransform;
        }

        isDragging.current = false;
        setIsGrabbing(false);

        // Check if it was a click (not a drag)
        const dist = Math.sqrt(
            Math.pow(e.clientX - dragStartMousePos.current.x, 2) +
            Math.pow(e.clientY - dragStartMousePos.current.y, 2)
        );

        if (dist < 20 && toolMode === 'pick' && onTraceSelect && data) {
            const canvas = canvas2dRef.current;
            if (!canvas) return;

            const rect = canvas.getBoundingClientRect();
            const mouseX = e.clientX - rect.left;
            // Calculate trace index
            // visualX = offsetX + traceIndex * traceWidth
            // mouseX = visualX
            // traceIndex = (mouseX - offsetX) / traceWidth
            const baseTraceWidth = width / data.numTraces;
            const traceWidth = baseTraceWidth * scaleX * zoom;

            const gridX = (mouseX - offsetX);
            const traceVisualIndex = Math.floor(gridX / traceWidth);

            if (traceVisualIndex >= 0 && traceVisualIndex < data.numTraces) {
                const actualTraceIndex = reverse ? data.numTraces - 1 - traceVisualIndex : traceVisualIndex;

                const header = data.headers[actualTraceIndex];
                onTraceSelect(actualTraceIndex, header);
            }
        }
    };



    const handleWheel = (e: React.WheelEvent) => {
        const canvas = canvas2dRef.current;
        if (!canvas) return;

        const rect = canvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        // Visual feedback immediately
        const zoomFactor = 0.1;
        const delta = e.deltaY > 0 ? (1 - zoomFactor) : (1 + zoomFactor);

        // If starting a new zoom sequence, capture the base state and mouse position
        if (!isZoomingRef.current) {
            isZoomingRef.current = true;
            accumulatedZoomRef.current = 1;
            zoomMousePosRef.current = { x: mouseX, y: mouseY };
            zoomBaseStateRef.current = { zoom, offsetX, offsetY };
        }

        // Accumulate zoom delta
        const currentAccumulated = accumulatedZoomRef.current;
        const targetAccumulated = currentAccumulated * delta;

        // Proposed new total zoom
        const baseZoom = zoomBaseStateRef.current.zoom;
        const proposedZoom = baseZoom * targetAccumulated;

        // Clamp to limits (0.1 to 50)
        if (proposedZoom < 0.1 || proposedZoom > 50) return;

        accumulatedZoomRef.current = targetAccumulated;

        // Calculate visual transform using the ORIGINAL mouse position
        // This ensures zoom stays centered on the same point
        const fixedMouseX = zoomMousePosRef.current.x;
        const fixedMouseY = zoomMousePosRef.current.y;

        const s = accumulatedZoomRef.current;
        const tx = fixedMouseX * (1 - s);
        const ty = fixedMouseY * (1 - s);

        const transform = `translate(${tx}px, ${ty}px) scale(${s})`;

        if (densityCanvasRef.current) {
            densityCanvasRef.current.style.transformOrigin = '0 0';
            densityCanvasRef.current.style.transform = transform;
        }
        if (canvas2dRef.current) {
            canvas2dRef.current.style.transformOrigin = '0 0';
            canvas2dRef.current.style.transform = transform;
        }
        if (highlightCanvasRef.current) {
            highlightCanvasRef.current.style.transformOrigin = '0 0';
            highlightCanvasRef.current.style.transform = transform;
        }
        if (axisCanvasRef.current) {
            axisCanvasRef.current.style.transformOrigin = '0 0';
            axisCanvasRef.current.style.transform = transform;
        }
        if (zoomRectCanvasRef.current) {
            zoomRectCanvasRef.current.style.transformOrigin = '0 0';
            zoomRectCanvasRef.current.style.transform = transform;
        }

        // Debounce commit
        if (zoomTimeoutRef.current) {
            window.clearTimeout(zoomTimeoutRef.current);
        }

        zoomTimeoutRef.current = window.setTimeout(() => {
            isZoomingRef.current = false;

            // Calculate final state using base state and fixed mouse position
            const finalZoom = zoomBaseStateRef.current.zoom * accumulatedZoomRef.current;
            const baseOffsetX = zoomBaseStateRef.current.offsetX;
            const baseOffsetY = zoomBaseStateRef.current.offsetY;
            const baseZoom = zoomBaseStateRef.current.zoom;

            // Grid point at the fixed mouse position (using base state)
            const gridX = (fixedMouseX - baseOffsetX) / baseZoom;
            const gridY = (fixedMouseY - baseOffsetY) / baseZoom;

            // Calculate new offset to keep this grid point at the same screen position
            const newOffsetX = fixedMouseX - gridX * finalZoom;
            const newOffsetY = fixedMouseY - gridY * finalZoom;

            // Reset transforms
            const resetTransform = 'none';
            if (densityCanvasRef.current) densityCanvasRef.current.style.transform = resetTransform;
            if (canvas2dRef.current) canvas2dRef.current.style.transform = resetTransform;
            if (highlightCanvasRef.current) highlightCanvasRef.current.style.transform = resetTransform;
            if (axisCanvasRef.current) axisCanvasRef.current.style.transform = resetTransform;
            if (zoomRectCanvasRef.current) zoomRectCanvasRef.current.style.transform = resetTransform;

            // Reset accumulator
            accumulatedZoomRef.current = 1;

            // Commit state
            if (onZoomChange) onZoomChange(finalZoom);
            onOffsetChange(newOffsetX, newOffsetY);

        }, 150); // 150ms debounce
    };

    // State for virtualization
    const [textureRange, setTextureRange] = useState({ start: 0, end: 0 });

    const numTraces = data ? data.numTraces : 0;
    const samplesPerTrace = data ? data.samplesPerTrace : 0;

    // Calculate visible range and update textureRange (chunking)
    useEffect(() => {
        if (numTraces === 0) return;

        const baseTraceWidth = width / numTraces;
        const traceWidth = baseTraceWidth * scaleX * zoom;

        // Calculate visual range currently on screen
        const visibleStart = Math.floor(-offsetX / traceWidth);
        const visibleEnd = Math.ceil((-offsetX + width) / traceWidth);

        // Define buffer (number of screens of data to preload)
        // Increase buffer to reduce frequency of updates
        const bufferTraces = Math.ceil(width / traceWidth) * 2;

        const desiredStart = Math.max(0, visibleStart - bufferTraces);
        const desiredEnd = Math.min(numTraces, visibleEnd + bufferTraces);

        const currentSize = textureRange.end - textureRange.start;
        const desiredSize = desiredEnd - desiredStart;

        const margin = bufferTraces * 0.25;

        const needsUpdate =
            textureRange.end === 0 || // Initial load
            visibleStart < textureRange.start + margin || // Approaching start
            visibleEnd > textureRange.end - margin || // Approaching end
            Math.abs(currentSize - desiredSize) > desiredSize * 0.5; // Significant zoom change

        if (needsUpdate) {
            setTextureRange({ start: desiredStart, end: desiredEnd });
        }
    }, [numTraces, width, scaleX, offsetX, textureRange.start, textureRange.end, zoom]);

    // Process data cache (AGC application)
    useEffect(() => {
        if (!data || numTraces === 0) return;

        const { start, end } = textureRange;
        const numToProcess = end - start;
        if (numToProcess <= 0) return;

        // Check if cache is already valid
        const cache = processedDataRef.current;
        if (cache &&
            cache.start === start &&
            cache.traces.length === numToProcess &&
            cache.agcEnabled === agcEnabled &&
            cache.agcWindow === agcWindow &&
            cache.reverse === reverse) {
            return;
        }

        const processedTraces = new Array(numToProcess);
        const sampleRateMs = header?.sampleInterval ? header.sampleInterval / 1000 : 4;
        const allData = data.data;
        const samplesPerTrace = data.samplesPerTrace;

        for (let i = 0; i < numToProcess; i++) {
            const visualIndex = start + i;
            const dataIndex = reverse ? numTraces - 1 - visualIndex : visualIndex;

            const offset = dataIndex * samplesPerTrace;
            const rawTrace = allData.subarray(offset, offset + samplesPerTrace);

            if (agcEnabled) {
                // applyAGC creates a new Float32Array
                processedTraces[i] = applyAGC(rawTrace, sampleRateMs, agcWindow);
            } else {
                // Just reference the subarray
                processedTraces[i] = rawTrace;
            }
        }

        processedDataRef.current = {
            start,
            traces: processedTraces,
            agcEnabled,
            agcWindow,
            reverse
        };

    }, [data, textureRange, agcEnabled, agcWindow, header, reverse]);

    // Helper for color mapping
    const getRgbFromAmp = (amp: number): [number, number, number] => {
        // amp is normalized to roughly [-1, 1] * gain
        const val = amp * gain;

        if (colorMap === 'grey') {
            // Map [-1, 1] to [0, 255]
            // Standard seismic greyscale: +amp is white/black? usually + is black or white depending on polarity
            // Let's assume standard: +1 = Black (0), -1 = White (255) ?? or vice versa
            // Let's stick to the shader logic: (amp + 1) * 0.5 -> 0..1
            let v = (val + 1.0) * 0.5;
            v = Math.max(0, Math.min(1, v));
            const c = Math.floor(v * 255);
            return [c, c, c];
        } else if (colorMap === 'rwb') {
            // Red-White-Blue
            // < 0 Red, 0 White, > 0 Blue
            if (val < 0) {
                const factor = Math.max(0, 1.0 + Math.max(-1.0, val)); // 0..1 (1 at 0, 0 at -1)
                // White (1,1,1) to Red (1,0,0)
                // mix(red, white, factor) ?? 
                // Shader: if amp < 0: factor = 1+max(-1, amp). color = (1, factor, factor)
                // so -1 -> factor=0 -> (1,0,0) Red
                // 0 -> factor=1 -> (1,1,1) White
                const c = Math.floor(factor * 255);
                return [255, c, c];
            } else {
                const factor = Math.min(1.0, val);
                // White (1,1,1) to Blue (0,0,1) ??
                // Shader: factor = min(1, amp). color = (1-factor, 1-factor, 1)
                // 0 -> factor=0 -> (1,1,1) White
                // 1 -> factor=1 -> (0,0,1) Blue
                const c = Math.floor((1 - factor) * 255);
                return [c, c, 255];
            }
        } else {
            // Custom
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
    };

    // Offscreen canvas for generating the density heatmap texture
    const offscreenCanvasRef = useRef<OffscreenCanvas | HTMLCanvasElement | null>(null);

    // Initialize/Resize Offscreen Canvas
    useEffect(() => {
        if (!numTraces || !samplesPerTrace) return;

        // We only need an offscreen canvas large enough to hold the loaded chunk
        // Actually, we can just create it on the fly or reuse one.
        // Let's reuse one to avoid GC churn.
        if (!offscreenCanvasRef.current) {
            if (typeof OffscreenCanvas !== 'undefined') {
                offscreenCanvasRef.current = new OffscreenCanvas(1, 1);
            } else {
                offscreenCanvasRef.current = document.createElement('canvas');
            }
        }
    }, [numTraces, samplesPerTrace]);

    // Generate Density Bitmap (Software Rendering)
    useEffect(() => {
        // This effect runs when data/gain/colormap changes
        // It populates the offscreen canvas with correct pixels

        const canvas = offscreenCanvasRef.current;
        if (!canvas || numTraces === 0) return;

        const { start, end } = textureRange;
        const numLoaded = end - start;
        if (numLoaded <= 0) return;

        // Resize offscreen to match chunk size
        if (canvas.width !== numLoaded || canvas.height !== samplesPerTrace) {
            canvas.width = numLoaded;
            canvas.height = samplesPerTrace;
        }

        const ctx = canvas.getContext('2d') as OffscreenCanvasRenderingContext2D | CanvasRenderingContext2D;
        if (!ctx) return;

        const imgData = ctx.createImageData(numLoaded, samplesPerTrace);
        const dataBuf = imgData.data;

        // Populate pixel data
        const cache = processedDataRef.current;
        const useCache = cache &&
            cache.start === start &&
            cache.traces.length === numLoaded &&
            cache.agcEnabled === agcEnabled &&
            cache.agcWindow === agcWindow &&
            cache.reverse === reverse;

        const allData = data.data;

        // Optimization: Pre-calculate trace data access
        const traces = new Array(numLoaded);
        if (useCache) {
            for (let i = 0; i < numLoaded; i++) traces[i] = cache.traces[i];
        } else {
            for (let i = 0; i < numLoaded; i++) {
                const visualIndex = start + i;
                const dataIndex = reverse ? numTraces - 1 - visualIndex : visualIndex;
                const offset = dataIndex * samplesPerTrace;
                traces[i] = allData.subarray(offset, offset + samplesPerTrace);
            }
        }

        // We iterate pixels. 
        // x goes 0..numLoaded-1 (trace)
        // y goes 0..samplesPerTrace-1 (sample)
        // ImageData is row-major: (y * width + x) * 4

        // However, our data is trace-major (array of columns).
        // It might be cache-unfriendly to write row-major if reading column-major, but let's just do it simple first.

        for (let x = 0; x < numLoaded; x++) {
            const trace = traces[x];
            for (let y = 0; y < samplesPerTrace; y++) {
                const amp = trace[y];
                const [r, g, b] = getRgbFromAmp(amp);

                const idx = (y * numLoaded + x) * 4;
                dataBuf[idx] = r;
                dataBuf[idx + 1] = g;
                dataBuf[idx + 2] = b;
                dataBuf[idx + 3] = 255; // Alpha
            }
        }

        ctx.putImageData(imgData, 0, 0);

    }, [data, textureRange, gain, colorMap, customColors, agcEnabled, agcWindow, reverse, header]);


    // Draw Density to Main Canvas
    useEffect(() => {
        const canvas = canvas2dRef.current; // reusing the ref name but it should point to standard canvas now
        // Wait, we need a separate canvas for density if we want to layer wiggle on top?
        // The original code had glCanvasRef and canvas2dRef (wiggle).
        // We should replace glCanvasRef with a standard canvas ref for density.
        // But simpler: just rename glCanvasRef -> densityCanvasRef in the hook below.

    }, []);



    useEffect(() => {
        const canvas = densityCanvasRef.current;
        if (!canvas || !displayDensity) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Clear
        ctx.clearRect(0, 0, width, height);

        // Helper to disable smoothing for crisp pixels if zoomed in? 
        // Or enabled for smooth out?
        // Usually density plots are better with nearest neighbor if very zoomed in, or linear if zoomed out.
        // Let's enable smoothing for now to match default behavior, or disable if requested.
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';

        const offscreen = offscreenCanvasRef.current;
        if (!offscreen) return;

        const { start, end } = textureRange;
        const numLoaded = end - start;
        if (numLoaded <= 0) return;

        // Calculate draw coordinates
        // The offscreen canvas represents traces [start, end)
        // Trace Width on screen
        const baseTraceWidth = width / numTraces;
        const traceWidth = baseTraceWidth * scaleX * zoom;

        // Total height on screen
        const baseSampleHeight = height / samplesPerTrace;
        const totalHeight = samplesPerTrace * baseSampleHeight * scaleY * zoom;

        // X Position
        // The chunk starts at trace index `start`.
        // World X of start = start * traceWidth (relative to 0)
        // Screen X = offsetX + World X
        const destX = offsetX + (start * baseTraceWidth * scaleX * zoom);

        const destWidth = numLoaded * baseTraceWidth * scaleX * zoom;
        const destHeight = totalHeight;
        const destY = offsetY;

        // Draw
        // drawImage(image, dx, dy, dWidth, dHeight)
        ctx.drawImage(offscreen, destX, destY, destWidth, destHeight);

    }, [displayDensity, width, height, scaleX, scaleY, zoom, offsetX, offsetY, textureRange]);

    // Highlight Canvas Render
    useEffect(() => {
        const canvas = highlightCanvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        ctx.clearRect(0, 0, width, height);

        if (hoveredTrace !== null) {
            const baseTraceWidth = width / numTraces;
            const baseSampleHeight = height / samplesPerTrace;

            const traceWidth = baseTraceWidth * scaleX * zoom;
            const sampleHeight = baseSampleHeight * scaleY * zoom;

            ctx.save();
            ctx.translate(offsetX, offsetY);

            const visualIndex = reverse ? numTraces - 1 - hoveredTrace : hoveredTrace;

            // Blue highlight with some transparency
            // ctx.fillStyle = 'rgba(0, 100, 255, 0.4)';
            // ctx.fillRect(traceX, 0, traceWidth, samplesPerTrace * sampleHeight);

            // Draw highlight wiggle
            const t = visualIndex;
            const traceIndex = reverse ? numTraces - 1 - t : t;
            const start = traceIndex * samplesPerTrace;
            const allData = data.data;

            // Get trace data (check cache or raw)
            // Ideally we reuse cache, but for single trace recalc is fast.
            let traceData: Float32Array | number[];
            const processedCache = processedDataRef.current;
            const sampleRateMs = header?.sampleInterval ? header.sampleInterval / 1000 : 4;

            if (processedCache && t >= processedCache.start && t < processedCache.start + processedCache.traces.length) {
                const localIndex = t - processedCache.start;
                traceData = processedCache.traces[localIndex] as Float32Array;
            } else {
                const rawTraceData = allData.subarray(start, start + samplesPerTrace);
                if (agcEnabled) {
                    traceData = applyAGC(rawTraceData, sampleRateMs, agcWindow);
                } else {
                    traceData = rawTraceData;
                }
            }

            const xCenter = (t + 0.5) * traceWidth;
            const sampleStep = Math.max(1, Math.floor(1 / (scaleY * zoom)));

            ctx.strokeStyle = 'blue';
            ctx.lineWidth = 2; // Thicker line for highlight
            ctx.beginPath();

            const startX = xCenter + (traceData[0] * gain * traceWidth);
            ctx.moveTo(startX, 0);

            for (let s = 1; s < samplesPerTrace; s += sampleStep) {
                const y = s * sampleHeight;
                const x = xCenter + (traceData[s] * gain * traceWidth);
                ctx.lineTo(x, y);
            }
            // Last sample
            if ((samplesPerTrace - 1) % sampleStep !== 0) {
                const lastS = samplesPerTrace - 1;
                const y = lastS * sampleHeight;
                const x = xCenter + (traceData[lastS] * gain * traceWidth);
                ctx.lineTo(x, y);
            }

            ctx.stroke();

            ctx.restore();
        }

        // Draw selected trace in red
        if (selectedTraceIndex !== null && selectedTraceIndex !== undefined) {
            const baseTraceWidth = width / numTraces;
            const traceWidth = baseTraceWidth * scaleX * zoom;
            const sampleHeight = (height / samplesPerTrace) * scaleY * zoom;

            ctx.save();
            ctx.translate(offsetX, offsetY);

            const visualIndex = reverse ? numTraces - 1 - selectedTraceIndex : selectedTraceIndex;
            const t = visualIndex;
            const traceIndex = reverse ? numTraces - 1 - t : t;
            const start = traceIndex * samplesPerTrace;
            const allData = data.data;

            let traceData: Float32Array | number[];
            const processedCache = processedDataRef.current;
            const sampleRateMs = header?.sampleInterval ? header.sampleInterval / 1000 : 4;

            if (processedCache && t >= processedCache.start && t < processedCache.start + processedCache.traces.length) {
                const localIndex = t - processedCache.start;
                traceData = processedCache.traces[localIndex] as Float32Array;
            } else {
                const rawTraceData = allData.subarray(start, start + samplesPerTrace);
                if (agcEnabled) {
                    traceData = applyAGC(rawTraceData, sampleRateMs, agcWindow);
                } else {
                    traceData = rawTraceData;
                }
            }

            const xCenter = (t + 0.5) * traceWidth;
            const sampleStep = Math.max(1, Math.floor(1 / (scaleY * zoom)));

            ctx.strokeStyle = 'red';
            ctx.lineWidth = 2;
            ctx.beginPath();

            const startX = xCenter + (traceData[0] * gain * traceWidth);
            ctx.moveTo(startX, 0);

            for (let s = 1; s < samplesPerTrace; s += sampleStep) {
                const y = s * sampleHeight;
                const x = xCenter + (traceData[s] * gain * traceWidth);
                ctx.lineTo(x, y);
            }

            if ((samplesPerTrace - 1) % sampleStep !== 0) {
                const lastS = samplesPerTrace - 1;
                const y = lastS * sampleHeight;
                const x = xCenter + (traceData[lastS] * gain * traceWidth);
                ctx.lineTo(x, y);
            }

            ctx.stroke();
            ctx.restore();
        }

    }, [hoveredTrace, selectedTraceIndex, width, height, scaleX, scaleY, zoom, offsetX, offsetY, reverse, numTraces, samplesPerTrace, data, gain, agcEnabled, agcWindow, header]);

    // Render zoom rectangle
    useEffect(() => {
        const canvas = zoomRectCanvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        ctx.clearRect(0, 0, width, height);

        if (zoomRect) {
            const startX = Math.min(zoomRect.startX, zoomRect.endX);
            const startY = Math.min(zoomRect.startY, zoomRect.endY);
            const rectWidth = Math.abs(zoomRect.endX - zoomRect.startX);
            const rectHeight = Math.abs(zoomRect.endY - zoomRect.startY);

            ctx.strokeStyle = 'rgba(0, 100, 255, 0.8)';
            ctx.fillStyle = 'rgba(0, 100, 255, 0.1)';
            ctx.lineWidth = 2;
            ctx.setLineDash([5, 5]);
            ctx.strokeRect(startX, startY, rectWidth, rectHeight);
            ctx.fillRect(startX, startY, rectWidth, rectHeight);
            ctx.setLineDash([]);
        }
    }, [zoomRect, width, height]);

    // Canvas 2D render wiggle
    useEffect(() => {
        const canvas = canvas2dRef.current;
        if (!canvas || numTraces === 0) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Render immediately when dependencies change (no requestAnimationFrame loop)
        ctx.clearRect(0, 0, width, height);

        const baseTraceWidth = width / numTraces;
        const baseSampleHeight = height / samplesPerTrace;

        const traceWidth = baseTraceWidth * scaleX * zoom;
        const sampleHeight = baseSampleHeight * scaleY * zoom;

        if (!displayWiggle) {
            return;
        }

        ctx.save();
        ctx.translate(offsetX, offsetY);

        ctx.strokeStyle = '#000';
        ctx.lineWidth = 1;

        const visibleStartTrace = Math.max(0, Math.floor(-offsetX / traceWidth) - 1);
        const visibleEndTrace = Math.min(numTraces, Math.ceil((-offsetX + width) / traceWidth) + 1);

        const sampleStep = Math.max(1, Math.floor(1 / (scaleY * zoom)));
        const sampleRateMs = header?.sampleInterval ? header.sampleInterval / 1000 : 4;
        const processedCache = processedDataRef.current;

        const allData = data.data;

        for (let t = visibleStartTrace; t < visibleEndTrace; t++) {
            const traceIndex = reverse ? numTraces - 1 - t : t;

            // Construct trace data view
            const start = traceIndex * samplesPerTrace;
            // Be careful with subarray, it's cheap but creates an object
            let traceData: Float32Array | number[];

            // Try to get cached
            if (processedCache && t >= processedCache.start && t < processedCache.start + processedCache.traces.length) {
                const localIndex = t - processedCache.start;
                traceData = processedCache.traces[localIndex] as Float32Array;
            } else {
                const rawTraceData = allData.subarray(start, start + samplesPerTrace);
                if (agcEnabled) {
                    traceData = applyAGC(rawTraceData, sampleRateMs, agcWindow);
                } else {
                    traceData = rawTraceData;
                }
            }

            const xCenter = (t + 0.5) * traceWidth;

            ctx.beginPath();
            const startX = xCenter + (traceData[0] * gain * traceWidth);
            ctx.moveTo(startX, 0);

            for (let s = 1; s < samplesPerTrace; s += sampleStep) {
                const y = s * sampleHeight;
                const x = xCenter + (traceData[s] * gain * traceWidth);
                ctx.lineTo(x, y);
            }

            // Last sample
            if ((samplesPerTrace - 1) % sampleStep !== 0) {
                const lastS = samplesPerTrace - 1;
                const y = lastS * sampleHeight;
                const x = xCenter + (traceData[lastS] * gain * traceWidth);
                ctx.lineTo(x, y);
            }

            ctx.stroke();

            if (wiggleFill !== 'none') {
                ctx.lineTo(xCenter, (samplesPerTrace - 1) * sampleHeight);
                ctx.lineTo(xCenter, 0);
                ctx.lineTo(startX, 0);

                ctx.save();
                ctx.clip();

                if (wiggleFill === 'pos') {
                    ctx.fillStyle = wiggleFillColors.positive;
                    ctx.fillRect(xCenter, 0, numTraces * traceWidth, samplesPerTrace * sampleHeight);
                } else {
                    ctx.fillStyle = wiggleFillColors.negative;
                    ctx.fillRect(-width, 0, xCenter + width, samplesPerTrace * sampleHeight);
                }
                ctx.restore();
            }
        }


        // Draw Axes
        ctx.strokeStyle = '#000';
        ctx.fillStyle = '#000';
        ctx.font = '10px sans-serif';
        ctx.lineWidth = 1;

        const visibleTraces = numTraces / (scaleX * zoom);
        const xTickInterval = Math.max(1, Math.floor(visibleTraces / 10)); // ~10 ticks visible
        for (let t = 0; t < numTraces; t += xTickInterval) {
            const x = (t + 0.5) * traceWidth;
            ctx.beginPath();
            ctx.moveTo(x, (samplesPerTrace - 1) * sampleHeight);
            ctx.lineTo(x, (samplesPerTrace - 1) * sampleHeight + 5);
            ctx.stroke();

            ctx.save();
            ctx.textAlign = 'center';
            ctx.fillText(`${t + 1}`, x, (samplesPerTrace - 1) * sampleHeight + 15);
            ctx.restore();
        }

        // X-axis label
        ctx.save();
        ctx.textAlign = 'center';
        ctx.font = '12px sans-serif';
        ctx.fillText('Trace Number', (numTraces * traceWidth) / 2, (samplesPerTrace - 1) * sampleHeight + 30);
        ctx.restore();

        const visibleSamples = samplesPerTrace / (scaleY * zoom);
        const yTickInterval = Math.max(1, Math.floor(visibleSamples / 10));
        for (let s = 0; s < samplesPerTrace; s += yTickInterval) {
            const y = s * sampleHeight;
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(-5, y);
            ctx.stroke();
            ctx.save();
            ctx.textAlign = 'right';
            ctx.fillText(`${s}`, -8, y + 3);
            ctx.restore();
        }

        ctx.save();
        ctx.translate(-40, (samplesPerTrace * sampleHeight) / 2);
        ctx.rotate(-Math.PI / 2);
        ctx.textAlign = 'center';
        ctx.font = '12px sans-serif';
        ctx.fillText('Sample', 0, 0);
        ctx.restore();



        ctx.restore();

    }, [data, width, height, gain, displayWiggle, wiggleFill, scaleX, scaleY, reverse, offsetX, offsetY, displayDensity, zoom, agcEnabled, agcWindow, header, wiggleFillColors]);

    // Render axes separately
    useEffect(() => {
        const canvas = axisCanvasRef.current;
        if (!canvas || numTraces === 0) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        ctx.clearRect(0, 0, width, height);

        const baseTraceWidth = width / numTraces;
        const baseSampleHeight = height / samplesPerTrace;

        const traceWidth = baseTraceWidth * scaleX * zoom;
        const sampleHeight = baseSampleHeight * scaleY * zoom;

        const sampleIntervalMs = header?.sampleInterval ? header.sampleInterval / 1000 : 1;

        ctx.save();
        ctx.translate(offsetX, offsetY);

        ctx.strokeStyle = '#000';
        ctx.fillStyle = '#000';
        ctx.font = '10px sans-serif';
        ctx.lineWidth = 1;

        // X-AXIS AT TOP - Multiple Headers
        const numHeaders = selectedXAxisHeaders.length;
        const headerRowHeight = 40; // Height for each header row (increased spacing)
        const visibleTraces = numTraces / (scaleX * zoom);
        const xTickInterval = Math.max(1, Math.floor(visibleTraces / 10));

        // Render each selected header
        selectedXAxisHeaders.forEach((headerKey, headerIndex) => {
            const yOffset = -(numHeaders - headerIndex) * headerRowHeight; // Stack from top

            // Draw horizontal baseline for this header axis
            ctx.strokeStyle = '#000';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(0, yOffset);
            ctx.lineTo(numTraces * traceWidth, yOffset);
            ctx.stroke();

            for (let t = 0; t < numTraces; t += xTickInterval) {
                const x = (t + 0.5) * traceWidth;
                const traceIndex = reverse ? numTraces - 1 - t : t;
                const traceHeader = data.headers[traceIndex];

                // Get value dynamically from trace header
                let xValue: any = t + 1; // Default to trace number
                if (traceHeader && headerKey in traceHeader) {
                    xValue = (traceHeader as any)[headerKey];
                    // Handle undefined or zero values
                    if (xValue === undefined || xValue === null) {
                        xValue = 0;
                    }
                }

                // Draw tick mark pointing downward
                ctx.strokeStyle = '#000';
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.moveTo(x, yOffset);
                ctx.lineTo(x, yOffset + 5);
                ctx.stroke();

                // Draw value label
                ctx.save();
                ctx.fillStyle = '#000';
                ctx.textAlign = 'center';
                ctx.fillText(`${xValue}`, x, yOffset + 15);
                ctx.restore();
            }

            // Draw header description label
            const headerLabel = getHeaderDescription(headerKey);
            ctx.save();
            ctx.fillStyle = '#000';
            ctx.textAlign = 'center';
            ctx.font = '11px sans-serif';
            ctx.fillText(headerLabel, (numTraces * traceWidth) / 2, yOffset - 5);
            ctx.restore();
        });

        // Y-AXIS (Time axis on the left)
        const visibleSamples = samplesPerTrace / (scaleY * zoom);
        const yTickInterval = Math.max(1, Math.floor(visibleSamples / 10));
        for (let s = 0; s < samplesPerTrace; s += yTickInterval) {
            const y = s * sampleHeight;
            const timeMs = s * sampleIntervalMs;

            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(-5, y);
            ctx.stroke();

            ctx.save();
            ctx.textAlign = 'right';
            ctx.fillText(`${timeMs.toFixed(0)}`, -8, y + 3);
            ctx.restore();
        }

        ctx.save();
        ctx.translate(-50, (samplesPerTrace * sampleHeight) / 2);
        ctx.rotate(-Math.PI / 2);
        ctx.textAlign = 'center';
        ctx.font = '12px sans-serif';
        ctx.fillText('Time (ms)', 0, 0);
        ctx.restore();

        // Draw border rectangle
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 1;
        ctx.strokeRect(0, 0, numTraces * traceWidth, samplesPerTrace * sampleHeight);

        // Draw gridlines if enabled
        if (showGridlines) {
            ctx.strokeStyle = 'rgba(0, 0, 0, 0.1)';
            ctx.lineWidth = 1;

            // Vertical gridlines at X tick positions
            for (let t = 0; t < numTraces; t += xTickInterval) {
                const x = (t + 0.5) * traceWidth;
                ctx.beginPath();
                ctx.moveTo(x, 0);
                ctx.lineTo(x, samplesPerTrace * sampleHeight);
                ctx.stroke();
            }

            // Horizontal gridlines at Y tick positions
            for (let s = 0; s < samplesPerTrace; s += yTickInterval) {
                const y = s * sampleHeight;
                ctx.beginPath();
                ctx.moveTo(0, y);
                ctx.lineTo(numTraces * traceWidth, y);
                ctx.stroke();
            }
        }

        ctx.restore();

    }, [data, header, width, height, scaleX, scaleY, offsetX, offsetY, xAxisHeader, reverse, zoom, hoveredTrace, gain, displayWiggle, wiggleFill, agcEnabled, agcWindow, showGridlines, selectedXAxisHeaders]);

    // Draw zoom and spectrum selection rectangles
    useEffect(() => {
        const canvas = zoomRectCanvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        ctx.clearRect(0, 0, width, height);

        if (zoomRect) {
            const minX = Math.min(zoomRect.startX, zoomRect.endX);
            const minY = Math.min(zoomRect.startY, zoomRect.endY);
            const rectWidth = Math.abs(zoomRect.endX - zoomRect.startX);
            const rectHeight = Math.abs(zoomRect.endY - zoomRect.startY);

            ctx.strokeStyle = 'rgba(0, 123, 255, 0.8)';
            ctx.lineWidth = 2;
            ctx.setLineDash([5, 5]);
            ctx.strokeRect(minX, minY, rectWidth, rectHeight);

            ctx.fillStyle = 'rgba(0, 123, 255, 0.1)';
            ctx.fillRect(minX, minY, rectWidth, rectHeight);
        }

        if (spectrumRect) {
            const minX = Math.min(spectrumRect.startX, spectrumRect.endX);
            const minY = Math.min(spectrumRect.startY, spectrumRect.endY);
            const rectWidth = Math.abs(spectrumRect.endX - spectrumRect.startX);
            const rectHeight = Math.abs(spectrumRect.endY - spectrumRect.startY);

            ctx.strokeStyle = 'rgba(34, 197, 94, 0.8)'; // Green
            ctx.lineWidth = 2;
            ctx.setLineDash([5, 5]);
            ctx.strokeRect(minX, minY, rectWidth, rectHeight);

            ctx.fillStyle = 'rgba(34, 197, 94, 0.1)';
            ctx.fillRect(minX, minY, rectWidth, rectHeight);

            // Draw selection info
            ctx.setLineDash([]);
            ctx.fillStyle = 'rgba(34, 197, 94, 0.9)';
            ctx.font = 'bold 12px sans-serif';
            ctx.fillText('Spectrum Selection', minX + 5, minY + 15);
        }

        // Draw active spectrum selections
        if (activeSpectrumSelections && activeSpectrumSelections.length > 0) {
            const baseTraceWidth = width / data.numTraces;
            const traceWidth = baseTraceWidth * scaleX * zoom;
            const baseSampleHeight = height / data.samplesPerTrace;
            const sampleHeight = baseSampleHeight * scaleY * zoom;

            activeSpectrumSelections.forEach((sel, index) => {
                const { selection, color } = sel;

                // Convert trace/sample indices to screen coordinates
                let visualTraceStart = reverse ? data.numTraces - 1 - selection.traceEnd : selection.traceStart;
                let visualTraceEnd = reverse ? data.numTraces - 1 - selection.traceStart : selection.traceEnd;

                const minX = offsetX + visualTraceStart * traceWidth;
                const maxX = offsetX + (visualTraceEnd + 1) * traceWidth;
                const minY = offsetY + selection.sampleStart * sampleHeight;
                const maxY = offsetY + (selection.sampleEnd + 1) * sampleHeight;

                const rectWidth = maxX - minX;
                const rectHeight = maxY - minY;

                // Draw filled rectangle with selection color
                ctx.fillStyle = color;
                ctx.fillRect(minX, minY, rectWidth, rectHeight);

                // Draw border with more opaque version of the same color
                const borderColor = color.replace('0.3', '0.8');
                ctx.strokeStyle = borderColor;
                ctx.lineWidth = 2;
                ctx.setLineDash([]);
                ctx.strokeRect(minX, minY, rectWidth, rectHeight);

                // Draw selection number
                ctx.fillStyle = borderColor;
                ctx.font = 'bold 14px sans-serif';
                ctx.fillText(`#${index + 1}`, minX + 5, minY + 18);
            });
        }
    }, [zoomRect, spectrumRect, width, height, activeSpectrumSelections, data, scaleX, scaleY, zoom, offsetX, offsetY, reverse]);

    return (
        <div style={{ position: 'relative', width, height }}>
            <canvas
                ref={densityCanvasRef}
                width={width}
                height={height}
                style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    display: displayDensity ? 'block' : 'none',
                    backgroundColor: '#ffffffca'
                }}
            />
            <canvas
                ref={highlightCanvasRef}
                width={width}
                height={height}
                style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    pointerEvents: "none",
                    zIndex: 10 // Above density, below wiggle? Or above wiggle? 
                    // Wiggle (canvas2dRef) handles interaction, so it should be bottom or top but with pointer-events.
                    // Let's put highlight below wiggle so wiggle lines are drawn on top of highlight.
                    // But wiggle canvas has pointer-events: all. 
                    // So highlight must be pointer-events: none.
                }}
            />
            <canvas
                ref={canvas2dRef}
                width={width}
                height={height}
                style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    cursor: toolMode === 'zoom-window' ? 'crosshair' :
                        toolMode === 'spectrum-select' ? 'crosshair' :
                            toolMode === 'pick' ? (hoveredTrace !== null ? 'pointer' : 'default') :
                                toolMode === 'move' ? (isGrabbing ? 'grabbing' : 'grab') :
                                    (isGrabbing ? 'grabbing' : 'grab'), // Default to grab behavior
                    pointerEvents: 'all'
                }}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={(e) => { handleMouseUp(e); setHoveredTrace(null); }}
                onWheel={handleWheel}
            />
            <canvas
                ref={axisCanvasRef}
                width={width}
                height={height}
                style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    pointerEvents: "none"
                }}
            />
            <canvas
                ref={zoomRectCanvasRef}
                width={width}
                height={height}
                style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    pointerEvents: "none",
                    zIndex: 20
                }}
            />
        </div>
    );
};
