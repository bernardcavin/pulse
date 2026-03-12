/**
 * WebGL Renderer for Seismic Data
 * Provides GPU-accelerated rendering for density heatmaps and wiggle traces
 */

export class WebGLRenderer {
    private gl: WebGLRenderingContext;
    private densityProgram: WebGLProgram | null = null;
    private wiggleProgram: WebGLProgram | null = null;

    constructor(canvas: HTMLCanvasElement) {
        const gl = canvas.getContext('webgl', {
            alpha: true,
            antialias: false,
            depth: false,
            preserveDrawingBuffer: false
        });

        if (!gl) {
            throw new Error('WebGL not supported');
        }

        this.gl = gl;
        this.initDensityProgram();
        this.initWiggleProgram();
    }

    private initDensityProgram() {
        const vertexShaderSource = `
            attribute vec2 aPosition;
            attribute vec2 aTexCoord;
            varying vec2 vTexCoord;
            uniform mat3 uTransform;
            
            void main() {
                vec3 pos = uTransform * vec3(aPosition, 1.0);
                gl_Position = vec4(pos.xy, 0.0, 1.0);
                vTexCoord = aTexCoord;
            }
        `;

        const fragmentShaderSource = `
            precision mediump float;
            varying vec2 vTexCoord;
            uniform sampler2D uTexture;
            uniform float uGain;
            uniform int uColorMap; // 0=grey, 1=rwb, 2=custom
            uniform vec3 uMinColor;
            uniform vec3 uZeroColor;
            uniform vec3 uMaxColor;
            
            vec3 getRgbFromAmp(float amp) {
                float val = amp * uGain;
                
                if (uColorMap == 0) {
                    // Grey
                    float v = clamp((val + 1.0) * 0.5, 0.0, 1.0);
                    return vec3(v, v, v);
                } else if (uColorMap == 1) {
                    // Red-White-Blue
                    if (val < 0.0) {
                        float factor = clamp(1.0 + max(-1.0, val), 0.0, 1.0);
                        return vec3(1.0, factor, factor);
                    } else {
                        float factor = min(1.0, val);
                        return vec3(1.0 - factor, 1.0 - factor, 1.0);
                    }
                } else {
                    // Custom
                    if (val < 0.0) {
                        float factor = clamp(1.0 + max(-1.0, val), 0.0, 1.0);
                        return mix(uMinColor / 255.0, uZeroColor / 255.0, factor);
                    } else {
                        float factor = min(1.0, val);
                        return mix(uZeroColor / 255.0, uMaxColor / 255.0, factor);
                    }
                }
            }
            
            void main() {
                float amp = texture2D(uTexture, vTexCoord).r;
                vec3 color = getRgbFromAmp(amp);
                gl_FragColor = vec4(color, 1.0);
            }
        `;

        this.densityProgram = this.createProgram(vertexShaderSource, fragmentShaderSource);
    }

    private initWiggleProgram() {
        const vertexShaderSource = `
            attribute vec2 aPosition;
            uniform mat3 uTransform;
            
            void main() {
                vec3 pos = uTransform * vec3(aPosition, 1.0);
                gl_Position = vec4(pos.xy, 0.0, 1.0);
            }
        `;

        const fragmentShaderSource = `
            precision mediump float;
            uniform vec4 uColor;
            
            void main() {
                gl_FragColor = uColor;
            }
        `;

        this.wiggleProgram = this.createProgram(vertexShaderSource, fragmentShaderSource);
    }

    private createShader(type: number, source: string): WebGLShader {
        const shader = this.gl.createShader(type);
        if (!shader) throw new Error('Failed to create shader');

        this.gl.shaderSource(shader, source);
        this.gl.compileShader(shader);

        if (!this.gl.getShaderParameter(shader, this.gl.COMPILE_STATUS)) {
            const info = this.gl.getShaderInfoLog(shader);
            this.gl.deleteShader(shader);
            throw new Error('Shader compilation error: ' + info);
        }

        return shader;
    }

    private createProgram(vertexSource: string, fragmentSource: string): WebGLProgram {
        const vertexShader = this.createShader(this.gl.VERTEX_SHADER, vertexSource);
        const fragmentShader = this.createShader(this.gl.FRAGMENT_SHADER, fragmentSource);

        const program = this.gl.createProgram();
        if (!program) throw new Error('Failed to create program');

        this.gl.attachShader(program, vertexShader);
        this.gl.attachShader(program, fragmentShader);
        this.gl.linkProgram(program);

        if (!this.gl.getProgramParameter(program, this.gl.LINK_STATUS)) {
            const info = this.gl.getProgramInfoLog(program);
            this.gl.deleteProgram(program);
            throw new Error('Program linking error: ' + info);
        }

        return program;
    }

