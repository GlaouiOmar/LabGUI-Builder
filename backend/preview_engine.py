"""
LabGUI Preview Engine — Renders tkinter code and captures screenshots.
Windows-first implementation using win32gui + PIL.ImageGrab.
"""

import subprocess
import tempfile
import time
import os
import signal
import sys
from pathlib import Path
from typing import Optional

try:
    from PIL import ImageGrab
    HAS_PIL = True
except ImportError:
    HAS_PIL = False

# Windows-specific window capture
try:
    import win32gui
    import win32ui
    import win32con
    from ctypes import windll
    HAS_WIN32 = True
except ImportError:
    HAS_WIN32 = False

# Fallback: mss for cross-platform screen capture
try:
    from mss import mss
    from PIL import Image
    HAS_MSS = True
except ImportError:
    HAS_MSS = False


MARKER_TITLE = "__LABGUI_PREVIEW__"


def inject_preview_marker(code: str) -> str:
    """Inject a marker title into the tkinter code so we can find the window."""
    # Replace the title line with our marker
    if 'self.root.title(' in code:
        code = code.replace(
            'self.root.title(',
            f'self.root.title("{MARKER_TITLE}" + ',
            1
        )
    return code


def capture_window_win32(title_substring: str) -> Optional[bytes]:
    """Capture a specific window by title substring using win32 API."""
    if not HAS_WIN32:
        return None

    def callback(hwnd, extra):
        text = win32gui.GetWindowText(hwnd)
        if title_substring in text:
            extra.append(hwnd)

    handles = []
    win32gui.EnumWindows(callback, handles)
    if not handles:
        return None

    hwnd = handles[0]

    # Bring to foreground
    try:
        win32gui.SetForegroundWindow(hwnd)
        time.sleep(0.2)
    except Exception:
        pass

    # Get window rect
    left, top, right, bottom = win32gui.GetWindowRect(hwnd)
    width = right - left
    height = bottom - top

    if width <= 0 or height <= 0:
        return None

    # Capture window DC
    hwnd_dc = win32gui.GetWindowDC(hwnd)
    mfc_dc = win32ui.CreateDCFromHandle(hwnd_dc)
    save_dc = mfc_dc.CreateCompatibleDC()

    save_bitmap = win32ui.CreateBitmap()
    save_bitmap.CreateCompatibleBitmap(mfc_dc, width, height)
    save_dc.SelectObject(save_bitmap)

    # Use PrintWindow to capture even occluded windows
    windll.user32.PrintWindow(hwnd, save_dc.GetSafeHdc(), 2)

    # Convert to PIL Image
    bmpinfo = save_bitmap.GetInfo()
    bmpstr = save_bitmap.GetBitmapBits(True)
    im = Image.frombuffer(
        'RGB',
        (bmpinfo['bmWidth'], bmpinfo['bmHeight']),
        bmpstr, 'raw', 'BGRX', 0, 1
    )

    # Cleanup
    win32gui.DeleteObject(save_bitmap.GetHandle())
    save_dc.DeleteDC()
    mfc_dc.DeleteDC()
    win32gui.ReleaseDC(hwnd, hwnd_dc)

    # Save to bytes
    from io import BytesIO
    buf = BytesIO()
    im.save(buf, format='PNG')
    return buf.getvalue()


def capture_screen_fallback() -> Optional[bytes]:
    """Fallback: capture full screen using PIL.ImageGrab."""
    if not HAS_PIL:
        return None
    try:
        img = ImageGrab.grab()
        from io import BytesIO
        buf = BytesIO()
        img.save(buf, format='PNG')
        return buf.getvalue()
    except Exception:
        return None


def render_preview(code: str, timeout: float = 5.0) -> dict:
    """
    Run tkinter code in a subprocess and capture a screenshot.
    Returns {"image": bytes} or {"error": str}.
    """
    # Inject marker
    preview_code = inject_preview_marker(code)

    # Write to temp file
    with tempfile.NamedTemporaryFile(mode='w', suffix='.py', delete=False) as f:
        f.write(preview_code)
        temp_path = f.name

    proc = None
    try:
        # Launch the tkinter app
        proc = subprocess.Popen(
            [sys.executable, temp_path],
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            creationflags=subprocess.CREATE_NO_WINDOW if sys.platform == 'win32' else 0
        )

        # Wait for window to appear
        time.sleep(1.0)

        # Try window-specific capture first
        image_bytes = None
        if HAS_WIN32:
            image_bytes = capture_window_win32(MARKER_TITLE)

        # Fallback to full screen
        if image_bytes is None:
            image_bytes = capture_screen_fallback()

        if image_bytes is None:
            return {"error": "Failed to capture screenshot. Ensure tkinter window is visible."}

        return {"image": image_bytes}

    except Exception as e:
        return {"error": str(e)}

    finally:
        # Cleanup subprocess
        if proc is not None:
            try:
                proc.kill()
                proc.wait(timeout=1.0)
            except Exception:
                pass
        # Cleanup temp file
        try:
            os.unlink(temp_path)
        except Exception:
            pass
