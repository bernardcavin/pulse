
import React, { useState, useEffect } from 'react';
import { ControlPanel } from './components/ControlPanel';
import { SeismicViewer } from './components/SeismicViewer';
import { SegyParser } from './utils/SegyParser';
import type { Trace, SegyBinaryHeader } from './utils/SegyParser';
import { Spinner, NonIdealState } from '@blueprintjs/core';
import '@blueprintjs/core/lib/css/blueprint.css';
import '@blueprintjs/icons/lib/css/blueprint-icons.css';
import 'normalize.css';
import './App.css';

function App() {
  const [traces, setTraces] = useState<Trace[]>([]);
  const [header, setHeader] = useState<SegyBinaryHeader | null>(null);
  const [gain, setGain] = useState<number>(1.0);
  const [displayWiggle, setDisplayWiggle] = useState<boolean>(false);
  const [displayDensity, setDisplayDensity] = useState<boolean>(true);
  const [wiggleFill, setWiggleFill] = useState<'none' | 'pos' | 'neg'>('none');
  const [scaleX, setScaleX] = useState<number>(1.0);
  const [scaleY, setScaleY] = useState<number>(1.0);
  const [reverse, setReverse] = useState<boolean>(false);
  const [colorMap, setColorMap] = useState<'grey' | 'rwb' | 'custom'>('grey');
  const [customColors, setCustomColors] = useState({ min: '#ff0000', zero: '#ffffff', max: '#0000ff' });
  const [offsetX, setOffsetX] = useState<number>(0);
  const [offsetY, setOffsetY] = useState<number>(0);
  const [xAxisHeader, setXAxisHeader] = useState<'trace' | 'cdp' | 'inline' | 'crossline'>('trace');
  const [loading, setLoading] = useState<boolean>(false);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });

  const handleFileUpload = async (file: File) => {
    setLoading(true);
    try {
      const buffer = await file.arrayBuffer();
      const parser = new SegyParser(buffer);

      // Parse headers
      const binaryHeader = parser.parseBinaryHeader();
      setHeader(binaryHeader);

      // Parse traces
      // Note: Large files might block the UI. In a real app, use Web Workers.
      // For now, we assume reasonable file sizes as per plan.
      const parsedTraces = parser.parseTraces(binaryHeader);
      setTraces(parsedTraces);

    } catch (error) {
      console.error("Error parsing SEG-Y file:", error);
      alert("Failed to parse SEG-Y file. Check console for details.");
    } finally {
      setLoading(false);
    }
  };


  // Responsive canvas
  useEffect(() => {
    const updateDimensions = () => {
      const viewerContainer = document.getElementById('viewer-container');
      if (viewerContainer) {
        setDimensions({
          width: viewerContainer.clientWidth,
          height: viewerContainer.clientHeight
        });
      }
    };

    window.addEventListener('resize', updateDimensions);
    updateDimensions();

    return () => window.removeEventListener('resize', updateDimensions);
  }, []);

  return (
    <div className="app-container">
      <div className="sidebar">
        <ControlPanel
          onFileUpload={handleFileUpload}
          gain={gain}
          onGainChange={setGain}
          loading={loading}
          displayWiggle={displayWiggle}
          onDisplayWiggleChange={setDisplayWiggle}
          displayDensity={displayDensity}
          onDisplayDensityChange={setDisplayDensity}
          wiggleFill={wiggleFill}
          onWiggleFillChange={setWiggleFill}
          scaleX={scaleX}
          onScaleXChange={setScaleX}
          scaleY={scaleY}
          onScaleYChange={setScaleY}
          reverse={reverse}
          onReverseChange={setReverse}
          colorMap={colorMap}
          onColorMapChange={setColorMap}
          customColors={customColors}
          xAxisHeader={xAxisHeader}
          onXAxisHeaderChange={setXAxisHeader}
          onCustomColorsChange={setCustomColors}
        />
      </div>
      <div className="main-content" id="viewer-container">
        {header && (
          <div style={{ position: 'absolute', top: 10, left: 10, color: 'white', zIndex: 100, background: 'rgba(0,0,0,0.5)', padding: 5 }}>
            Samples/Trace: {header.samplesPerTrace} | Interval: {header.sampleInterval}us
          </div>
        )}
        {loading ? (
          <div className="loading-container">
            <Spinner size={50} />
            <p>Parsing SEG-Y file...</p>
          </div>
        ) : traces.length > 0 ? (
          <SeismicViewer
            traces={traces}
            xAxisHeader={xAxisHeader}
            header={header}
            width={dimensions.width}
            height={dimensions.height}
            gain={gain}
            displayWiggle={displayWiggle}
            displayDensity={displayDensity}
            wiggleFill={wiggleFill}
            scaleX={scaleX}
            scaleY={scaleY}
            reverse={reverse}
            colorMap={colorMap}
            customColors={customColors}
            offsetX={offsetX}
            offsetY={offsetY}
            onOffsetChange={(x, y) => { setOffsetX(x); setOffsetY(y); }}
            onScaleChange={(x, y) => { setScaleX(x); setScaleY(y); }}
          />
        ) : (
          <NonIdealState
            icon="import"
            title="No Data Loaded"
            description="Upload a SEG-Y file to visualize seismic data."
          />
        )}
      </div>
    </div>
  );
}

export default App;