    /**
     * Render density heatmap using WebGL
     */
    renderDensity(params: {
        data: Float32Array;
        numTraces: number;
        samplesPerTrace: number;
        width: number;
        height: number;
        offsetX: number;
        offsetY: number;
        scaleX: number;
        scaleY: number;
        zoom: number;
        gain: number;
        colorMap: 'grey' | 'rwb' | 'custom';
        customColors?: { min: string; zero: string; max: string };
    }) {
        if (!this.densityProgram) return;

        const gl = this.gl;
        gl.viewport(0, 0, params.width, params.height);
        gl.clearColor(1, 1, 1, 0);
        gl.clear(gl.COLOR_BUFFER_BIT);

        gl.useProgram(this.densityProgram);

        // Create texture from seismic data
        const texture = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.texImage2D(
            gl.TEXTURE_2D,
            0,
            gl.LUMINANCE,
            params.numTraces,
            params.samplesPerTrace,
            0,
            gl.LUMINANCE,
            gl.FLOAT,
            params.data
        );
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

        // Set up quad vertices
        const positions = new Float32Array([
            -1, -1,
            1, -1,
            -1, 1,
            1, 1
        ]);

        const texCoords = new Float32Array([
            0, 1,
            1, 1,
            0, 0,
            1, 0
        ]);

        const posBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, posBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);

        const texBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, texBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, texCoords, gl.STATIC_DRAW);

        // Set attributes
        const aPosition = gl.getAttribLocation(this.densityProgram, 'aPosition');
        const aTexCoord = gl.getAttribLocation(this.densityProgram, 'aTexCoord');

        gl.bindBuffer(gl.ARRAY_BUFFER, posBuffer);
        gl.enableVertexAttribArray(aPosition);
        gl.vertexAttribPointer(aPosition, 2, gl.FLOAT, false, 0, 0);

        gl.bindBuffer(gl.ARRAY_BUFFER, texBuffer);
        gl.enableVertexAttribArray(aTexCoord);
        gl.vertexAttribPointer(aTexCoord, 2, gl.FLOAT, false, 0, 0);

        // Set uniforms
        const uTransform = gl.getUniformLocation(this.densityProgram, 'uTransform');
        const uGain = gl.getUniformLocation(this.densityProgram, 'uGain');
        const uColorMap = gl.getUniformLocation(this.densityProgram, 'uColorMap');

        // Calculate transform matrix
        const scaleMatrix = this.createScaleMatrix(params.scaleX * params.zoom, params.scaleY * params.zoom);
        const translateMatrix = this.createTranslateMatrix(params.offsetX / params.width * 2, params.offsetY / params.height * 2);
        const transform = this.multiplyMatrices(translateMatrix, scaleMatrix);

        gl.uniformMatrix3fv(uTransform, false, transform);
        gl.uniform1f(uGain, params.gain);

        const colorMapValue = params.colorMap === 'grey' ? 0 : params.colorMap === 'rwb' ? 1 : 2;
        gl.uniform1i(uColorMap, colorMapValue);

        if (params.colorMap === 'custom' && params.customColors) {
            const uMinColor = gl.getUniformLocation(this.densityProgram, 'uMinColor');
            const uZeroColor = gl.getUniformLocation(this.densityProgram, 'uZeroColor');
            const uMaxColor = gl.getUniformLocation(this.densityProgram, 'uMaxColor');

            gl.uniform3fv(uMinColor, this.hexToRgb(params.customColors.min));
            gl.uniform3fv(uZeroColor, this.hexToRgb(params.customColors.zero));
            gl.uniform3fv(uMaxColor, this.hexToRgb(params.customColors.max));
        }

        // Draw
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

        // Cleanup
        gl.deleteTexture(texture);
        gl.deleteBuffer(posBuffer);
        gl.deleteBuffer(texBuffer);
    }

    private createScaleMatrix(sx: number, sy: number): Float32Array {
        return new Float32Array([
            sx, 0, 0,
            0, sy, 0,
            0, 0, 1
        ]);
    }

    private createTranslateMatrix(tx: number, ty: number): Float32Array {
        return new Float32Array([
            1, 0, tx,
            0, 1, ty,
            0, 0, 1
        ]);
    }

    private multiplyMatrices(a: Float32Array, b: Float32Array): Float32Array {
        const result = new Float32Array(9);
        for (let i = 0; i < 3; i++) {
            for (let j = 0; j < 3; j++) {
                result[i * 3 + j] =
                    a[i * 3] * b[j] +
                    a[i * 3 + 1] * b[3 + j] +
                    a[i * 3 + 2] * b[6 + j];
            }
        }
        return result;
    }

    private hexToRgb(hex: string): Float32Array {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        if (result) {
            return new Float32Array([
                parseInt(result[1], 16),
                parseInt(result[2], 16),
                parseInt(result[3], 16)
            ]);
        }
        return new Float32Array([0, 0, 0]);
    }

    dispose() {
        if (this.densityProgram) {
            this.gl.deleteProgram(this.densityProgram);
        }
        if (this.wiggleProgram) {
            this.gl.deleteProgram(this.wiggleProgram);
        }
    }
}
