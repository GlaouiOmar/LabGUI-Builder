import { useState, useEffect, useCallback, useRef } from 'react';
import { useProjectStore } from '../../stores/projectStore';
import { generateTkinterCode } from '../../generator/tkinterGenerator';
import { requestPreview, checkBackendHealth, validateCode, PreviewWebSocket } from '../../lib/previewApi';
import { Monitor, AlertCircle, RefreshCw, Play, Wifi, WifiOff, Zap } from 'lucide-react';

export function PreviewPanel() {
  const document = useProjectStore((s) => s.document);

  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [backendAvailable, setBackendAvailable] = useState<boolean | null>(null);
  const [syntaxError, setSyntaxError] = useState<string | null>(null);
  const [wsConnected, setWsConnected] = useState(false);
  const [autoUpdate, setAutoUpdate] = useState(true);

  const wsRef = useRef<PreviewWebSocket | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingCodeRef = useRef<string | null>(null);

  // Check backend health on mount
  useEffect(() => {
    checkBackendHealth().then((ok) => {
      setBackendAvailable(ok);
      if (ok) {
        // Try WebSocket
        const ws = new PreviewWebSocket();
        ws.onOpen = () => setWsConnected(true);
        ws.onClose = () => setWsConnected(false);
        ws.onError = () => setWsConnected(false);
        ws.onMessage = (msg) => {
          setLoading(false);
          if (msg.type === 'frame') {
            setError(null);
            const url = `data:image/png;base64,${msg.image_base64}`;
            setImageUrl((prev) => {
              if (prev?.startsWith('blob:')) URL.revokeObjectURL(prev);
              return url;
            });
          } else if (msg.type === 'error') {
            setError(msg.message);
          }
        };
        ws.connect();
        wsRef.current = ws;
      }
    });
    return () => {
      wsRef.current?.disconnect();
      wsRef.current = null;
    };
  }, []);

  // Validate code whenever document changes
  useEffect(() => {
    if (!backendAvailable) return;
    const code = generateTkinterCode(document);
    validateCode(code).then((result) => {
      if (!result.valid) {
        setSyntaxError(result.error);
      } else {
        setSyntaxError(null);
      }
    });
  }, [document, backendAvailable]);

  // Auto-render via WebSocket with debounce
  useEffect(() => {
    if (!wsConnected || !autoUpdate || syntaxError) return;

    const code = generateTkinterCode(document);
    pendingCodeRef.current = code;

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(() => {
      if (pendingCodeRef.current && wsRef.current) {
        setLoading(true);
        wsRef.current.sendRender(pendingCodeRef.current);
      }
    }, 800);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [document, wsConnected, autoUpdate, syntaxError]);

  const handlePreview = useCallback(async () => {
    setLoading(true);
    setError(null);
    if (imageUrl?.startsWith('blob:')) {
      URL.revokeObjectURL(imageUrl);
    }
    setImageUrl(null);

    const code = generateTkinterCode(document);

    // Prefer WebSocket if connected
    if (wsRef.current && wsConnected) {
      wsRef.current.sendRender(code);
      return;
    }

    // Fallback to REST
    const result = await requestPreview(code);
    setLoading(false);

    if (result.error) {
      setError(result.error);
    } else if (result.imageUrl) {
      setImageUrl(result.imageUrl);
    }
  }, [document, imageUrl, wsConnected]);

  if (backendAvailable === false) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-6 text-center">
        <AlertCircle className="w-10 h-10 text-lab-yellow mb-3" />
        <div className="text-sm font-medium text-lab-text mb-1">Preview Backend Offline</div>
        <div className="text-xs text-lab-overlay0 max-w-xs">
          The local preview server is not running. Start it with:
        </div>
        <code className="mt-2 px-3 py-1.5 rounded bg-lab-base text-lab-blue text-xs font-mono">
          cd backend && pip install -r requirements.txt && python main.py
        </code>
        <div className="mt-3 text-xs text-lab-overlay0">
          Or use <strong>Run Preview</strong> to download the .py file and run it manually.
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-lab-surface0">
        <div className="flex items-center gap-2">
          <Monitor className="w-3.5 h-3.5 text-lab-blue" />
          <span className="text-xs font-medium text-lab-text">Live Preview</span>
          {backendAvailable === true && (
            <span className="w-1.5 h-1.5 rounded-full bg-lab-green animate-pulse" />
          )}
          <span title={wsConnected ? 'WebSocket connected' : 'WebSocket disconnected'}>
            {wsConnected ? (
              <Wifi className="w-3 h-3 text-lab-green" />
            ) : (
              <WifiOff className="w-3 h-3 text-lab-overlay0" />
            )}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {syntaxError && (
            <span className="text-[10px] text-lab-red" title={syntaxError}>
              Syntax Error
            </span>
          )}
          <button
            onClick={() => setAutoUpdate(!autoUpdate)}
            className={`flex items-center gap-1 px-2 py-1 rounded text-[10px] font-medium transition-colors ${
              autoUpdate
                ? 'bg-lab-green/20 text-lab-green'
                : 'bg-lab-surface0 text-lab-overlay0 hover:text-lab-text'
            }`}
            title="Auto-update preview on changes"
          >
            <Zap className="w-3 h-3" />
            {autoUpdate ? 'Auto' : 'Manual'}
          </button>
          <button
            onClick={handlePreview}
            disabled={loading || !!syntaxError}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-lab-blue text-lab-crust text-[11px] font-medium hover:bg-lab-blueLight transition-colors disabled:opacity-40"
          >
            {loading ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Play className="w-3 h-3" />}
            {loading ? 'Rendering...' : 'Capture'}
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 flex items-center justify-center bg-lab-crust p-4 overflow-auto">
        {error && (
          <div className="text-center">
            <AlertCircle className="w-8 h-8 text-lab-red mx-auto mb-2" />
            <div className="text-xs text-lab-red font-medium mb-1">Preview Failed</div>
            <div className="text-[11px] text-lab-overlay0 max-w-xs">{error}</div>
          </div>
        )}

        {imageUrl && !error && (
          <img
            src={imageUrl}
            alt="tkinter preview"
            className="max-w-full max-h-full rounded border border-lab-surface0 shadow-lg"
          />
        )}

        {!imageUrl && !error && !loading && (
          <div className="text-center text-lab-overlay0">
            <Monitor className="w-12 h-12 mx-auto mb-3 opacity-20" />
            <div className="text-xs">
              {autoUpdate
                ? 'Preview will auto-update when you make changes.'
                : 'Click Capture to render the tkinter window.'}
            </div>
            <div className="text-[10px] mt-1 opacity-60">
              A real Python process will run your GUI and return a screenshot.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
