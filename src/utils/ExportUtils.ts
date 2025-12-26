import { jsPDF } from 'jspdf';
import type { SegyData, SegyBinaryHeader } from './SegyParser';

/**
 * Utility functions for exporting seismic visualization in various formats
 */

/**
 * Merge multiple canvas layers into a single canvas
 */
const mergeCanvasLayers = (canvases: HTMLCanvasElement[], width: number, height: number): HTMLCanvasElement => {
    const mergedCanvas = document.createElement('canvas');
    mergedCanvas.width = width;
    mergedCanvas.height = height;
    const ctx = mergedCanvas.getContext('2d');

    if (!ctx) {
        throw new Error('Failed to get canvas context');
    }

    // Draw each canvas layer onto the merged canvas
    canvases.forEach(canvas => {
        ctx.drawImage(canvas, 0, 0);
    });

    return mergedCanvas;
};

/**
 * Export canvas as PNG image
 */
export const exportAsPNG = (
    canvases: HTMLCanvasElement[],
    filename: string = 'seismic_view.png'
): void => {
    try {
        const canvas = canvases.length === 1 ? canvases[0] : mergeCanvasLayers(canvases, canvases[0].width, canvases[0].height);

        canvas.toBlob((blob) => {
            if (!blob) {
                console.error('Failed to create blob from canvas');
                return;
            }

            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = filename;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
        }, 'image/png');
    } catch (error) {
        console.error('Error exporting PNG:', error);
        alert('Failed to export PNG image');
    }
};

/**
 * Export canvas as JPEG image
 */
export const exportAsJPEG = (
    canvases: HTMLCanvasElement[],
    filename: string = 'seismic_view.jpg',
    quality: number = 0.92
): void => {
    try {
        const canvas = canvases.length === 1 ? canvases[0] : mergeCanvasLayers(canvases, canvases[0].width, canvases[0].height);

        canvas.toBlob((blob) => {
            if (!blob) {
                console.error('Failed to create blob from canvas');
                return;
            }

            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = filename;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
        }, 'image/jpeg', quality);
    } catch (error) {
        console.error('Error exporting JPEG:', error);
        alert('Failed to export JPEG image');
    }
};

/**
 * Export canvas as PDF document
 */
export const exportAsPDF = (
    canvases: HTMLCanvasElement[],
    filename: string = 'seismic_view.pdf',
    options?: {
        title?: string;
        includeMetadata?: boolean;
        metadata?: any;
    }
): void => {
    try {
        const canvas = canvases.length === 1 ? canvases[0] : mergeCanvasLayers(canvases, canvases[0].width, canvases[0].height);

        const imgData = canvas.toDataURL('image/png');

        // Calculate PDF dimensions (A4 landscape or custom based on canvas aspect ratio)
        const aspectRatio = canvas.width / canvas.height;
        let pdfWidth = 297; // A4 landscape width in mm
        let pdfHeight = 210; // A4 landscape height in mm

        // Adjust dimensions to maintain aspect ratio
        if (aspectRatio > pdfWidth / pdfHeight) {
            pdfHeight = pdfWidth / aspectRatio;
        } else {
            pdfWidth = pdfHeight * aspectRatio;
        }

        const pdf = new jsPDF({
            orientation: aspectRatio > 1 ? 'landscape' : 'portrait',
            unit: 'mm',
            format: [pdfWidth, pdfHeight]
        });

        // Add metadata if provided
        if (options?.includeMetadata && options?.metadata) {
            pdf.setProperties({
                title: options.title || 'Seismic Visualization',
                subject: 'SEG-Y Data Visualization',
                author: 'Pulse Seismic Viewer',
                creator: 'Pulse Seismic Viewer'
            });

            // Add metadata text at the top if there's space
            if (options.title) {
                pdf.setFontSize(12);
                pdf.text(options.title, 10, 10);
            }
        }

        // Add image to PDF
        pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);

        // Save PDF
        pdf.save(filename);
    } catch (error) {
        console.error('Error exporting PDF:', error);
        alert('Failed to export PDF document');
    }
};

/**
 * Export trace data as ASCII (CSV format)
 */
export const exportAsASCII = (
    segyData: SegyData,
    binaryHeader: SegyBinaryHeader | null,
    filename: string = 'seismic_data.csv',
    options?: {
        includeHeaders?: boolean;
        selectedTraces?: number[];
        format?: 'csv' | 'tsv';
    }
): void => {
    try {
        const delimiter = options?.format === 'tsv' ? '\t' : ',';
        const includeHeaders = options?.includeHeaders !== false;
        const traces = options?.selectedTraces || Array.from({ length: segyData.numTraces }, (_, i) => i);

        let output = '';

        // Add file header with metadata
        if (includeHeaders) {
            output += `# SEG-Y Data Export\n`;
            output += `# Generated: ${new Date().toISOString()}\n`;
            if (binaryHeader) {
                output += `# Samples per Trace: ${binaryHeader.samplesPerTrace}\n`;
                output += `# Sample Interval: ${binaryHeader.sampleInterval} μs\n`;
                output += `# Number of Traces: ${segyData.numTraces}\n`;
            }
            output += `#\n`;

            // Column headers
            output += `Trace${delimiter}Sample${delimiter}Time_ms${delimiter}Amplitude\n`;
        }

        // Export trace data
        const sampleInterval = binaryHeader?.sampleInterval || 4000; // μs
        const samplesPerTrace = segyData.samplesPerTrace;

        for (const traceIndex of traces) {
            if (traceIndex >= segyData.numTraces) continue;

            const startOffset = traceIndex * samplesPerTrace;
            const traceData = segyData.data.subarray(startOffset, startOffset + samplesPerTrace);

            for (let sampleIndex = 0; sampleIndex < samplesPerTrace; sampleIndex++) {
                const time = (sampleIndex * sampleInterval) / 1000; // Convert to ms
                const amplitude = traceData[sampleIndex];

                output += `${traceIndex + 1}${delimiter}${sampleIndex + 1}${delimiter}${time.toFixed(3)}${delimiter}${amplitude}\n`;
            }
        }

        // Create and download file
        const blob = new Blob([output], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    } catch (error) {
        console.error('Error exporting ASCII:', error);
        alert('Failed to export ASCII data');
    }
};

/**
 * Get all visible canvas elements from the viewer
 */
export const getViewerCanvases = (containerElement: HTMLElement | null): HTMLCanvasElement[] => {
    if (!containerElement) return [];

    const canvases: HTMLCanvasElement[] = [];
    const canvasElements = containerElement.querySelectorAll('canvas');

    canvasElements.forEach(canvas => {
        // Only include visible canvases
        const style = window.getComputedStyle(canvas);
        if (style.display !== 'none' && style.visibility !== 'hidden') {
            canvases.push(canvas);
        }
    });

    return canvases;
};
