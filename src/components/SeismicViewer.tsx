
import React, { useEffect, useRef, useState } from 'react';
import type { Trace, SegyBinaryHeader } from '../utils/SegyParser';

interface SeismicViewerProps {
    traces: Trace[];
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
    onScaleChange: (x: number, y: number) => void;
}

const vertexShaderSource = `
attribute vec2 a_position;
attribute vec2 a_texCoord;
varying vec2 v_texCoord;
uniform vec2 u_offset;
uniform vec2 u_resolution;

void main() {
    // Apply offset
    vec2 pos = a_position + u_offset;
    
    // Convert from pixel space to clip space
    vec2 clipSpace = (pos / u_resolution) * 2.0 - 1.0;
    
    gl_Position = vec4(clipSpace * vec2(1, -1), 0, 1);
    v_texCoord = a_texCoord;
}
`;

const fragmentShaderSource = `
precision mediump float;
varying vec2 v_texCoord;
uniform sampler2D u_texture;
uniform float u_gain;
uniform int u_colorMap;
uniform vec3 u_customMin;
uniform vec3 u_customZero;
uniform vec3 u_customMax;

void main() {
    // Sample texture and normalize from [0,1] to [-1,1]
    float amp = (texture2D(u_texture, v_texCoord).r * 2.0 - 1.0) * u_gain;
    
    vec3 color;
    
    if (u_colorMap == 0) {
        // Greyscale
        float val = (amp + 1.0) * 0.5;
        val = clamp(val, 0.0, 1.0);
        color = vec3(val);
    } else if (u_colorMap == 1) {
        // Red-White-Blue
        if (amp < 0.0) {
            float factor = 1.0 + max(-1.0, amp);
            color = vec3(1.0, factor, factor);
        } else {
            float factor = min(1.0, amp);
            color = vec3(1.0 - factor, 1.0 - factor, 1.0);
        }
    } else {
        // Custom
        vec3 minRgb = u_customMin / 255.0;
        vec3 zeroRgb = u_customZero / 255.0;
        vec3 maxRgb = u_customMax / 255.0;
        
        if (amp < 0.0) {
            float factor = 1.0 + max(-1.0, amp);
            color = mix(minRgb, zeroRgb, factor);
        } else {
            float factor = min(1.0, amp);
            color = mix(zeroRgb, maxRgb, factor);
        }
    }
    
    gl_FragColor = vec4(color, 1.0);
}
`;

const hexToRgb = (hex: string) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
    } : { r: 0, g: 0, b: 0 };
};

