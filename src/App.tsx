
import { useState, useEffect } from 'react';
import { ControlPanel } from './components/ControlPanel';
import { TraceDetailsPanel } from './components/TraceDetailsPanel';
import { FileDetailsPanel } from './components/FileDetailsPanel';
import { SeismicViewer } from './components/SeismicViewer';
import { ViewerToolbar, type ToolMode } from './components/ViewerToolbar';
import type { SegyData, SegyBinaryHeader, SegyTraceHeader } from './utils/SegyParser';
import { Loader, Button, Stack, Text, Title, Center } from '@mantine/core';
import { IconDatabaseImport } from '@tabler/icons-react';
import 'normalize.css';
import './App.css';

function App() {
  const [segyData, setSegyData] = useState<SegyData | null>(null);
  const [header, setHeader] = useState<SegyBinaryHeader | null>(null);
  const [textHeader, setTextHeader] = useState<string | null>(null);
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
  const [availableHeaders, setAvailableHeaders] = useState<string[]>(['trace']);
  const [agcEnabled, setAgcEnabled] = useState<boolean>(true);
  const [agcWindow, setAgcWindow] = useState<number>(500);
  const [showGridlines, setShowGridlines] = useState<boolean>(false);

  const [selectedTrace, setSelectedTrace] = useState<{ index: number; header: SegyTraceHeader } | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState<boolean>(false);
  const [isFileDetailsOpen, setIsFileDetailsOpen] = useState<boolean>(false);
  const [activeTool, setActiveTool] = useState<ToolMode>(null);
  const [zoom, setZoom] = useState<number>(1.0);

  const parseWithWorker = async (buffer: ArrayBuffer) => {
    setLoading(true);
    return new Promise<void>((resolve, reject) => {
      const worker = new Worker(new URL('./utils/segy.worker.ts', import.meta.url), { type: 'module' });

      worker.onmessage = (e) => {
        const { type, data, header, textHeader, error } = e.data;
        if (type === 'SUCCESS') {
          setHeader(header);
          setTextHeader(textHeader || null);
          setSegyData(data); // data is SegyData

          // Determine available headers
          const headers = ['trace'];
          if (data.numTraces > 0) {
            const firstHeader = data.headers[0];
            if (firstHeader.cdp !== 0) headers.push('cdp');
            if ('inlineNumber' in firstHeader) headers.push('inline');
            if ('crosslineNumber' in firstHeader) headers.push('crossline');
          }
          setAvailableHeaders(headers);

          if (!headers.includes(xAxisHeader)) {
            setXAxisHeader('trace');
          }

          worker.terminate();
          setLoading(false);
          resolve();
        } else if (type === 'ERROR') {
          console.error("Worker error:", error);
          alert(`Error parsing file: ${error}`);
          worker.terminate();
          setLoading(false);
          reject(new Error(error));
        }
      };

      worker.postMessage({ type: 'PARSE', buffer }, [buffer]);
    });
  };

  const handleFileUpload = async (file: File) => {
    try {
      const buffer = await file.arrayBuffer();
      await parseWithWorker(buffer);
    } catch (error) {
      console.error("Error parsing SEG-Y file:", error);
    }
  };


  // Responsive canvas
  useEffect(() => {
    const viewerContainer = document.getElementById('viewer-container');
    if (!viewerContainer) return;

    const updateDimensions = () => {
      setDimensions({
        width: viewerContainer.clientWidth,
        height: viewerContainer.clientHeight
      });
    };

    const observer = new ResizeObserver(updateDimensions);
    observer.observe(viewerContainer);

    // Initial update
    updateDimensions();

    return () => observer.disconnect();
  }, [segyData, isDetailsOpen, isFileDetailsOpen]);

  const handleToolChange = (tool: ToolMode) => {
    if (tool === 'zoom-fit') {
      // Reset zoom and center the view
      setZoom(1.0);
      setOffsetX(0);
      setOffsetY(0);
      setScaleX(1.0);
      setScaleY(1.0);
    } else if (tool === 'zoom-in') {
      // Zoom in by 20% centered on the view
      const newZoom = Math.min(50, zoom * 1.2);
      const centerX = dimensions.width / 2;
      const centerY = dimensions.height / 2;
      const gridX = (centerX - offsetX) / zoom;
      const gridY = (centerY - offsetY) / zoom;
      const newOffsetX = centerX - gridX * newZoom;
      const newOffsetY = centerY - gridY * newZoom;
      setZoom(newZoom);
      setOffsetX(newOffsetX);
      setOffsetY(newOffsetY);
    } else if (tool === 'zoom-out') {
      // Zoom out by 20% centered on the view
      const newZoom = Math.max(0.1, zoom / 1.2);
      const centerX = dimensions.width / 2;
      const centerY = dimensions.height / 2;
      const gridX = (centerX - offsetX) / zoom;
      const gridY = (centerY - offsetY) / zoom;
      const newOffsetX = centerX - gridX * newZoom;
      const newOffsetY = centerY - gridY * newZoom;
      setZoom(newZoom);
      setOffsetX(newOffsetX);
      setOffsetY(newOffsetY);
    } else {
      // For pick and zoom-window, just toggle the active tool
      setActiveTool(tool);
    }
  };

  return (
    <div className="app-container" style={{ display: 'flex', flexDirection: 'column' }}>

      <ControlPanel
        onFileUpload={handleFileUpload}
        gain={gain}
        onGainChange={setGain}
        loading={loading}
        segyData={segyData}
        binaryHeader={header}
        textHeader={textHeader}
        onShowFileDetails={() => setIsFileDetailsOpen(true)}
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
        availableHeaders={availableHeaders}
        agcEnabled={agcEnabled}
        onAgcEnabledChange={setAgcEnabled}
        agcWindow={agcWindow}
        onAgcWindowChange={setAgcWindow}
        showGridlines={showGridlines}
        onShowGridlinesChange={setShowGridlines}
      />

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden', position: 'relative' }}>
        <TraceDetailsPanel
          selectedTrace={selectedTrace}
          segyData={segyData}
          isOpen={isDetailsOpen}
          onClose={() => setIsDetailsOpen(false)}
        />

        <div className="main-content" id="viewer-container" style={{ flex: 1, position: 'relative' }}>
          {header && (
            <div style={{ position: 'absolute', top: 10, left: 10, color: 'white', zIndex: 100, background: 'rgba(0,0,0,0.5)', padding: 5 }}>
              Samples/Trace: {header.samplesPerTrace} | Interval: {header.sampleInterval}us
            </div>
          )}
          {segyData && segyData.numTraces > 0 && (
            <ViewerToolbar
              activeTool={activeTool}
              onToolChange={handleToolChange}
            />
          )}
          {loading ? (
            <Center style={{ height: '100%' }}>
              <Stack align="center" gap="md">
                <Loader size={50} />
                <Text>Parsing SEG-Y file...</Text>
              </Stack>
            </Center>
          ) : segyData && segyData.numTraces > 0 ? (
            <SeismicViewer
              data={segyData}
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
              agcEnabled={agcEnabled}
              agcWindow={agcWindow}
              showGridlines={showGridlines}
              onTraceSelect={(index, header) => {
                console.log('App: onTraceSelect called', index);
                setSelectedTrace({ index, header });
                setIsDetailsOpen(true);
              }}
              selectedTraceIndex={selectedTrace ? selectedTrace.index : null}
              toolMode={activeTool}
              zoom={zoom}
              onZoomChange={setZoom}
            />
          ) : (
            <Center style={{ height: '100%' }}>
              <Stack align="center" gap="md">
                <IconDatabaseImport size={48} stroke={1.5} color="gray" />
                <Title order={3}>No Data Loaded</Title>
                <Text c="dimmed">Upload a SEG-Y file to visualize seismic data.</Text>
                <Button
                  variant="filled"
                  onClick={async () => {
                    setLoading(true);
                    try {
                      const response = await fetch('/mock.sgy');
                      const buffer = await response.arrayBuffer();
                      await parseWithWorker(buffer);
                    } catch (e) {
                      console.error(e);
                      alert('Failed to load mock data');
                      setLoading(false);
                    }
                  }}
                >
                  Load Large Mock Data
                </Button>
              </Stack>
            </Center>
          )}
        </div>

        <FileDetailsPanel
          segyData={segyData}
          binaryHeader={header}
          textHeader={textHeader}
          isOpen={isFileDetailsOpen}
          onClose={() => setIsFileDetailsOpen(false)}
        />
      </div>
    </div>
  );
}

export default App;
