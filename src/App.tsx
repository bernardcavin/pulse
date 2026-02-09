
import { useState, useEffect, useRef } from 'react';
import { ControlPanel } from './components/ControlPanel';
import { TraceDetailsPanel } from './components/TraceDetailsPanel';
import { SeismicViewer } from './components/SeismicViewer';
import { ViewerToolbar, type ToolMode } from './components/ViewerToolbar';
import type { SegyData, SegyBinaryHeader, SegyTraceHeader } from './utils/SegyParser';
import { getAllHeaderKeys } from './utils/TraceHeaderDescriptions';
import { SegyWriter } from './utils/SegyWriter';
import { exportAsPNG, exportAsJPEG, exportAsPDF, exportAsASCII, getViewerCanvases } from './utils/ExportUtils';
import { Loader, Button, Stack, Text, Title, Center, ActionIcon, Tooltip, Group } from '@mantine/core';
import { IconFileInfo, IconUpload, IconWaveSine, IconSettings } from '@tabler/icons-react';
import 'normalize.css';
import './App.css';
import { FileDetailsPanel } from './components/FileDetailsPanel';

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
  const [wiggleFillColors, setWiggleFillColors] = useState({ positive: '#0000ff', negative: '#ff0000' });
  const [offsetX, setOffsetX] = useState<number>(0);
  const [offsetY, setOffsetY] = useState<number>(0);
  const [xAxisHeader, setXAxisHeader] = useState<'trace' | 'cdp' | 'inline' | 'crossline'>('trace');
  const [loading, setLoading] = useState<boolean>(false);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  const [availableHeaders, setAvailableHeaders] = useState<string[]>(['trace']);
  const [agcEnabled, setAgcEnabled] = useState<boolean>(true);
  const [agcWindow, setAgcWindow] = useState<number>(500);
  const [showGridlines, setShowGridlines] = useState<boolean>(false);
  const [allAvailableHeaders, setAllAvailableHeaders] = useState<string[]>([]);
  const [selectedXAxisHeaders, setSelectedXAxisHeaders] = useState<string[]>(['traceSequenceLine']);

  const [selectedTrace, setSelectedTrace] = useState<{ index: number; header: SegyTraceHeader } | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState<boolean>(false);
  const [isFileDetailsOpen, setIsFileDetailsOpen] = useState<boolean>(true);
  const [isControlPanelOpen, setIsControlPanelOpen] = useState<boolean>(true);
  const [activeTool, setActiveTool] = useState<ToolMode>('move');
  const [zoom, setZoom] = useState<number>(1.0);
  const [fileMetadata, setFileMetadata] = useState<{ name: string; size: number; lastModified: number } | null>(null);
  const viewerContainerRef = useRef<HTMLDivElement>(null);

  // Editable data states
  const [editedSegyData, setEditedSegyData] = useState<SegyData | null>(null);
  const [editedBinaryHeader, setEditedBinaryHeader] = useState<SegyBinaryHeader | null>(null);
  const [editedTextHeader, setEditedTextHeader] = useState<string | null>(null);

  // Sync edited data with original data when loaded
  useEffect(() => {
    setEditedSegyData(segyData);
  }, [segyData]);

  useEffect(() => {
    setEditedBinaryHeader(header);
  }, [header]);

  useEffect(() => {
    setEditedTextHeader(textHeader);
  }, [textHeader]);

  // Initialize all available headers on mount
  useEffect(() => {
    setAllAvailableHeaders(getAllHeaderKeys());
  }, []);

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
      setFileMetadata({
        name: file.name,
        size: file.size,
        lastModified: file.lastModified
      });
      const buffer = await file.arrayBuffer();
      await parseWithWorker(buffer);
    } catch (error) {
      console.error("Error parsing SEG-Y file:", error);
    }
  };

  const handleRemoveFile = () => {
    // Clear all data and reset state
    setSegyData(null);
    setHeader(null);
    setTextHeader(null);
    setFileMetadata(null);
    setEditedSegyData(null);
    setEditedBinaryHeader(null);
    setEditedTextHeader(null);
    setSelectedTrace(null);
    setIsDetailsOpen(false);
    setZoom(1.0);
    setOffsetX(0);
    setOffsetY(0);
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
  }, [segyData, isDetailsOpen, isFileDetailsOpen, isControlPanelOpen]);

  // Update handlers for editable data
  const handleTraceHeaderUpdate = (traceIndex: number, updatedHeader: SegyTraceHeader) => {
    if (!editedSegyData) return;

    const newHeaders = [...editedSegyData.headers];
    newHeaders[traceIndex] = updatedHeader;

    setEditedSegyData({
      ...editedSegyData,
      headers: newHeaders
    });
  };

  const handleTraceDataUpdate = (traceIndex: number, updatedData: Float32Array) => {
    if (!editedSegyData) return;

    const newData = new Float32Array(editedSegyData.data);
    const startIndex = traceIndex * editedSegyData.samplesPerTrace;
    newData.set(updatedData, startIndex);

    setEditedSegyData({
      ...editedSegyData,
      data: newData
    });
  };

  const handleBinaryHeaderUpdate = (updatedHeader: SegyBinaryHeader) => {
    setEditedBinaryHeader(updatedHeader);
  };

  const handleTextHeaderUpdate = (updatedText: string) => {
    setEditedTextHeader(updatedText);
  };

  // Export handlers
  const handleExport = () => {
    if (!editedSegyData || !editedBinaryHeader || !editedTextHeader) {
      alert('No data to export');
      return;
    }

    const filename = `seismic_${Date.now()}.sgy`;
    SegyWriter.downloadSegy(filename, editedTextHeader, editedBinaryHeader, editedSegyData);
  };

  const handleExportPNG = () => {
    const canvases = getViewerCanvases(viewerContainerRef.current);
    if (canvases.length === 0) {
      alert('No visualization to export');
      return;
    }
    const filename = `seismic_${Date.now()}.png`;
    exportAsPNG(canvases, filename);
  };

  const handleExportJPEG = () => {
    const canvases = getViewerCanvases(viewerContainerRef.current);
    if (canvases.length === 0) {
      alert('No visualization to export');
      return;
    }
    const filename = `seismic_${Date.now()}.jpg`;
    exportAsJPEG(canvases, filename);
  };

  const handleExportPDF = () => {
    const canvases = getViewerCanvases(viewerContainerRef.current);
    if (canvases.length === 0) {
      alert('No visualization to export');
      return;
    }
    const filename = `seismic_${Date.now()}.pdf`;
    exportAsPDF(canvases, filename, {
      title: fileMetadata?.name || 'Seismic Visualization',
      includeMetadata: true,
      metadata: { binaryHeader: header, fileMetadata }
    });
  };

  const handleExportASCII = () => {
    if (!editedSegyData || !editedBinaryHeader) {
      alert('No data to export');
      return;
    }
    const filename = `seismic_${Date.now()}.csv`;
    exportAsASCII(editedSegyData, editedBinaryHeader, filename, {
      includeHeaders: true,
      format: 'csv'
    });
  };

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

      {/* Hidden file input - always available for welcome screen */}
      <input
        type="file"
        accept=".sgy,.segy"
        style={{ display: 'none' }}
        id="hidden-file-input"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) {
            handleFileUpload(file);
          }
        }}
      />

      {segyData && isControlPanelOpen && (
        <ControlPanel
          onFileUpload={handleFileUpload}
          onRemoveFile={handleRemoveFile}
          gain={gain}
          onGainChange={setGain}
          loading={loading}
          segyData={segyData}
          binaryHeader={header}
          textHeader={textHeader}
          onExport={handleExport}
          onExportPNG={handleExportPNG}
          onExportJPEG={handleExportJPEG}
          onExportPDF={handleExportPDF}
          onExportASCII={handleExportASCII}
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
          onCustomColorsChange={setCustomColors}
          agcEnabled={agcEnabled}
          onAgcEnabledChange={setAgcEnabled}
          agcWindow={agcWindow}
          onAgcWindowChange={setAgcWindow}
          showGridlines={showGridlines}
          onShowGridlinesChange={setShowGridlines}
          allAvailableHeaders={allAvailableHeaders}
          selectedXAxisHeaders={selectedXAxisHeaders}
          onSelectedXAxisHeadersChange={setSelectedXAxisHeaders}
          wiggleFillColors={wiggleFillColors}
          onWiggleFillColorsChange={setWiggleFillColors}
          fileMetadata={fileMetadata}
          onClose={() => setIsControlPanelOpen(false)}
        />
      )}

      {/* Toggle button when control panel is hidden */}
      {segyData && !isControlPanelOpen && (
        <Tooltip label="Show Control Panel" position="bottom" withArrow>
          <ActionIcon
            size="lg"
            variant="filled"
            color="blue"
            onClick={() => setIsControlPanelOpen(true)}
            radius="xl"
            style={{
              position: 'absolute',
              top: 10,
              left: '50%',
              transform: 'translateX(-50%)',
              zIndex: 1000,
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)'
            }}
          >
            <IconSettings size={18} />
          </ActionIcon>
        </Tooltip>
      )}

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden', position: 'relative' }}>
        <TraceDetailsPanel
          selectedTrace={selectedTrace}
          segyData={editedSegyData}
          isOpen={isDetailsOpen}
          onClose={() => setIsDetailsOpen(false)}
          onTraceHeaderUpdate={handleTraceHeaderUpdate}
          onTraceDataUpdate={handleTraceDataUpdate}
        />

        <div className="main-content" id="viewer-container" ref={viewerContainerRef} style={{ flex: 1, position: 'relative' }}>
          {segyData && segyData.numTraces > 0 && (
            <>
              <ViewerToolbar
                activeTool={activeTool}
                onToolChange={handleToolChange}
              />
              {!isFileDetailsOpen &&
                <Tooltip label="File Details" position="left" withArrow>
                  <ActionIcon
                    size="lg"
                    variant="filled"
                    color="blue"
                    onClick={() => setIsFileDetailsOpen(true)}
                    radius="xl"
                    style={{
                      position: 'absolute',
                      top: 10,
                      right: 10,
                      zIndex: 1000,
                      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)'
                    }}
                  >
                    <IconFileInfo size={18} />
                  </ActionIcon>
                </Tooltip>
              }
            </>
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
              selectedXAxisHeaders={selectedXAxisHeaders}
              wiggleFillColors={wiggleFillColors}
            />
          ) : (
            <Center style={{ height: '100%', backgroundColor: '#f8f9fa' }}>
              <Stack align="center" p="xl" gap={0} style={{ maxWidth: '600px' }}>
                <img
                  src="/logo.png"
                  alt="Pulse Logo"
                  style={{
                    width: '120px',
                    height: '120px',
                    objectFit: 'contain',
                    opacity: 0.9
                  }}
                />
                <Stack align="center" gap="sm">
                  <Group>
                    <Text fz="2.5rem" fw={700}> Welcome to</Text> <Text fz="2.5rem" fw={700} variant="gradient"
                      gradient={{ from: 'blue', to: 'cyan', deg: 90 }}>Pulse</Text>
                  </Group>
                  <Text c="dimmed" ta="center" size="md" style={{ lineHeight: 1.6 }}>
                    A modern web-based SEG-Y viewer for seismic data visualization and analysis.
                    Pulse provides powerful tools to explore, edit, and export seismic datasets
                    with an intuitive interface designed for geophysicists and data analysts.
                  </Text>
                  <Text c="dimmed" ta="center" size="xs" mt="xs" fw={500}>
                    Supported formats: .sgy, .segy
                  </Text>
                </Stack>
                <Group gap="md" mt="md">
                  <Button
                    variant="filled"
                    size="md"
                    radius="xl"
                    leftSection={<IconUpload size={16} />}
                    onClick={() => {
                      const fileInput = document.getElementById('hidden-file-input') as HTMLInputElement;
                      if (fileInput) {
                        fileInput.click();
                      }
                    }}
                  >
                    Upload SEG-Y File
                  </Button>
                  <Button
                    variant="default"
                    size="md"
                    radius="xl"
                    leftSection={<IconWaveSine size={16} />}
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
                    Try Sample Data
                  </Button>
                </Group>
              </Stack>
            </Center>
          )}
        </div>

        <FileDetailsPanel
          segyData={editedSegyData}
          binaryHeader={editedBinaryHeader}
          textHeader={editedTextHeader}
          isOpen={isFileDetailsOpen}
          onClose={() => setIsFileDetailsOpen(false)}
          onBinaryHeaderUpdate={handleBinaryHeaderUpdate}
          onTextHeaderUpdate={handleTextHeaderUpdate}
        />
      </div>
    </div>
  );
}

export default App;