export const SeismicViewer: React.FC<SeismicViewerProps> = ({
    traces,
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
    onScaleChange
}) => {
    const glCanvasRef = useRef<HTMLCanvasElement>(null);
    const canvas2dRef = useRef<HTMLCanvasElement>(null);
    const axisCanvasRef = useRef<HTMLCanvasElement>(null);
    const glRef = useRef<WebGLRenderingContext | null>(null);
    const programRef = useRef<WebGLProgram | null>(null);
    const textureRef = useRef<WebGLTexture | null>(null);

    const isDragging = useRef(false);
    const dragStartMousePos = useRef({ x: 0, y: 0 });
    const dragStartOffset = useRef({ x: 0, y: 0 });
    const [isGrabbing, setIsGrabbing] = useState(false);

    const handleMouseDown = (e: React.MouseEvent) => {
        isDragging.current = true;
        setIsGrabbing(true);
        dragStartMousePos.current = { x: e.clientX, y: e.clientY };
        dragStartOffset.current = { x: offsetX, y: offsetY };
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (!isDragging.current) return;
        const dx = e.clientX - dragStartMousePos.current.x;
        const dy = e.clientY - dragStartMousePos.current.y;

        onOffsetChange(dragStartOffset.current.x + dx, dragStartOffset.current.y + dy);
    };

    const handleMouseUp = () => {
        isDragging.current = false;
        setIsGrabbing(false);
    };

    const handleWheel = (e: React.WheelEvent) => {
        const canvas = glCanvasRef.current;
        if (!canvas) return;

        // Get mouse position relative to canvas
        const rect = canvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        // Calculate world position under mouse before zoom
        const worldX = mouseX - offsetX;
        const worldY = mouseY - offsetY;

        const zoomFactor = 0.2;
        const delta = e.deltaY > 0 ? -zoomFactor : zoomFactor;

        const newScaleX = Math.max(0.1, Math.min(10, scaleX + delta));
        const newScaleY = Math.max(0.1, Math.min(10, scaleY + delta));

        // Calculate new offset to keep same world point under cursor
        const scaleRatioX = newScaleX / scaleX;
        const scaleRatioY = newScaleY / scaleY;

        const newOffsetX = mouseX - worldX * scaleRatioX;
        const newOffsetY = mouseY - worldY * scaleRatioY;

        onScaleChange(newScaleX, newScaleY);
        onOffsetChange(newOffsetX, newOffsetY);
    };

    // Initialize WebGL
    useEffect(() => {
        const canvas = glCanvasRef.current;
        if (!canvas) return;

        const gl = canvas.getContext('webgl');
        if (!gl) {
            console.error('WebGL not supported');
            return;
        }
        glRef.current = gl;

        // Compile vertex shader
        const vertexShader = gl.createShader(gl.VERTEX_SHADER)!;
        gl.shaderSource(vertexShader, vertexShaderSource);
        gl.compileShader(vertexShader);
        if (!gl.getShaderParameter(vertexShader, gl.COMPILE_STATUS)) {
            console.error('Vertex shader compile error:', gl.getShaderInfoLog(vertexShader));
            return;
        }

        // Compile fragment shader
        const fragmentShader = gl.createShader(gl.FRAGMENT_SHADER)!;
        gl.shaderSource(fragmentShader, fragmentShaderSource);
        gl.compileShader(fragmentShader);
        if (!gl.getShaderParameter(fragmentShader, gl.COMPILE_STATUS)) {
            console.error('Fragment shader compile error:', gl.getShaderInfoLog(fragmentShader));
            return;
        }

        // Create program
        const program = gl.createProgram()!;
        gl.attachShader(program, vertexShader);
        gl.attachShader(program, fragmentShader);
        gl.linkProgram(program);
        if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
            console.error('Program link error:', gl.getProgramInfoLog(program));
            return;
        }
        programRef.current = program;

        // Create texture
        const texture = gl.createTexture();
        textureRef.current = texture;

        console.log('WebGL initialized successfully');

        return () => {
            gl.deleteProgram(program);
            gl.deleteShader(vertexShader);
            gl.deleteShader(fragmentShader);
            gl.deleteTexture(texture);
        };
    }, []);

    // Upload trace data to WebGL texture (using UNSIGNED_BYTE for compatibility)
    useEffect(() => {
        const gl = glRef.current;
        const texture = textureRef.current;
        if (!gl || !texture || traces.length === 0) return;

        const numTraces = traces.length;
        const numSamples = traces[0].data.length;

        // Normalize data to [0, 255] for UNSIGNED_BYTE texture
        const textureData = new Uint8Array(numTraces * numSamples);
        for (let t = 0; t < numTraces; t++) {
            const traceIndex = reverse ? numTraces - 1 - t : t;
            const trace = traces[traceIndex];
            for (let s = 0; s < numSamples; s++) {
                // Map from [-1, 1] to [0, 255]
                const normalized = (trace.data[s] + 1.0) * 127.5;
                textureData[s * numTraces + t] = Math.max(0, Math.min(255, normalized));
            }
        }

        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.texImage2D(
            gl.TEXTURE_2D,
            0,
            gl.LUMINANCE,
            numTraces,
            numSamples,
            0,
            gl.LUMINANCE,
            gl.UNSIGNED_BYTE,
            textureData
        );

        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);

        console.log(`Uploaded texture: ${numTraces}x${numSamples}`);

    }, [traces, reverse]);

    // WebGL render density
    useEffect(() => {
        const gl = glRef.current;
        const program = programRef.current;
        const texture = textureRef.current;
        if (!gl || !program || !texture || traces.length === 0) return;

        if (!displayDensity) {
            gl.clearColor(1, 1, 1, 1);
            gl.clear(gl.COLOR_BUFFER_BIT);
            return;
        }

        const numTraces = traces.length;
        const numSamples = traces[0].data.length;

        gl.viewport(0, 0, width, height);
        gl.clearColor(1, 1, 1, 1);
        gl.clear(gl.COLOR_BUFFER_BIT);

        gl.useProgram(program);

        // Calculate scaled dimensions
        const baseTraceWidth = width / numTraces;
        const baseSampleHeight = height / numSamples;
        const totalWidth = numTraces * baseTraceWidth * scaleX;
        const totalHeight = numSamples * baseSampleHeight * scaleY;

        // Create geometry for a quad
        const positions = new Float32Array([
            0, 0,
            totalWidth, 0,
            0, totalHeight,
            totalWidth, totalHeight,
        ]);

        const texCoords = new Float32Array([
            0, 0,
            1, 0,
            0, 1,
            1, 1,
        ]);

        // Position buffer
        const positionBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);
        const positionLoc = gl.getAttribLocation(program, 'a_position');
        gl.enableVertexAttribArray(positionLoc);
        gl.vertexAttribPointer(positionLoc, 2, gl.FLOAT, false, 0, 0);

        // TexCoord buffer
        const texCoordBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, texCoordBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, texCoords, gl.STATIC_DRAW);
        const texCoordLoc = gl.getAttribLocation(program, 'a_texCoord');
        gl.enableVertexAttribArray(texCoordLoc);
        gl.vertexAttribPointer(texCoordLoc, 2, gl.FLOAT, false, 0, 0);

        // Set uniforms
        gl.uniform2f(gl.getUniformLocation(program, 'u_offset'), offsetX, offsetY);
        gl.uniform2f(gl.getUniformLocation(program, 'u_resolution'), width, height);
        gl.uniform1f(gl.getUniformLocation(program, 'u_gain'), gain);

        const colorMapValue = colorMap === 'grey' ? 0 : colorMap === 'rwb' ? 1 : 2;
        gl.uniform1i(gl.getUniformLocation(program, 'u_colorMap'), colorMapValue);

        const minRgb = hexToRgb(customColors.min);
        const zeroRgb = hexToRgb(customColors.zero);
        const maxRgb = hexToRgb(customColors.max);
        gl.uniform3f(gl.getUniformLocation(program, 'u_customMin'), minRgb.r, minRgb.g, minRgb.b);
        gl.uniform3f(gl.getUniformLocation(program, 'u_customZero'), zeroRgb.r, zeroRgb.g, zeroRgb.b);
        gl.uniform3f(gl.getUniformLocation(program, 'u_customMax'), maxRgb.r, maxRgb.g, maxRgb.b);

        // Bind texture
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.uniform1i(gl.getUniformLocation(program, 'u_texture'), 0);

        // Draw
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

        // Cleanup
        gl.deleteBuffer(positionBuffer);
        gl.deleteBuffer(texCoordBuffer);

        const error = gl.getError();
        if (error !== gl.NO_ERROR) {
            console.error('WebGL error:', error);
        }

    }, [traces, width, height, gain, scaleX, scaleY, offsetX, offsetY, colorMap, customColors, displayDensity, reverse]);

    // Canvas 2D render wiggle (optimized with viewport culling and decimation)
    useEffect(() => {
        const canvas = canvas2dRef.current;
        if (!canvas || traces.length === 0) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Use requestAnimationFrame for smoother rendering
        let rafId: number;
        const render = () => {
            ctx.clearRect(0, 0, width, height);

            if (!displayWiggle) return;

            const numTraces = traces.length;
            const numSamples = traces[0].data.length;

            const baseTraceWidth = width / numTraces;
            const baseSampleHeight = height / numSamples;

            const traceWidth = baseTraceWidth * scaleX;
            const sampleHeight = baseSampleHeight * scaleY;

            ctx.save();
            ctx.translate(offsetX, offsetY);

            ctx.strokeStyle = '#000';
            ctx.lineWidth = 1;

            // Calculate visible trace range for viewport culling
            const visibleStartTrace = Math.max(0, Math.floor(-offsetX / traceWidth) - 1);
            const visibleEndTrace = Math.min(numTraces, Math.ceil((-offsetX + width) / traceWidth) + 1);

            // Sample decimation - skip samples based on zoom level for performance
            const sampleStep = Math.max(1, Math.floor(1 / scaleY));

            for (let t = visibleStartTrace; t < visibleEndTrace; t++) {
                const traceIndex = reverse ? numTraces - 1 - t : t;
                const trace = traces[traceIndex];
                const traceData = trace.data;

                const xCenter = (t + 0.5) * traceWidth;

                ctx.beginPath();
                const startX = xCenter + (traceData[0] * gain * traceWidth);
                ctx.moveTo(startX, 0);

                // Draw with decimation for better performance
                for (let s = 1; s < numSamples; s += sampleStep) {
                    const y = s * sampleHeight;
                    const x = xCenter + (traceData[s] * gain * traceWidth);
                    ctx.lineTo(x, y);
                }

                // Always draw the last sample
                if ((numSamples - 1) % sampleStep !== 0) {
                    const lastS = numSamples - 1;
                    const y = lastS * sampleHeight;
                    const x = xCenter + (traceData[lastS] * gain * traceWidth);
                    ctx.lineTo(x, y);
                }

                ctx.stroke();

                if (wiggleFill !== 'none') {
                    ctx.lineTo(xCenter, (numSamples - 1) * sampleHeight);
                    ctx.lineTo(xCenter, 0);
                    ctx.lineTo(startX, 0);

                    ctx.save();
                    ctx.clip();

                    if (wiggleFill === 'pos') {
                        ctx.fillStyle = displayDensity ? '#000' : 'blue';
                        ctx.fillRect(xCenter, 0, numTraces * traceWidth, numSamples * sampleHeight);
                    } else {
                        ctx.fillStyle = 'red';
                        ctx.fillRect(-width, 0, xCenter + width, numSamples * sampleHeight);
                    }
                    ctx.restore();
                }
            }


            // Draw Axes (ticks and labels)
            ctx.strokeStyle = '#000';
            ctx.fillStyle = '#000';
            ctx.font = '10px sans-serif';
            ctx.lineWidth = 1;

            // X-axis (Trace numbers) - draw at bottom
            const xTickInterval = Math.max(1, Math.floor(numTraces / 10)); // ~10 ticks
            for (let t = 0; t < numTraces; t += xTickInterval) {
                const x = (t + 0.5) * traceWidth;

                // Tick mark
                ctx.beginPath();
                ctx.moveTo(x, (numSamples - 1) * sampleHeight);
                ctx.lineTo(x, (numSamples - 1) * sampleHeight + 5);
                ctx.stroke();

                // Label
                ctx.save();
                ctx.textAlign = 'center';
                ctx.fillText(`${t + 1}`, x, (numSamples - 1) * sampleHeight + 15);
                ctx.restore();
            }

            // X-axis label
            ctx.save();
            ctx.textAlign = 'center';
            ctx.font = '12px sans-serif';
            ctx.fillText('Trace Number', (numTraces * traceWidth) / 2, (numSamples - 1) * sampleHeight + 30);
            ctx.restore();

            // Y-axis (Sample numbers / Time) - draw at left
            const yTickInterval = Math.max(1, Math.floor(numSamples / 10)); // ~10 ticks
            for (let s = 0; s < numSamples; s += yTickInterval) {
                const y = s * sampleHeight;

                // Tick mark
                ctx.beginPath();
                ctx.moveTo(0, y);
                ctx.lineTo(-5, y);
                ctx.stroke();

                // Label
                ctx.save();
                ctx.textAlign = 'right';
                ctx.fillText(`${s}`, -8, y + 3);
                ctx.restore();
            }

            // Y-axis label
            ctx.save();
            ctx.translate(-40, (numSamples * sampleHeight) / 2);
            ctx.rotate(-Math.PI / 2);
            ctx.textAlign = 'center';
            ctx.font = '12px sans-serif';
            ctx.fillText('Sample', 0, 0);
            ctx.restore();

            ctx.restore();
        };

        rafId = requestAnimationFrame(render);

        return () => {
            if (rafId) cancelAnimationFrame(rafId);
        };

    }, [traces, width, height, gain, displayWiggle, wiggleFill, scaleX, scaleY, reverse, offsetX, offsetY, displayDensity]);

    // Render axes separately (for all display modes)
    useEffect(() => {
        const canvas = axisCanvasRef.current;
        if (!canvas || traces.length === 0) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        ctx.clearRect(0, 0, width, height);

        const numTraces = traces.length;
        const numSamples = traces[0].data.length;

        const baseTraceWidth = width / numTraces;
        const baseSampleHeight = height / numSamples;

        const traceWidth = baseTraceWidth * scaleX;
        const sampleHeight = baseSampleHeight * scaleY;

        // Sample interval in microseconds (convert to milliseconds)
        const sampleIntervalMs = header?.sampleInterval ? header.sampleInterval / 1000 : 1;

        ctx.save();
        ctx.translate(offsetX, offsetY);

        ctx.strokeStyle = '#000';
        ctx.fillStyle = '#000';
        ctx.font = '10px sans-serif';
        ctx.lineWidth = 1;

        // X-axis - draw at bottom based on selected header
        const xTickInterval = Math.max(1, Math.floor(numTraces / 10));
        let xLabel = 'Trace Number';
        for (let t = 0; t < numTraces; t += xTickInterval) {
            const x = (t + 0.5) * traceWidth;
            const traceIndex = reverse ? numTraces - 1 - t : t;
            const trace = traces[traceIndex];
            
            // Get value based on selected header
            let xValue;
            switch (xAxisHeader) {
                case 'cdp':
                    xValue = trace.header?.cdp || t + 1;
                    xLabel = 'CDP';
                    break;
                case 'inline':
                    xValue = trace.header?.inlineNumber || t + 1;
                    xLabel = 'Inline';
                    break;
                case 'crossline':
                    xValue = trace.header?.crosslineNumber || t + 1;
                    xLabel = 'Crossline';
                    break;
                default:
                    xValue = t + 1;
                    xLabel = 'Trace Number';
            }
            
            ctx.beginPath();
            ctx.moveTo(x, (numSamples - 1) * sampleHeight);
            ctx.lineTo(x, (numSamples - 1) * sampleHeight + 5);
            ctx.stroke();
            
            ctx.save();
            ctx.textAlign = 'center';
            ctx.fillText(`${xValue}`, x, (numSamples - 1) * sampleHeight + 15);
            ctx.restore();
        }

        // X-axis label
        ctx.save();
        ctx.textAlign = 'center';
        ctx.font = '12px sans-serif';
        ctx.fillText(xLabel, (numTraces * traceWidth) / 2, (numSamples - 1) * sampleHeight + 30);
        ctx.restore();

        // Y-axis (Time) - draw at left
        const yTickInterval = Math.max(1, Math.floor(numSamples / 10));
        for (let s = 0; s < numSamples; s += yTickInterval) {
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

        // Y-axis label
        ctx.save();
        ctx.translate(-50, (numSamples * sampleHeight) / 2);
        ctx.rotate(-Math.PI / 2);
        ctx.textAlign = 'center';
        ctx.font = '12px sans-serif';
        ctx.fillText('Time (ms)', 0, 0);
        ctx.restore();

        // Draw border around seismic data area
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 1;
        ctx.strokeRect(0, 0, numTraces * traceWidth, numSamples * sampleHeight);

        ctx.restore();

    }, [traces, header, width, height, scaleX, scaleY, offsetX, offsetY, xAxisHeader, reverse]);

    return (
        <div style={{ position: 'relative', width, height }}>
            <canvas
                ref={glCanvasRef}
                width={width}
                height={height}
                style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    display: 'block'
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
                    cursor: isGrabbing ? 'grabbing' : 'grab',
                    pointerEvents: 'all'
                }}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
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
        </div>
    );
};
