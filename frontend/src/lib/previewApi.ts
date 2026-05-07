/**
 * LabGUI Preview API Client
 * Communicates with the local FastAPI preview backend via REST and WebSocket.
 */

const PREVIEW_API_URL = 'http://127.0.0.1:8765';
const PREVIEW_WS_URL = 'ws://127.0.0.1:8765/ws/preview';

export interface PreviewResult {
  imageUrl: string | null;
  error: string | null;
}

export async function checkBackendHealth(): Promise<boolean> {
  try {
    const res = await fetch(`${PREVIEW_API_URL}/health`, { method: 'GET' });
    return res.ok;
  } catch {
    return false;
  }
}

export async function requestPreview(code: string): Promise<PreviewResult> {
  try {
    const res = await fetch(`${PREVIEW_API_URL}/api/preview`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      return { imageUrl: null, error: data.error || `HTTP ${res.status}` };
    }

    const blob = await res.blob();
    const imageUrl = URL.createObjectURL(blob);
    return { imageUrl, error: null };
  } catch (e) {
    return { imageUrl: null, error: e instanceof Error ? e.message : 'Network error' };
  }
}

export async function validateCode(code: string): Promise<{ valid: boolean; error: string | null }> {
  try {
    const res = await fetch(`${PREVIEW_API_URL}/api/preview/check`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code }),
    });
    return await res.json();
  } catch {
    return { valid: false, error: 'Backend unreachable' };
  }
}

export type PreviewWsMessage =
  | { type: 'frame'; image_base64: string }
  | { type: 'error'; message: string }
  | { type: 'pong' };

export class PreviewWebSocket {
  private ws: WebSocket | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private pingInterval: ReturnType<typeof setInterval> | null = null;
  public onMessage: ((msg: PreviewWsMessage) => void) | null = null;
  public onOpen: (() => void) | null = null;
  public onClose: (() => void) | null = null;
  public onError: ((err: Event) => void) | null = null;

  connect() {
    if (this.ws?.readyState === WebSocket.OPEN) return;
    try {
      this.ws = new WebSocket(PREVIEW_WS_URL);
      this.ws.onopen = () => {
        this.startPing();
        this.onOpen?.();
      };
      this.ws.onmessage = (ev) => {
        try {
          const msg = JSON.parse(ev.data) as PreviewWsMessage;
          this.onMessage?.(msg);
        } catch {
          /* ignore malformed */
        }
      };
      this.ws.onclose = () => {
        this.stopPing();
        this.onClose?.();
      };
      this.ws.onerror = (err) => {
        this.onError?.(err);
      };
    } catch {
      this.onClose?.();
    }
  }

  disconnect() {
    this.stopPing();
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  sendRender(code: string) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type: 'render', code }));
    }
  }

  private startPing() {
    this.stopPing();
    this.pingInterval = setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ type: 'ping' }));
      }
    }, 15000);
  }

  private stopPing() {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }
}
