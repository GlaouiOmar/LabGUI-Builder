# Lab Domain Architecture Specification

## Browser-Based Visual GUI Builder for Scientific Instrumentation

**Version:** 1.0 — Implementation-Ready Specification  
**Scope:** Instrument binding, state variables, data logging, alarms, lab templates, real-time data, error handling  
**Target:** Python tkinter code generation for lab environments  
**Protocols (Phase 1):** VISA (GPIB/USB/TCPIP/Serial) · Serial (RS-232/RS-485/USB-UART)

---

## Table of Contents

1. [Instrument Binding System](#1-instrument-binding-system)
2. [State Variable System](#2-state-variable-system)
3. [Data Logging System](#3-data-logging-system)
4. [Alarm System](#4-alarm-system)
5. [Lab Templates](#5-lab-templates)
6. [Real-Time Data Considerations](#6-real-time-data-considerations)
7. [Error Handling Strategy](#7-error-handling-strategy)

---

## 1. Instrument Binding System

### 1.1 Supported Protocol Specifications

#### 1.1.1 VISA Protocol

The VISA (Virtual Instrument Software Architecture) protocol provides a unified API for communicating with instruments over GPIB, USB, TCP/IP, and serial interfaces.

**Resource String Formats:**

| Interface | Resource String Example | Description |
|-----------|------------------------|-------------|
| GPIB | `GPIB0::22::INSTR` | GPIB board 0, primary address 22 |
| GPIB Secondary | `GPIB0::22::0::INSTR` | With secondary address 0 |
| USB TMC | `USB0::0x1AB1::0x0588::DS1ZA123456789::INSTR` | USB Test & Measurement Class |
| USB RAW | `USB0::0x1234::0x5678::M1234567::RAW` | USB raw communication |
| TCP/IP (VXI-11) | `TCPIP0::192.168.1.10::inst0::INSTR` | LAN instrument via VXI-11 |
| TCP/IP (HiSLIP) | `TCPIP0::192.168.1.10::hislip0::INSTR` | Hi-Speed LAN Instrument Protocol |
| TCP/IP (Socket) | `TCPIP0::192.168.1.10::5025::SOCKET` | Raw TCP socket |
| Serial (via VISA) | `ASRL1::INSTR` | COM1 through VISA layer |
| Serial (alias) | `ASRL/dev/ttyUSB0::INSTR` | Linux serial via VISA |

**Connection Parameters:**

```python
@dataclass
class VISAConnectionConfig:
    """VISA connection configuration."""
    resource_string: str               # e.g., "GPIB0::22::INSTR"
    backend: str = "pyvisa"           # "pyvisa" (NI-VISA) or "pyvisa-py"
    timeout_ms: int = 5000            # 1 - 120000 ms
    read_termination: str = "\\n"     # \\n, \\r, \\r\\n, "", or custom
    write_termination: str = "\\n"    # same options
    send_end_on_write: bool = True    # Assert EOI on write
    suppress_end_on_read: bool = False
    baudrate: int = 9600              # Only for ASRL resources
    data_bits: int = 8                # 7 or 8, ASRL only
    parity: str = "none"              # none, even, odd, mark, space
    stop_bits: str = "one"            # one, one_and_a_half, two
    flow_control: str = "none"        # none, xon_xoff, rts_cts, dtr_dsr
```

**Auto-Detection API:**

```python
# Generated auto-detection code pattern
import pyvisa

def detect_visa_instruments():
    """Scan for available VISA instruments."""
    rm = pyvisa.ResourceManager()  # or ResourceManager('@py') for pyvisa-py
    resources = rm.list_resources()
    instruments = []
    for resource in resources:
        info = {"resource": resource, "idn": None, "status": "unknown"}
        try:
            inst = rm.open_resource(resource, timeout=2000)
            idn = inst.query("*IDN?")
            info["idn"] = idn.strip()
            info["status"] = "ok"
            inst.close()
        except Exception as e:
            info["status"] = f"error: {e}"
        instruments.append(info)
    rm.close()
    return instruments

# Example output:
# [
#   {"resource": "GPIB0::22::INSTR", "idn": "Keysight Technologies,34401A,MY45012345,A.02.14", "status": "ok"},
#   {"resource": "USB0::0x1AB1::0x0588::DS1ZA123456789::INSTR", "idn": "Rigol Technologies,DS1054Z,DS1ZA123456789,00.04.04", "status": "ok"},
#   {"resource": "ASRL3::INSTR", "idn": None, "status": "error: timeout"}
# ]
```

#### 1.1.2 Serial Protocol (Direct pyserial)

Direct serial communication without the VISA abstraction layer. Preferred for simple RS-232/RS-485 instruments and when VISA drivers are not available.

**Port Selection:**

| OS | Port Format | Examples |
|----|------------|----------|
| Windows | `COM{N}` | `COM1`, `COM3`, `COM15` (up to `COM256`) |
| Linux | `/dev/tty{X}` | `/dev/ttyUSB0`, `/dev/ttyACM0`, `/dev/ttyS0` |
| macOS | `/dev/cu.*` | `/dev/cu.usbserial-A1234567`, `/dev/cu.usbmodem12345` |

**Serial Configuration Parameters:**

```python
@dataclass
class SerialConnectionConfig:
    """Serial connection configuration."""
    port: str                       # e.g., "COM3" or "/dev/ttyUSB0"
    baudrate: int = 9600            # 300, 600, 1200, 2400, 4800, 9600,
                                    # 14400, 19200, 38400, 57600, 115200
    bytesize: int = 8               # 7 or 8
    parity: str = "N"               # N=None, E=Even, O=Odd, M=Mark, S=Space
    stopbits: float = 1.0           # 1, 1.5, 2
    flow_control: str = "none"      # none, xon_xoff (software), rts_cts (hardware)
    timeout_s: float = 5.0          # Read timeout in seconds
    write_timeout_s: float = 5.0    # Write timeout in seconds
    inter_byte_timeout_s: float = None
    read_termination: bytes = b"\\n"
    write_termination: bytes = b"\\n"
```

**Valid Configuration Matrix:**

| Baudrate | Bytesize | Parity | Stopbits | Flow Control |
|----------|----------|--------|----------|--------------|
| 300 | 7, 8 | N, E, O, M, S | 1, 1.5, 2 | none, xon_xoff, rts_cts |
| 600 | 7, 8 | N, E, O, M, S | 1, 1.5, 2 | none, xon_xoff, rts_cts |
| 1200 | 7, 8 | N, E, O, M, S | 1, 1.5, 2 | none, xon_xoff, rts_cts |
| 2400 | 7, 8 | N, E, O, M, S | 1, 1.5, 2 | none, xon_xoff, rts_cts |
| 4800 | 7, 8 | N, E, O, M, S | 1, 1.5, 2 | none, xon_xoff, rts_cts |
| 9600 | 7, 8 | N, E, O, M, S | 1, 1.5, 2 | none, xon_xoff, rts_cts |
| 14400 | 7, 8 | N, E, O, M, S | 1, 1.5, 2 | none, xon_xoff, rts_cts |
| 19200 | 7, 8 | N, E, O, M, S | 1, 1.5, 2 | none, xon_xoff, rts_cts |
| 38400 | 7, 8 | N, E, O, M, S | 1, 1.5, 2 | none, xon_xoff, rts_cts |
| 57600 | 7, 8 | N, E, O, M, S | 1, 1.5, 2 | none, xon_xoff, rts_cts |
| 115200 | 7, 8 | N, E, O, M, S | 1, 1.5, 2 | none, xon_xoff, rts_cts |

**Auto-Detection Code:**

```python
import serial.tools.list_ports

def detect_serial_ports():
    """Scan for available serial ports with descriptive info."""
    ports = serial.tools.list_ports.comports()
    results = []
    for port in ports:
        results.append({
            "port": port.device,
            "description": port.description,
            "hwid": port.hwid,
            "vid": port.vid,       # USB Vendor ID (if USB serial)
            "pid": port.pid,       # USB Product ID
            "serial_number": port.serial_number,
            "manufacturer": port.manufacturer,
        })
    return results

def autodetect_baudrate(port, baudrates=[9600, 115200, 19200, 38400, 57600, 4800]):
    """Try common baudrates and return working ones."""
    working = []
    for baud in baudrates:
        try:
            with serial.Serial(port, baud, timeout=2) as ser:
                ser.write(b"*IDN?\\n")
                response = ser.readline()
                if response:
                    working.append({"baudrate": baud, "response": response.decode().strip()})
        except Exception:
            pass
    return working
```

**Backend Selection Logic:**

```python
def select_visa_backend():
    """
    Determine best VISA backend:
    1. Try NI-VISA (pyvisa with native binary) - best performance, most features
    2. Fall back to pyvisa-py (pure Python) - no install needed, slightly slower
    3. Fall back to direct pyserial for serial-only use cases
    """
    try:
        rm = pyvisa.ResourceManager()
        rm.close()
        return "pyvisa"  # NI-VISA available
    except OSError:
        try:
            rm = pyvisa.ResourceManager('@py')
            rm.close()
            return "pyvisa-py"
        except Exception:
            return "pyserial"  # Direct serial only
```

---

### 1.2 Command-Response Template System

The command-response template system replaces the generic "query" action with instrument-specific, parseable command definitions. Each template describes one command that can be sent to an instrument and how to interpret the response.

#### 1.2.1 Template Schema

```json
{
  "$schema": "command-template-v1",
  "name": "read_voltage",
  "description": "Read DC voltage measurement",
  "category": "measurement",
  "send": "MEAS:VOLT:DC?\\n",
  "send_encoding": "ascii",
  "parse_type": "float",
  "parse_pattern": null,
  "parse_options": {
    "strip_whitespace": true,
    "strip_prefix": null,
    "strip_suffix": null
  },
  "timeout_ms": 5000,
  "unit": "V",
  "display_format": "%.6f",
  "default_interval_ms": 500,
  "notes": "Returns voltage in Volts. Device must be in DC voltage mode."
}
```

**Parse Types:**

| Type | Description | Example Raw Response | Parsed Value |
|------|-------------|---------------------|--------------|
| `string` | Return as-is (strip whitespace) | `"Keysight 34401A"` | `"Keysight 34401A"` |
| `int` | Parse as integer | `"+142"` | `142` |
| `float` | Parse as float | `"+1.234567E-03"` | `0.001234567` |
| `bool` | Parse as boolean | `"1"` or `"+1"` → True, `"0"` → False | `True` |
| `regex` | Apply regex pattern, return first group | `"+1.23E-3\\r\\n"` with `(.*)` → `"+1.23E-3"` | `"+1.23E-3"` |
| `regex_multi` | Apply regex, return all groups as list | `"1,2,3"` with `(\\d+),(\\d+),(\\d+)` | `[1, 2, 3]` |
| `bytes` | Return raw bytes (no parsing) | `b'\\x01\\x03\\x04\\x00\\x64\\x00\\x37\\x3A\\xF5'` | `b'\\x01\\x03...'` |
| `json` | Parse as JSON | `'{"v": 1.23, "u": "V"}'` | `{"v": 1.23, "u": "V"}` |
| `csv` | Parse comma-separated values | `"1.23,4.56,7.89"` | `[1.23, 4.56, 7.89]` |
| `binary_float32` | Parse IEEE 754 binary32 | 4 bytes | `float` |
| `binary_float64` | Parse IEEE 754 binary64 | 8 bytes | `float` |
| `binary_int16` | Parse 16-bit signed integer | 2 bytes | `int` |
| `binary_int32` | Parse 32-bit signed integer | 4 bytes | `int` |

**Complete Template Examples:**

```json
// Float parsing (typical multimeter)
{
  "name": "read_voltage",
  "description": "Read DC voltage",
  "send": "MEAS:VOLT:DC?\\n",
  "parse_type": "float",
  "parse_pattern": null,
  "timeout_ms": 5000,
  "unit": "V",
  "display_format": "%.6f V"
}

// Regex parsing (status byte)
{
  "name": "read_status",
  "description": "Read status byte",
  "send": "*STB?\\n",
  "parse_type": "regex",
  "parse_pattern": "(\\d+)",
  "timeout_ms": 2000,
  "unit": null,
  "display_format": "%s"
}

// Binary/bytes (Modbus-style)
{
  "name": "read_raw",
  "description": "Read raw binary data",
  "send": "\\x01\\x03\\x00\\x00\\x00\\x02\\xC4\\x0B",
  "send_encoding": "bytes",
  "parse_type": "bytes",
  "parse_pattern": null,
  "timeout_ms": 5000,
  "unit": null,
  "display_format": "hex"
}

// CSV multi-value (multiple channels)
{
  "name": "read_all_channels",
  "description": "Read all input channels",
  "send": "READ?\\n",
  "parse_type": "csv",
  "parse_pattern": null,
  "timeout_ms": 5000,
  "unit": "V",
  "display_format": "%.4f"
}

// Regex multi-group (parsed response)
{
  "name": "read_identity",
  "description": "Read instrument identity",
  "send": "*IDN?\\n",
  "parse_type": "regex_multi",
  "parse_pattern": "([^,]+),([^,]+),([^,]+),([^,]+)",
  "timeout_ms": 2000,
  "unit": null,
  "display_format": "%s"
}
```

#### 1.2.2 Pre-Built Instrument Template Libraries

**Keysight/Agilent 34401A Digital Multimeter:**

```json
{
  "instrument": "Keysight 34401A",
  "interface": ["GPIB", "RS-232"],
  "templates": [
    {"name": "identify",        "send": "*IDN?\\n",          "parse_type": "string", "timeout_ms": 2000},
    {"name": "read_voltage_dc", "send": "MEAS:VOLT:DC?\\n",  "parse_type": "float",  "timeout_ms": 5000, "unit": "V"},
    {"name": "read_voltage_ac", "send": "MEAS:VOLT:AC?\\n",  "parse_type": "float",  "timeout_ms": 5000, "unit": "V"},
    {"name": "read_current_dc", "send": "MEAS:CURR:DC?\\n",  "parse_type": "float",  "timeout_ms": 5000, "unit": "A"},
    {"name": "read_current_ac", "send": "MEAS:CURR:AC?\\n",  "parse_type": "float",  "timeout_ms": 5000, "unit": "A"},
    {"name": "read_resistance", "send": "MEAS:RES?\\n",      "parse_type": "float",  "timeout_ms": 5000, "unit": "Ohm"},
    {"name": "read_freq",       "send": "MEAS:FREQ?\\n",     "parse_type": "float",  "timeout_ms": 5000, "unit": "Hz"},
    {"name": "read_period",     "send": "MEAS:PER?\\n",      "parse_type": "float",  "timeout_ms": 5000, "unit": "s"},
    {"name": "config_voltage_dc","send": "CONF:VOLT:DC\\n",   "parse_type": "none",   "timeout_ms": 2000},
    {"name": "config_current_dc","send": "CONF:CURR:DC\\n",   "parse_type": "none",   "timeout_ms": 2000},
    {"name": "config_resistance","send": "CONF:RES\\n",       "parse_type": "none",   "timeout_ms": 2000},
    {"name": "system_error",    "send": "SYST:ERR?\\n",      "parse_type": "string", "timeout_ms": 2000},
    {"name": "reset",           "send": "*RST\\n",           "parse_type": "none",   "timeout_ms": 2000},
    {"name": "clear_status",    "send": "*CLS\\n",           "parse_type": "none",   "timeout_ms": 1000},
    {"name": "operation_complete","send": "*OPC?\\n",         "parse_type": "int",    "timeout_ms": 30000}
  ]
}
```

**Tektronix TDS Series Oscilloscope:**

```json
{
  "instrument": "Tektronix TDS 1000/2000",
  "interface": ["USB", "GPIB"],
  "templates": [
    {"name": "identify",        "send": "*IDN?\\n",                  "parse_type": "string",  "timeout_ms": 2000},
    {"name": "ch1_volts",       "send": "CH1:VOLts?\\n",             "parse_type": "float",   "timeout_ms": 2000, "unit": "V/div"},
    {"name": "ch2_volts",       "send": "CH2:VOLts?\\n",             "parse_type": "float",   "timeout_ms": 2000, "unit": "V/div"},
    {"name": "time_scale",      "send": "HORizontal:MAIn:SCAle?\\n", "parse_type": "float",   "timeout_ms": 2000, "unit": "s/div"},
    {"name": "acq_state",       "send": "ACQuire:STATE?\\n",         "parse_type": "int",     "timeout_ms": 2000},
    {"name": "curve_ch1",       "send": "CURVE?\\n",                 "parse_type": "bytes",   "timeout_ms": 10000, "notes": "Must select CH1 first: DATA:SOUrce CH1"},
    {"name": "select_ch1",      "send": "DATA:SOUrce CH1\\n",        "parse_type": "none",    "timeout_ms": 1000},
    {"name": "select_ch2",      "send": "DATA:SOUrce CH2\\n",        "parse_type": "none",    "timeout_ms": 1000},
    {"name": "set_time_scale",  "send": "HORizontal:MAIn:SCAle {value}\\n", "parse_type": "none", "timeout_ms": 1000},
    {"name": "set_ch1_volts",   "send": "CH1:VOLts {value}\\n",      "parse_type": "none",    "timeout_ms": 1000},
    {"name": "autoset",         "send": "AUTOSExec\\n",              "parse_type": "none",    "timeout_ms": 5000}
  ]
}
```

**Fluke 45 Dual Display Multimeter:**

```json
{
  "instrument": "Fluke 45",
  "interface": ["RS-232", "GPIB"],
  "templates": [
    {"name": "identify",        "send": "*IDN?\\n",   "parse_type": "string", "timeout_ms": 2000},
    {"name": "read_vdc",        "send": "VDC\\n",     "parse_type": "float",  "timeout_ms": 5000, "unit": "V"},
    {"name": "read_vac",        "send": "VAC\\n",     "parse_type": "float",  "timeout_ms": 5000, "unit": "V"},
    {"name": "read_adc",        "send": "ADC\\n",     "parse_type": "float",  "timeout_ms": 5000, "unit": "A"},
    {"name": "read_aac",        "send": "AAC\\n",     "parse_type": "float",  "timeout_ms": 5000, "unit": "A"},
    {"name": "read_ohm",        "send": "OHM\\n",     "parse_type": "float",  "timeout_ms": 5000, "unit": "Ohm"},
    {"name": "remote_mode",     "send": "REMOTE\\n",  "parse_type": "none",   "timeout_ms": 1000},
    {"name": "local_mode",      "send": "LOCAL\\n",   "parse_type": "none",   "timeout_ms": 1000}
  ]
}
```

**Generic SCPI (works with most SCPI-compliant instruments):**

```json
{
  "instrument": "Generic SCPI",
  "interface": ["GPIB", "USB", "TCPIP", "Serial"],
  "templates": [
    {"name": "identify",        "send": "*IDN?\\n",   "parse_type": "string", "timeout_ms": 2000},
    {"name": "reset",           "send": "*RST\\n",    "parse_type": "none",   "timeout_ms": 2000},
    {"name": "operation_complete","send": "*OPC?\\n", "parse_type": "int",    "timeout_ms": 30000},
    {"name": "clear_status",    "send": "*CLS\\n",    "parse_type": "none",   "timeout_ms": 1000},
    {"name": "read_event_status","send": "*ESR?\\n",  "parse_type": "int",    "timeout_ms": 2000},
    {"name": "self_test",       "send": "*TST?\\n",   "parse_type": "int",    "timeout_ms": 60000}
  ]
}
```

---

### 1.3 Binding Configuration UI

The Instrument Configuration Dialog is a multi-step wizard embedded in the designer sidebar.

#### Step 1: Protocol Selection

```
+------------------------------------------+
|  Add Instrument                          |
+------------------------------------------+
|                                          |
|  [1] Protocol                            |
|                                          |
|  (*) VISA (GPIB / USB / LAN / Serial)    |
|  ( ) Serial (Direct pyserial)            |
|                                          |
|  [Cancel]              [Next >]          |
+------------------------------------------+
```

#### Step 2: Connection Settings (VISA selected)

```
+------------------------------------------+
|  Add Instrument                          |
+------------------------------------------+
|  [1] Protocol > [2] Connection           |
+------------------------------------------+
|                                          |
|  Resource String:                        |
|  [GPIB0::22::INSTR          [v] Auto]    |
|                                          |
|  Backend:                                |
|  [pyvisa (NI-VISA)                    v] |
|                                          |
|  Timeout: [5000] ms                      |
|                                          |
|  Read Termination: [\\n              v]   |
|  Write Termination: [\\n             v]   |
|                                          |
|  [Advanced >>]                           |
|                                          |
|  [< Back]              [Next >]          |
+------------------------------------------+
```

#### Step 2: Connection Settings (Serial selected)

```
+------------------------------------------+
|  Add Instrument                          |
+------------------------------------------+
|  [1] Protocol > [2] Connection           |
+------------------------------------------+
|                                          |
|  Port: [COM3                      [v] Scan]
|                                          |
|  Baudrate: [9600                    v]   |
|  Data Bits: [8                      v]   |
|  Parity: [None                      v]   |
|  Stop Bits: [1                      v]   |
|  Flow Control: [None                v]   |
|                                          |
|  Timeout: [5.0] seconds                  |
|                                          |
|  [< Back]              [Next >]          |
+------------------------------------------+
```

#### Step 3: Connection Test

```
+------------------------------------------+
|  Add Instrument                          |
+------------------------------------------+
|  ... > [2] Connection > [3] Test         |
+------------------------------------------+
|                                          |
|  [Test Connection]                       |
|                                          |
|  Status: [ Connected ]                   |
|  Response: Keysight Technologies,34401A, |
|            MY45012345,A.02.14            |
|                                          |
|  [Pre-built Templates]                   |
|  [Keysight 34401A       ] [Load]        |
|  [Generic SCPI          ] [Load]        |
|  [Custom Commands       ] [Edit]        |
|                                          |
|  [< Back]              [Next >]          |
+------------------------------------------+
```

**Test Connection Flow (generated code):**

```python
def test_instrument_connection(config):
    """Test connection and return instrument identity."""
    if config.protocol == "visa":
        rm = pyvisa.ResourceManager(config.backend)
        inst = rm.open_resource(
            config.resource_string,
            timeout=config.timeout_ms
        )
        inst.read_termination = config.read_termination
        inst.write_termination = config.write_termination
        idn = inst.query("*IDN?")
        inst.close()
        rm.close()
        return {"success": True, "idn": idn.strip()}
    elif config.protocol == "serial":
        with serial.Serial(
            port=config.port,
            baudrate=config.baudrate,
            bytesize=config.bytesize,
            parity=config.parity,
            stopbits=config.stopbits,
            timeout=config.timeout_s
        ) as ser:
            ser.write(b"*IDN?\\n")
            response = ser.readline()
            return {"success": True, "idn": response.decode().strip()}
```

#### Step 4: Command Definition

```
+------------------------------------------+
|  Add Instrument                          |
+------------------------------------------+
|  ... > [3] Test > [4] Commands           |
+------------------------------------------+
|                                          |
|  Commands:                               |
|  +------------------------------------+  |
|  | [x] read_voltage | MEAS:VOLT:DC?  |  |
|  | [x] read_current | MEAS:CURR:DC?  |  |
|  | [x] read_resist  | MEAS:RES?      |  |
|  | [ ] read_freq    | MEAS:FREQ?     |  |
|  +------------------------------------+  |
|  [+ Add]  [Edit]  [Delete]  [Duplicate]  |
|                                          |
|  Command Editor:                         |
|  Name: [read_voltage________]            |
|  Send: [MEAS:VOLT:DC?       ]            |
|  Parse: [Float                    v]     |
|  Unit: [V____]                           |
|  Timeout: [5000] ms                      |
|  Format: [%.6f____]                      |
|                                          |
|  [< Back]              [Next >]          |
+------------------------------------------+
```

#### Step 5: Visual Binding to Widgets

```
+------------------------------------------+
|  Add Instrument                          |
+------------------------------------------+
|  ... > [4] Commands > [5] Bind           |
+------------------------------------------+
|                                          |
|  Drag command outputs to widgets:        |
|                                          |
|  INSTRUMENT: DMM-1 (34401A)              |
|    + read_voltage  -----> [Label: lbl_v] |
|    + read_current  -----> [Label: lbl_i] |
|    + read_resist   -----> [Label: lbl_r] |
|                                          |
|  BINDING MODE:                           |
|  (*) Polled   Interval: [500] ms         |
|  ( ) Triggered (bind to button click)    |
|                                          |
|  ON ERROR:                               |
|  (*) Keep last value                     |
|  ( ) Set to NaN                          |
|  ( ) Set to default                      |
|                                          |
|  [< Back]              [Finish]          |
+------------------------------------------+
```

**Binding IR (Internal Representation):**

```json
{
  "instrument_id": "dmm_1",
  "instrument_name": "DMM-1",
  "protocol": "visa",
  "connection": {
    "resource_string": "GPIB0::22::INSTR",
    "backend": "pyvisa",
    "timeout_ms": 5000,
    "read_termination": "\\n",
    "write_termination": "\\n"
  },
  "commands": {
    "read_voltage": {
      "send": "MEAS:VOLT:DC?\\n",
      "parse_type": "float",
      "timeout_ms": 5000,
      "unit": "V"
    }
  },
  "bindings": [
    {
      "command": "read_voltage",
      "target_widget": "lbl_voltage",
      "target_property": "text",
      "mode": "polled",
      "interval_ms": 500,
      "format": "%.6f V",
      "on_error": "keep_last"
    }
  ]
}
```

---

### 1.4 Generated Threading Architecture

All instrument I/O runs in background daemon threads. GUI updates are marshaled to the main thread via `root.after(0, ...)`.

#### 1.4.1 Polled Binding (Complete Generated Code)

```python
"""
Generated by LabGUI Builder - Polled Instrument Binding
Instrument: DMM-1 (Keysight 34401A)
Binding: read_voltage -> lbl_voltage every 500ms
"""

import tkinter as tk
from tkinter import ttk
import threading
import time
import queue
import pyvisa


class PolledInstrumentBinding:
    """
    Handles polled instrument communication.
    Runs a background thread that queries the instrument at fixed intervals
    and updates a tkinter variable via thread-safe after() calls.
    """

    def __init__(self, root, variable_name, widget_ref, command_config,
                 connection_config, interval_ms=500, on_error="keep_last"):
        self.root = root
        self.variable_name = variable_name
        self.widget_ref = widget_ref  # lambda: widget
        self.command_config = command_config
        self.connection_config = connection_config
        self.interval_ms = interval_ms
        self.on_error = on_error  # "keep_last", "nan", "default"

        # Internal state
        self._running = False
        self._thread = None
        self._instrument = None
        self._resource_manager = None
        self._last_value = None
        self._error_count = 0
        self._max_errors = 10
        self._reconnect_interval_s = 5.0

        # tkinter variable (created in main thread)
        self.tk_var = tk.StringVar(value="---")

    def start(self):
        """Start the polling thread."""
        if self._running:
            return
        self._running = True
        self._error_count = 0
        self._thread = threading.Thread(
            target=self._polling_loop,
            name=f"Poll-{self.variable_name}",
            daemon=True
        )
        self._thread.start()

    def stop(self):
        """Stop polling and close connection."""
        self._running = False
        if self._thread:
            self._thread.join(timeout=self.interval_ms / 1000.0 + 1.0)
        self._close_connection()

    def _open_connection(self):
        """Open VISA connection."""
        try:
            backend = self.connection_config.get("backend", "")
            rm_args = (backend,) if backend and backend != "pyvisa" else ()
            self._resource_manager = pyvisa.ResourceManager(*rm_args)
            self._instrument = self._resource_manager.open_resource(
                self.connection_config["resource_string"],
                timeout=self.connection_config.get("timeout_ms", 5000)
            )
            self._instrument.read_termination = self.connection_config.get(
                "read_termination", "\\n"
            )
            self._instrument.write_termination = self.connection_config.get(
                "write_termination", "\\n"
            )
            return True
        except Exception as e:
            self._log_error(f"Connection open failed: {e}")
            return False

    def _close_connection(self):
        """Safely close VISA connection."""
        try:
            if self._instrument:
                self._instrument.close()
                self._instrument = None
        except Exception:
            pass
        try:
            if self._resource_manager:
                self._resource_manager.close()
                self._resource_manager = None
        except Exception:
            pass

    def _send_query(self):
        """Send command and parse response."""
        cmd = self.command_config["send"]
        timeout = self.command_config.get("timeout_ms", 5000)
        self._instrument.timeout = timeout

        # Handle bytes vs string commands
        if self.command_config.get("send_encoding") == "bytes":
            raw_cmd = cmd.encode('latin-1') if isinstance(cmd, str) else cmd
            self._instrument.write_raw(raw_cmd)
            raw_response = self._instrument.read_raw()
        else:
            response = self._instrument.query(cmd)
            raw_response = response

        # Parse response
        parse_type = self.command_config.get("parse_type", "string")

        if parse_type == "float":
            value = float(raw_response.strip())
        elif parse_type == "int":
            value = int(raw_response.strip())
        elif parse_type == "string":
            value = raw_response.strip()
        elif parse_type == "bool":
            value = bool(int(raw_response.strip()))
        elif parse_type == "regex":
            import re
            pattern = self.command_config["parse_pattern"]
            match = re.search(pattern, raw_response)
            value = match.group(1) if match else None
        elif parse_type == "bytes":
            value = raw_response  # Already bytes from read_raw
        else:
            value = raw_response

        return value

    def _update_gui(self, value):
        """Thread-safe GUI update via root.after()."""
        def _do_update():
            try:
                fmt = self.command_config.get("display_format", "%s")
                unit = self.command_config.get("unit", "")
                if unit and "%s" not in fmt:
                    display = f"{fmt} {unit}".replace("%s", str(value)).replace(
                        "%f", str(value)).replace("%d", str(value))
                    # Simple format substitution
                    try:
                        display = fmt % value
                        if unit:
                            display = f"{display} {unit}"
                    except (TypeError, ValueError):
                        display = f"{value} {unit}".strip()
                else:
                    try:
                        display = fmt % value
                    except (TypeError, ValueError):
                        display = str(value)
                self.tk_var.set(display)
                self._last_value = value
            except Exception as e:
                self._log_error(f"GUI update failed: {e}")

        self.root.after(0, _do_update)

    def _handle_error(self, error):
        """Handle instrument error based on policy."""
        self._error_count += 1
        self._log_error(f"Query error (count={self._error_count}): {error}")

        if self.on_error == "nan" and self.command_config.get("parse_type") == "float":
            self._update_gui(float('nan'))
        elif self.on_error == "default":
            self._update_gui("---")
        # "keep_last" does nothing - keeps previous value

        # Reconnect if too many consecutive errors
        if self._error_count >= self._max_errors:
            self._log_error("Too many errors, reconnecting...")
            self._close_connection()
            time.sleep(self._reconnect_interval_s)
            if self._open_connection():
                self._error_count = 0

    def _polling_loop(self):
        """Main polling loop - runs in daemon thread."""
        # Initial connection
        while self._running and not self._open_connection():
            time.sleep(self._reconnect_interval_s)

        while self._running:
            try:
                if self._instrument is None:
                    if not self._open_connection():
                        time.sleep(self._reconnect_interval_s)
                        continue

                value = self._send_query()
                self._update_gui(value)
                self._error_count = 0  # Reset on success

            except Exception as e:
                self._handle_error(e)

            # Sleep until next interval
            time.sleep(self.interval_ms / 1000.0)


# Usage in generated tkinter application:
"""
class Application:
    def __init__(self, root):
        self.root = root
        root.title("Multimeter Readout")

        # UI
        ttk.Label(root, text="Voltage:").grid(row=0, column=0, padx=5, pady=5)
        self.lbl_voltage = ttk.Label(root, text="---", width=15)
        self.lbl_voltage.grid(row=0, column=1, padx=5, pady=5)

        # Connection config
        conn_cfg = {
            "resource_string": "GPIB0::22::INSTR",
            "backend": "pyvisa",
            "timeout_ms": 5000,
            "read_termination": "\\n",
            "write_termination": "\\n"
        }
        cmd_cfg = {
            "send": "MEAS:VOLT:DC?\\n",
            "parse_type": "float",
            "display_format": "%.6f",
            "unit": "V",
            "timeout_ms": 5000
        }

        # Create binding
        self.voltage_binding = PolledInstrumentBinding(
            root=root,
            variable_name="voltage",
            widget_ref=lambda: self.lbl_voltage,
            command_config=cmd_cfg,
            connection_config=conn_cfg,
            interval_ms=500,
            on_error="keep_last"
        )

        # Link tk_var to widget
        self.lbl_voltage.configure(textvariable=self.voltage_binding.tk_var)

        # Start polling
        self.voltage_binding.start()

        # Cleanup on close
        root.protocol("WM_DELETE_WINDOW", self.on_close)

    def on_close(self):
        self.voltage_binding.stop()
        self.root.destroy()
"""
```

#### 1.4.2 Triggered Binding (Complete Generated Code)

```python
"""
Generated by LabGUI Builder - Triggered Instrument Binding
Instrument: DMM-1 (Keysight 34401A)
Binding: read_voltage -> lbl_voltage on button click
"""

import tkinter as tk
from tkinter import ttk
import threading
import pyvisa


class TriggeredInstrumentBinding:
    """
    Handles triggered (on-demand) instrument communication.
    Spawns a short-lived thread per query, updates GUI via after().
    Uses a thread pool to limit concurrent queries.
    """

    _global_executor = None
    _max_workers = 5

    @classmethod
    def get_executor(cls):
        """Shared thread pool for all triggered bindings."""
        if cls._global_executor is None:
            from concurrent.futures import ThreadPoolExecutor
            cls._global_executor = ThreadPoolExecutor(
                max_workers=cls._max_workers,
                thread_name_prefix="TriggerQuery"
            )
        return cls._global_executor

    @classmethod
    def shutdown_executor(cls):
        if cls._global_executor:
            cls._global_executor.shutdown(wait=False)
            cls._global_executor = None

    def __init__(self, root, variable_name, command_config, connection_config,
                 on_error="keep_last"):
        self.root = root
        self.variable_name = variable_name
        self.command_config = command_config
        self.connection_config = connection_config
        self.on_error = on_error

        self.tk_var = tk.StringVar(value="---")
        self._instrument = None
        self._resource_manager = None
        self._busy = False

    def _ensure_connection(self):
        """Open connection if not already open."""
        if self._instrument is None:
            backend = self.connection_config.get("backend", "")
            rm_args = (backend,) if backend and backend != "pyvisa" else ()
            self._resource_manager = pyvisa.ResourceManager(*rm_args)
            self._instrument = self._resource_manager.open_resource(
                self.connection_config["resource_string"],
                timeout=self.connection_config.get("timeout_ms", 5000)
            )
            self._instrument.read_termination = self.connection_config.get(
                "read_termination", "\\n"
            )
            self._instrument.write_termination = self.connection_config.get(
                "write_termination", "\\n"
            )

    def _close_connection(self):
        try:
            if self._instrument:
                self._instrument.close()
                self._instrument = None
        except Exception:
            pass
        try:
            if self._resource_manager:
                self._resource_manager.close()
                self._resource_manager = None
        except Exception:
            pass

    def trigger(self, callback=None):
        """
        Trigger a query. Runs in thread pool.
        Optional callback(value, error) called in main thread when done.
        """
        if self._busy:
            return  # Prevent overlapping triggers
        self._busy = True

        def _do_query():
            try:
                self._ensure_connection()
                cmd = self.command_config["send"]
                timeout = self.command_config.get("timeout_ms", 5000)
                self._instrument.timeout = timeout

                response = self._instrument.query(cmd)

                parse_type = self.command_config.get("parse_type", "string")
                if parse_type == "float":
                    value = float(response.strip())
                elif parse_type == "int":
                    value = int(response.strip())
                elif parse_type == "string":
                    value = response.strip()
                else:
                    value = response

                self.root.after(0, lambda: self._on_success(value, callback))

            except Exception as e:
                self.root.after(0, lambda: self._on_error(e, callback))

        self.get_executor().submit(_do_query)

    def _on_success(self, value, callback):
        """Handle successful query - called in main thread."""
        self._busy = False
        try:
            fmt = self.command_config.get("display_format", "%s")
            unit = self.command_config.get("unit", "")
            try:
                display = fmt % value
                if unit:
                    display = f"{display} {unit}"
            except (TypeError, ValueError):
                display = f"{value} {unit}".strip()
            self.tk_var.set(display)
        except Exception:
            self.tk_var.set(str(value))

        if callback:
            callback(value, None)

    def _on_error(self, error, callback):
        """Handle query error - called in main thread."""
        self._busy = False
        if self.on_error == "nan":
            self.tk_var.set("NaN")
        elif self.on_error == "default":
            self.tk_var.set("---")
        # keep_last: don't change

        # Connection may be dead, close it so next trigger reopens
        self._close_connection()

        if callback:
            callback(None, error)

    def cleanup(self):
        """Close connection and release resources."""
        self._close_connection()


# Usage in generated application:
"""
class Application:
    def __init__(self, root):
        self.root = root
        root.title("Triggered Readout")

        self.lbl_voltage = ttk.Label(root, text="---", width=15)
        self.lbl_voltage.grid(row=0, column=0, padx=5, pady=5)

        self.btn_read = ttk.Button(root, text="Read Voltage",
                                   command=self.on_read_clicked)
        self.btn_read.grid(row=0, column=1, padx=5, pady=5)

        conn_cfg = {
            "resource_string": "GPIB0::22::INSTR",
            "backend": "pyvisa",
            "timeout_ms": 5000,
            "read_termination": "\\n",
            "write_termination": "\\n"
        }
        cmd_cfg = {
            "send": "MEAS:VOLT:DC?\\n",
            "parse_type": "float",
            "display_format": "%.6f",
            "unit": "V",
            "timeout_ms": 5000
        }

        self.voltage_binding = TriggeredInstrumentBinding(
            root=root,
            variable_name="voltage",
            command_config=cmd_cfg,
            connection_config=conn_cfg,
            on_error="keep_last"
        )
        self.lbl_voltage.configure(textvariable=self.voltage_binding.tk_var)

    def on_read_clicked(self):
        self.voltage_binding.trigger()

    def on_close(self):
        self.voltage_binding.cleanup()
        TriggeredInstrumentBinding.shutdown_executor()
        self.root.destroy()
"""
```

#### 1.4.3 Thread Pool & Connection Manager

```python
"""
Global thread pool and connection manager for instrument bindings.
Generated once per application, shared by all instrument bindings.
"""

import threading
from concurrent.futures import ThreadPoolExecutor
import pyvisa


class InstrumentConnectionManager:
    """
    Manages shared VISA resource manager and thread pools.
    Singleton per application to avoid resource leaks.
    """

    _instance = None
    _lock = threading.Lock()

    def __new__(cls):
        if cls._instance is None:
            with cls._lock:
                if cls._instance is None:
                    cls._instance = super().__new__(cls)
                    cls._instance._initialized = False
        return cls._instance

    def __init__(self):
        if self._initialized:
            return
        self._initialized = True

        self._resource_managers = {}  # backend -> ResourceManager
        self._instruments = {}        # instrument_id -> instrument handle
        self._polling_executor = ThreadPoolExecutor(
            max_workers=10,
            thread_name_prefix="InstrumentPoll"
        )
        self._trigger_executor = ThreadPoolExecutor(
            max_workers=5,
            thread_name_prefix="InstrumentTrigger"
        )
        self._lock = threading.RLock()

    def get_resource_manager(self, backend=""):
        """Get or create ResourceManager for given backend."""
        with self._lock:
            if backend not in self._resource_managers:
                rm_args = (backend,) if backend and backend != "pyvisa" else ()
                self._resource_managers[backend] = pyvisa.ResourceManager(*rm_args)
            return self._resource_managers[backend]

    def open_instrument(self, instrument_id, connection_config):
        """Open and cache instrument connection."""
        with self._lock:
            if instrument_id in self._instruments:
                return self._instruments[instrument_id]

            backend = connection_config.get("backend", "")
            rm = self.get_resource_manager(backend)
            inst = rm.open_resource(
                connection_config["resource_string"],
                timeout=connection_config.get("timeout_ms", 5000)
            )
            inst.read_termination = connection_config.get("read_termination", "\\n")
            inst.write_termination = connection_config.get("write_termination", "\\n")
            self._instruments[instrument_id] = inst
            return inst

    def close_instrument(self, instrument_id):
        """Close specific instrument connection."""
        with self._lock:
            if instrument_id in self._instruments:
                try:
                    self._instruments[instrument_id].close()
                except Exception:
                    pass
                del self._instruments[instrument_id]

    def submit_polling(self, fn, *args, **kwargs):
        return self._polling_executor.submit(fn, *args, **kwargs)

    def submit_trigger(self, fn, *args, **kwargs):
        return self._trigger_executor.submit(fn, *args, **kwargs)

    def shutdown(self):
        """Close all connections and shutdown executors."""
        with self._lock:
            for inst in self._instruments.values():
                try:
                    inst.close()
                except Exception:
                    pass
            self._instruments.clear()

            for rm in self._resource_managers.values():
                try:
                    rm.close()
                except Exception:
                    pass
            self._resource_managers.clear()

        self._polling_executor.shutdown(wait=False)
        self._trigger_executor.shutdown(wait=False)
        InstrumentConnectionManager._instance = None
```

#### 1.4.4 Error Handling Wrapper

```python
"""
Decorators and utilities for instrument error handling.
"""

import functools
import time
import logging

logger = logging.getLogger("labgui.instruments")


def instrument_retry(max_retries=3, backoff_factor=1.5, exceptions=(Exception,)):
    """
    Decorator: retry instrument operation with exponential backoff.
    Usage: @instrument_retry(max_retries=3)
    """
    def decorator(fn):
        @functools.wraps(fn)
        def wrapper(*args, **kwargs):
            last_exception = None
            for attempt in range(max_retries):
                try:
                    return fn(*args, **kwargs)
                except exceptions as e:
                    last_exception = e
                    wait = backoff_factor ** attempt
                    logger.warning(f"Attempt {attempt + 1}/{max_retries} failed: {e}. Retrying in {wait:.1f}s...")
                    time.sleep(wait)
            logger.error(f"All {max_retries} attempts failed: {last_exception}")
            raise last_exception
        return wrapper
    return decorator


def safe_instrument_call(default_value=None, log_prefix="Instrument"):
    """
    Decorator: catch all exceptions, log them, return default value.
    Usage: @safe_instrument_call(default_value=float('nan'))
    """
    def decorator(fn):
        @functools.wraps(fn)
        def wrapper(*args, **kwargs):
            try:
                return fn(*args, **kwargs)
            except Exception as e:
                logger.error(f"{log_prefix} error in {fn.__name__}: {e}")
                return default_value
        return wrapper
    return decorator


class ConnectionStateMonitor:
    """
    Monitors instrument connection health.
    Provides visual feedback via a tkinter variable.
    """

    STATES = {
        "connected": {"text": "Connected", "color": "#2ecc71"},      # Green
        "connecting": {"text": "Connecting", "color": "#f39c12"},    # Orange
        "disconnected": {"text": "Disconnected", "color": "#e74c3c"}, # Red
        "error": {"text": "Error", "color": "#9b59b6"},              # Purple
        "unknown": {"text": "Unknown", "color": "#95a5a6"},          # Gray
    }

    def __init__(self, root, variable_name):
        self.root = root
        self.variable_name = variable_name
        self.tk_var_text = tk.StringVar(value="Unknown")
        self.tk_var_color = tk.StringVar(value="#95a5a6")

    def set_state(self, state):
        """Thread-safe state update."""
        def _update():
            info = self.STATES.get(state, self.STATES["unknown"])
            self.tk_var_text.set(info["text"])
            self.tk_var_color.set(info["color"])
        self.root.after(0, _update)

    def bind_to_widget(self, widget):
        """Bind state to a label widget for visual indicator."""
        widget.configure(textvariable=self.tk_var_text, foreground=self.tk_var_color.get())
        # Trace color changes
        def _on_color_change(*args):
            widget.configure(foreground=self.tk_var_color.get())
        self.tk_var_color.trace_add("write", _on_color_change)
```

---

## 2. State Variable System

### 2.1 Typed Variables with Formatting

The state variable system provides a typed, named variable layer on top of tkinter's variable classes. Each state variable has a name, type, default value, and optional formatting string for display.

#### 2.1.1 State Variable Schema

```json
{
  "name": "voltage_ch1",
  "type": "float",
  "default": 0.0,
  "format": "%.4f V",
  "min": -1000.0,
  "max": 1000.0,
  "description": "Channel 1 voltage reading",
  "persistent": false,
  "tags": ["measurement", "channel1"]
}
```

#### 2.1.2 Type System

| Type | tkinter Var | Python Type | Format Specifier | Use Case |
|------|------------|-------------|-----------------|----------|
| `string` | `StringVar` | `str` | `%s` | Labels, status messages, ID strings |
| `int` | `IntVar` | `int` | `%d` | Counters, indices, loop counters, sample counts |
| `float` | `DoubleVar` | `float` | `%.4f` | Voltage, current, temperature, frequency readings |
| `bool` | `BooleanVar` | `bool` | N/A | Running flags, enable states, channel on/off |
| `enum` | `StringVar` | `str` | `%s` | Mode selection: `"DC"`/`"AC"`/`"OHM"` |
| `color` | `StringVar` | `str` | `%s` | Dynamic widget colors (alarm states) |

**Generated Variable Factory:**

```python
import tkinter as tk


class StateVariable:
    """
    Typed state variable with formatting support.
    Wraps tkinter variable classes with additional metadata.
    """

    TYPE_MAP = {
        "string": (tk.StringVar, str, "%s"),
        "int": (tk.IntVar, int, "%d"),
        "float": (tk.DoubleVar, float, "%.4f"),
        "bool": (tk.BooleanVar, bool, None),
        "enum": (tk.StringVar, str, "%s"),
        "color": (tk.StringVar, str, "%s"),
    }

    def __init__(self, root, name, var_type, default=None, format_str=None,
                 min_val=None, max_val=None, description=""):
        self.root = root
        self.name = name
        self.var_type = var_type
        self.min_val = min_val
        self.max_val = max_val
        self.description = description

        var_class, py_type, default_fmt = self.TYPE_MAP[var_type]
        self._py_type = py_type
        self.format_str = format_str or default_fmt

        # Set default
        if default is None:
            default = {"string": "", "int": 0, "float": 0.0,
                      "bool": False, "enum": "", "color": "#000000"}[var_type]

        self._default = default
        self.tk_var = var_class(value=default)

        # Display variable (formatted string for labels)
        self.display_var = tk.StringVar(value=self._format_value(default))

        # Sync display_var when tk_var changes
        self.tk_var.trace_add("write", self._on_value_change)

    def _format_value(self, value):
        """Format value for display."""
        if self.var_type == "bool":
            return "True" if value else "False"
        if self.format_str:
            try:
                return self.format_str % value
            except (TypeError, ValueError):
                return str(value)
        return str(value)

    def _on_value_change(self, *args):
        """Update display variable when value changes."""
        try:
            value = self.get()
            self.display_var.set(self._format_value(value))
        except Exception:
            pass

    def get(self):
        """Get value as Python type."""
        return self._py_type(self.tk_var.get())

    def set(self, value):
        """Set value with type conversion and clamping."""
        try:
            converted = self._py_type(value)
            if self.min_val is not None:
                converted = max(self.min_val, converted)
            if self.max_val is not None:
                converted = min(self.max_val, converted)
            self.tk_var.set(converted)
        except (TypeError, ValueError):
            pass  # Invalid value, ignore

    def reset(self):
        """Reset to default value."""
        self.set(self._default)

    def get_display(self):
        """Get formatted display string."""
        return self.display_var.get()


class StateVariableRegistry:
    """Central registry for all state variables in an application."""

    def __init__(self, root):
        self.root = root
        self._variables = {}  # name -> StateVariable

    def create(self, name, var_type, default=None, format_str=None,
               min_val=None, max_val=None, description=""):
        """Create and register a new state variable."""
        if name in self._variables:
            raise ValueError(f"Variable '{name}' already exists")
        sv = StateVariable(self.root, name, var_type, default, format_str,
                          min_val, max_val, description)
        self._variables[name] = sv
        return sv

    def get(self, name):
        """Get state variable by name."""
        return self._variables.get(name)

    def get_value(self, name):
        """Get current value of a state variable."""
        sv = self._variables.get(name)
        return sv.get() if sv else None

    def set_value(self, name, value):
        """Set value of a state variable."""
        sv = self._variables.get(name)
        if sv:
            sv.set(value)

    def list_all(self):
        """Return list of all variable metadata."""
        return [
            {
                "name": name,
                "type": sv.var_type,
                "value": sv.get(),
                "default": sv._default,
                "format": sv.format_str,
                "description": sv.description,
            }
            for name, sv in self._variables.items()
        ]

    def reset_all(self):
        """Reset all variables to defaults."""
        for sv in self._variables.values():
            sv.reset()

    def export_config(self):
        """Export variable definitions for persistence."""
        return [
            {
                "name": name,
                "type": sv.var_type,
                "default": sv._default,
                "format": sv.format_str,
                "min": sv.min_val,
                "max": sv.max_val,
                "description": sv.description,
            }
            for name, sv in self._variables.items()
        ]

    def import_config(self, configs):
        """Import variable definitions."""
        for cfg in configs:
            if cfg["name"] not in self._variables:
                self.create(**cfg)
```

#### 2.1.3 Format String Reference

| Format | Type | Example Output | Description |
|--------|------|---------------|-------------|
| `%s` | string | `"Keysight 34401A"` | Plain string |
| `%d` | int | `42` | Integer |
| `%x` | int | `2a` | Hexadecimal |
| `%X` | int | `2A` | Uppercase hex |
| `%.2f` | float | `3.14` | 2 decimal places |
| `%.4f` | float | `3.1416` | 4 decimal places |
| `%.6f` | float | `3.141593` | 6 decimal places |
| `%.2e` | float | `3.14e+00` | Scientific notation |
| `%g` | float | `3.14159` | Auto fixed/scientific |
| `%.3f V` | float | `1.234 V` | With unit suffix |
| `%.2f °C` | float | `25.50 °C` | Temperature with unit |
| `%d samples` | int | `1024 samples` | Count with label |
| `0x%02X` | int | `0x3F` | Hex with prefix |

---

### 2.2 Widget Property Bindings

State variables connect to widget properties through a declarative binding system. Bindings are defined in the designer and generated as Python code.

#### 2.2.1 Binding Types

| Widget | Property | Binding Direction | Description |
|--------|----------|------------------|-------------|
| `Label` | `text` | One-way (var→widget) | Display formatted value |
| `Label` | `foreground` | One-way (var→widget) | Alarm color based on value |
| `Entry` | `text` | Two-way | Edit value, updates variable |
| `Button` | `state` | One-way (var→widget) | Enable/disable based on condition |
| `Scale` | `value` | Two-way | Slider position ↔ variable |
| `Checkbutton` | `checked` | Two-way | Checkbox ↔ boolean variable |
| `Progressbar` | `value` | One-way (var→widget) | Progress from numeric variable |
| `OptionMenu` | `selection` | Two-way | Dropdown ↔ enum variable |
| `Canvas` | `drawing` | One-way (var→widget) | Draw waveform from array |
| `Text` | `content` | Two-way | Log/output display |

#### 2.2.2 Binding IR (Internal Representation)

```json
{
  "bindings": [
    {
      "variable": "voltage_ch1",
      "widget": "lbl_voltage",
      "property": "text",
      "direction": "one_way",
      "transform": null,
      "format": "%.4f V"
    },
    {
      "variable": "voltage_ch1",
      "widget": "lbl_voltage",
      "property": "foreground",
      "direction": "one_way",
      "transform": {
        "type": "threshold_color",
        "rules": [
          {"condition": "value > 10.0", "color": "#e74c3c"},
          {"condition": "value > 5.0", "color": "#f39c12"},
          {"condition": "default", "color": "#2ecc71"}
        ]
      }
    },
    {
      "variable": "running",
      "widget": "btn_start",
      "property": "state",
      "direction": "one_way",
      "transform": {
        "type": "invert_boolean",
        "true_value": "disabled",
        "false_value": "normal"
      }
    },
    {
      "variable": "setpoint_temp",
      "widget": "ent_setpoint",
      "property": "text",
      "direction": "two_way",
      "transform": {
        "type": "float_string",
        "format": "%.1f"
      }
    }
  ]
}
```

#### 2.2.3 Generated Binding Code

```python
"""
Generated widget-property bindings.
Each binding connects a state variable to a widget property.
"""

import tkinter as tk
from tkinter import ttk


class WidgetBinding:
    """Base class for variable-to-widget bindings."""

    def __init__(self, state_var, widget, property_name, transform=None):
        self.state_var = state_var
        self.widget = widget
        self.property_name = property_name
        self.transform = transform
        self._trace_id = None
        self._updating = False  # Prevent circular updates

    def apply(self):
        """Apply binding - override in subclasses."""
        raise NotImplementedError

    def unbind(self):
        """Remove binding."""
        if self._trace_id:
            self.state_var.tk_var.trace_remove("write", self._trace_id)
            self._trace_id = None


class OneWayBinding(WidgetBinding):
    """One-way binding: variable changes update widget."""

    def apply(self):
        def _update(*args):
            if self._updating:
                return
            self._updating = True
            try:
                value = self.state_var.get()
                if self.transform:
                    value = self._apply_transform(value)
                self._set_widget_property(value)
            finally:
                self._updating = False

        self._trace_id = self.state_var.tk_var.trace_add("write", _update)
        # Initial update
        _update()

    def _set_widget_property(self, value):
        """Set the widget property."""
        if self.property_name == "text":
            self.widget.configure(text=value)
        elif self.property_name == "foreground":
            self.widget.configure(foreground=value)
        elif self.property_name == "background":
            self.widget.configure(background=value)
        elif self.property_name == "state":
            self.widget.configure(state=value)

    def _apply_transform(self, value):
        """Apply transform to value."""
        t = self.transform
        t_type = t.get("type")

        if t_type == "threshold_color":
            for rule in t["rules"]:
                if rule["condition"] == "default":
                    continue
                if eval(rule["condition"], {"value": value, "math": __import__("math")}):
                    return rule["color"]
            # Default rule
            for rule in t["rules"]:
                if rule["condition"] == "default":
                    return rule["color"]
            return "#000000"

        elif t_type == "invert_boolean":
            return t["true_value"] if not value else t["false_value"]

        elif t_type == "format":
            return t["format"] % value

        elif t_type == "map":
            return t["mapping"].get(str(value), value)

        return value


class TwoWayBinding(WidgetBinding):
    """Two-way binding: variable ↔ widget stay synchronized."""

    def apply(self):
        # Variable → Widget
        def _var_to_widget(*args):
            if self._updating:
                return
            self._updating = True
            try:
                value = self.state_var.get()
                widget_value = self._get_widget_property()
                formatted = self.state_var._format_value(value)
                if str(widget_value) != str(formatted):
                    self._set_widget_property(formatted)
            finally:
                self._updating = False

        # Widget → Variable (for Entry widgets)
        def _widget_to_var(*args):
            if self._updating:
                return
            self._updating = True
            try:
                widget_value = self._get_widget_property()
                try:
                    if self.state_var.var_type == "float":
                        parsed = float(widget_value)
                    elif self.state_var.var_type == "int":
                        parsed = int(widget_value)
                    else:
                        parsed = widget_value
                    self.state_var.set(parsed)
                except (ValueError, TypeError):
                    pass  # Invalid input, don't update
            finally:
                self._updating = False

        self._trace_id = self.state_var.tk_var.trace_add("write", _var_to_widget)

        # Bind widget events
        if isinstance(self.widget, tk.Entry) or isinstance(self.widget, ttk.Entry):
            self.widget.bind("<FocusOut>", _widget_to_var)
            self.widget.bind("<Return>", _widget_to_var)
        elif isinstance(self.widget, tk.Scale):
            self.widget.configure(command=lambda v: self.state_var.set(float(v)))

        # Initial sync
        _var_to_widget()

    def _get_widget_property(self):
        if self.property_name == "text":
            return self.widget.get()
        elif self.property_name == "value":
            return self.widget.get()
        return None

    def _set_widget_property(self, value):
        if self.property_name == "text":
            self.widget.delete(0, tk.END)
            self.widget.insert(0, str(value))


# Convenience factory
def create_binding(state_var, widget, property_name, direction="one_way", transform=None):
    """Factory function for creating bindings."""
    if direction == "one_way":
        binding = OneWayBinding(state_var, widget, property_name, transform)
    else:
        binding = TwoWayBinding(state_var, widget, property_name, transform)
    binding.apply()
    return binding
```

---

### 2.3 State Inspector Panel UI

The State Inspector is a panel in the designer that shows all state variables and their bindings.

```
+-----------------------------------------------+
|  State Inspector                    [+ Add]   |
+-----------------------------------------------+
|                                               |
|  Name          Type    Value    Default       |
|  +-----------------------------------------+  |
|  | voltage_ch1  float   1.2345   0.0000   |  |
|  | current_ch1  float   0.0521   0.0000   |  |
|  | running      bool    [x]      [ ]       |  |
|  | mode         enum    "DC"     "DC"       |  |
|  | sample_count int     1024     0          |  |
|  +-----------------------------------------+  |
|                                               |
|  [Edit]  [Delete]  [Duplicate]  [Reset All]   |
|                                               |
|  Variable Editor:                             |
|  Name:        [voltage_ch1___________]        |
|  Type:        [float                v]        |
|  Default:     [0.0000               ]         |
|  Format:      [%.4f V               ]         |
|  Min:         [-1000.0              ]         |
|  Max:         [1000.0               ]         |
|  Description: [Channel 1 voltage    ]         |
|                                               |
|  Bindings for 'voltage_ch1':                  |
|  +-----------------------------------------+  |
|  | lbl_voltage.text    (one-way)    [X]   |  |
|  | lbl_voltage.fg      (one-way)    [X]   |  |
|  | logger.source       (read)       [X]   |  |
|  +-----------------------------------------+  |
|                                               |
|  [Import...]  [Export...]                     |
+-----------------------------------------------+
```

#### 2.3.1 Import/Export Format

```json
{
  "version": "1.0",
  "description": "State variable set for 4-channel DMM readout",
  "tags": ["multimeter", "4-channel"],
  "variables": [
    {
      "name": "voltage_ch1",
      "type": "float",
      "default": 0.0,
      "format": "%.6f V",
      "min": -1000.0,
      "max": 1000.0,
      "description": "Channel 1 DC voltage"
    },
    {
      "name": "voltage_ch2",
      "type": "float",
      "default": 0.0,
      "format": "%.6f V",
      "min": -1000.0,
      "max": 1000.0,
      "description": "Channel 2 DC voltage"
    },
    {
      "name": "running",
      "type": "bool",
      "default": false,
      "description": "Acquisition running flag"
    }
  ]
}
```

#### 2.3.2 Drag-and-Drop Binding Flow

```
1. User drags state variable from inspector panel
2. Drops onto widget on canvas
3. Dialog appears: "Bind 'voltage_ch1' to Label?"
4. User selects property: text / foreground / etc.
5. For text: auto-suggests format from variable definition
6. For foreground: offers threshold color picker
7. Binding created, visual indicator shows connection line
8. Generated code includes binding setup
```

---

## 3. Data Logging System

### 3.1 Logger Configuration

The data logging system captures state variable values to files at configurable intervals.

#### 3.1.1 Logger Configuration Schema

```json
{
  "logger_id": "main_logger",
  "enabled": true,
  "sources": [
    {"variable": "voltage_ch1", "column_name": "Voltage_CH1_V", "format": "%.6f"},
    {"variable": "current_ch1", "column_name": "Current_CH1_A", "format": "%.6f"},
    {"variable": "temperature", "column_name": "Temp_C", "format": "%.2f"},
    {"variable": "running",     "column_name": "Running", "format": "%d"}
  ],
  "output": {
    "format": "csv",
    "file_path": "./logs/data_{timestamp}.csv",
    "timestamp_format": "ISO8601",
    "include_header": true,
    "delimiter": ",",
    "decimal_separator": "."
  },
  "timing": {
    "interval_ms": 1000,
    "sync_to_clock": false,
    "jitter_max_ms": 50
  },
  "rotation": {
    "enabled": true,
    "max_file_size_mb": 10,
    "max_file_age_hours": 24,
    "max_file_count": 100,
    "on_rotation": "new_file"
  },
  "buffering": {
    "enabled": true,
    "flush_interval_s": 5,
    "max_buffer_rows": 100
  }
}
```

**Timestamp Format Options:**

| Format | Example | Use Case |
|--------|---------|----------|
| `ISO8601` | `2024-01-15T09:30:45.123` | Standard, human-readable |
| `ISO8601_UTC` | `2024-01-15T14:30:45.123Z` | Cross-timezone logging |
| `Unix_ms` | `1705314645123` | Compact, sortable |
| `Elapsed_ms` | `15000` | Relative timing, restart-proof |
| `Custom` | User-defined strftime | Specific formatting needs |

#### 3.1.2 File Path Placeholders

| Placeholder | Example | Description |
|-------------|---------|-------------|
| `{timestamp}` | `20240115_093045` | Current date-time |
| `{date}` | `20240115` | Date only |
| `{time}` | `093045` | Time only |
| `{counter}` | `001` | Auto-incrementing counter |
| `{logger_id}` | `main_logger` | Logger identifier |
| `{project}` | `dmm_readout` | Project name |

---

### 3.2 Generated Logging Code

```python
"""
Generated by LabGUI Builder - Data Logging System
Logger: main_logger
Sources: voltage_ch1, current_ch1, temperature, running
Interval: 1000ms
Format: CSV with file rotation
"""

import csv
import os
import time
import threading
import datetime
from pathlib import Path


class DataLogger:
    """
    Thread-safe data logger with file rotation.
    Runs in a daemon thread, marshals data from state variables.
    """

    def __init__(self, root, state_registry, config):
        self.root = root
        self.state_registry = state_registry
        self.config = config

        self._running = False
        self._thread = None
        self._writer = None
        self._file = None
        self._file_path = None
        self._file_size = 0
        self._row_count = 0
        self._start_time = None
        self._buffer = []
        self._buffer_lock = threading.Lock()

        # Parse configuration
        self.sources = config["sources"]
        self.interval_ms = config["timing"]["interval_ms"]
        self.output_format = config["output"]["format"]
        self.file_path_template = config["output"]["file_path"]
        self.timestamp_format = config["output"]["timestamp_format"]
        self.delimiter = config["output"].get("delimiter", ",")
        self.include_header = config["output"].get("include_header", True)
        self.max_file_size = config["rotation"]["max_file_size_mb"] * 1024 * 1024
        self.max_file_age_hours = config["rotation"]["max_file_age_hours"]
        self.buffering = config["buffering"]["enabled"]
        self.flush_interval_s = config["buffering"]["flush_interval_s"]
        self.max_buffer_rows = config["buffering"]["max_buffer_rows"]

    def start(self):
        """Start the logging thread."""
        if self._running:
            return
        self._running = True
        self._start_time = time.time()
        self._open_file()
        self._thread = threading.Thread(
            target=self._logger_loop,
            name=f"Logger-{self.config['logger_id']}",
            daemon=True
        )
        self._thread.start()

    def stop(self):
        """Stop logging and flush remaining data."""
        self._running = False
        if self._thread:
            self._thread.join(timeout=self.interval_ms / 1000.0 + 2.0)
        self._flush_buffer(force=True)
        self._close_file()

    def _get_timestamp(self):
        """Generate timestamp string based on configuration."""
        now = datetime.datetime.now()
        if self.timestamp_format == "ISO8601":
            return now.isoformat(timespec='milliseconds')
        elif self.timestamp_format == "ISO8601_UTC":
            return datetime.datetime.now(datetime.timezone.utc).isoformat(timespec='milliseconds').replace('+00:00', 'Z')
        elif self.timestamp_format == "Unix_ms":
            return str(int(now.timestamp() * 1000))
        elif self.timestamp_format == "Elapsed_ms":
            elapsed = int((time.time() - self._start_time) * 1000)
            return str(elapsed)
        else:
            return now.strftime(self.timestamp_format)

    def _resolve_file_path(self):
        """Resolve file path with placeholders."""
        now = datetime.datetime.now()
        path = self.file_path_template
        path = path.replace("{timestamp}", now.strftime("%Y%m%d_%H%M%S"))
        path = path.replace("{date}", now.strftime("%Y%m%d"))
        path = path.replace("{time}", now.strftime("%H%M%S"))
        path = path.replace("{logger_id}", self.config["logger_id"])
        path = path.replace("{project}", "project")  # From project config
        return path

    def _open_file(self):
        """Open new log file and write header."""
        self._file_path = self._resolve_file_path()

        # Create directory if needed
        dir_path = os.path.dirname(self._file_path)
        if dir_path:
            os.makedirs(dir_path, exist_ok=True)

        self._file = open(self._file_path, 'w', newline='')
        self._writer = csv.writer(self._file, delimiter=self.delimiter)
        self._file_size = 0
        self._row_count = 0

        if self.include_header:
            header = ["timestamp"]
            for src in self.sources:
                header.append(src.get("column_name", src["variable"]))
            self._writer.writerow(header)
            self._file_size += self._file.tell()

    def _close_file(self):
        """Close current log file."""
        if self._file:
            self._file.flush()
            self._file.close()
            self._file = None
            self._writer = None

    def _should_rotate(self):
        """Check if file rotation is needed."""
        if self._file_size >= self.max_file_size:
            return True
        if self.max_file_age_hours > 0 and self._start_time:
            elapsed_hours = (time.time() - self._start_time) / 3600
            if elapsed_hours >= self.max_file_age_hours:
                return True
        return False

    def _rotate_file(self):
        """Close current file and open a new one."""
        self._close_file()
        self._open_file()

    def _collect_row(self):
        """Collect a data row from state variables."""
        timestamp = self._get_timestamp()
        row = [timestamp]
        for src in self.sources:
            sv = self.state_registry.get(src["variable"])
            if sv:
                value = sv.get()
                fmt = src.get("format")
                if fmt and isinstance(value, (int, float)):
                    row.append(fmt % value)
                else:
                    row.append(value)
            else:
                row.append("")
        return row

    def _flush_buffer(self, force=False):
        """Write buffered rows to file."""
        with self._buffer_lock:
            if not self._buffer:
                return
            rows_to_write = self._buffer[:]
            if not force and len(rows_to_write) < self.max_buffer_rows:
                return
            self._buffer = []

        for row in rows_to_write:
            self._writer.writerow(row)
            self._row_count += 1

        self._file.flush()
        self._file_size = self._file.tell()

    def _write_row(self, row):
        """Write a single row (buffered or direct)."""
        if self.buffering:
            with self._buffer_lock:
                self._buffer.append(row)
            self._flush_buffer()
        else:
            self._writer.writerow(row)
            self._row_count += 1
            self._file.flush()
            self._file_size = self._file.tell()

    def _logger_loop(self):
        """Main logging loop - runs in daemon thread."""
        last_flush = time.time()

        while self._running:
            try:
                # Check rotation
                if self._should_rotate():
                    self._rotate_file()

                # Collect and write data
                row = self._collect_row()
                self._write_row(row)

                # Periodic flush for buffered mode
                if self.buffering:
                    now = time.time()
                    if now - last_flush >= self.flush_interval_s:
                        self._flush_buffer(force=True)
                        last_flush = now

            except Exception as e:
                self._log_error(f"Logger error: {e}")

            # Sleep until next interval
            time.sleep(self.interval_ms / 1000.0)

    def _log_error(self, message):
        """Log error to console."""
        import logging
        logging.getLogger("labgui.logger").error(message)

    def get_status(self):
        """Return current logger status."""
        return {
            "running": self._running,
            "file_path": self._file_path,
            "file_size": self._file_size,
            "row_count": self._row_count,
            "buffered_rows": len(self._buffer),
            "uptime_s": time.time() - self._start_time if self._start_time else 0
        }


# Usage in generated application:
"""
# In Application.__init__:
logger_config = {
    "logger_id": "main_logger",
    "enabled": True,
    "sources": [
        {"variable": "voltage_ch1", "column_name": "Voltage_CH1_V", "format": "%.6f"},
        {"variable": "current_ch1", "column_name": "Current_CH1_A", "format": "%.6f"},
        {"variable": "temperature", "column_name": "Temp_C", "format": "%.2f"}
    ],
    "output": {
        "format": "csv",
        "file_path": "./logs/data_{timestamp}.csv",
        "timestamp_format": "ISO8601",
        "include_header": True,
        "delimiter": ","
    },
    "timing": {
        "interval_ms": 1000
    },
    "rotation": {
        "enabled": True,
        "max_file_size_mb": 10
    },
    "buffering": {
        "enabled": True,
        "flush_interval_s": 5,
        "max_buffer_rows": 50
    }
}

self.data_logger = DataLogger(root, self.state_registry, logger_config)

# Start/stop via button:
def toggle_logging(self):
    if self.var_running.get():
        self.data_logger.start()
    else:
        self.data_logger.stop()
"""
```

---

### 3.3 File Rotation Implementation

```python
"""
File rotation strategies for the data logger.
"""

import os
import glob
import shutil
from datetime import datetime, timedelta


class FileRotationStrategy:
    """Base class for file rotation strategies."""

    def should_rotate(self, logger):
        raise NotImplementedError

    def rotate(self, logger):
        raise NotImplementedError


class SizeBasedRotation(FileRotationStrategy):
    """Rotate when file exceeds max size."""

    def __init__(self, max_size_bytes):
        self.max_size_bytes = max_size_bytes

    def should_rotate(self, logger):
        return logger._file_size >= self.max_size_bytes

    def rotate(self, logger):
        logger._close_file()
        logger._open_file()


class TimeBasedRotation(FileRotationStrategy):
    """Rotate at fixed time intervals."""

    def __init__(self, interval_hours=1):
        self.interval_hours = interval_hours

    def should_rotate(self, logger):
        if not logger._start_time:
            return False
        elapsed = (time.time() - logger._start_time) / 3600
        return elapsed >= self.interval_hours

    def rotate(self, logger):
        logger._close_file()
        logger._start_time = time.time()
        logger._open_file()


class CountBasedCleanup:
    """Keep only N most recent log files."""

    def __init__(self, max_files=100, pattern="./logs/data_*.csv"):
        self.max_files = max_files
        self.pattern = pattern

    def cleanup(self):
        files = glob.glob(self.pattern)
        if len(files) <= self.max_files:
            return
        # Sort by modification time, oldest first
        files.sort(key=os.path.getmtime)
        to_delete = files[:-self.max_files]
        for f in to_delete:
            try:
                os.remove(f)
            except OSError:
                pass
```

---

## 4. Alarm System

### 4.1 Alarm Condition Types

Alarms monitor state variables and trigger actions when conditions are met.

#### 4.1.1 Condition Definitions

```json
{
  "alarm_id": "high_temperature",
  "name": "High Temperature Alarm",
  "enabled": true,
  "source": "temperature",
  "condition": {
    "type": "gt",
    "threshold": 80.0
  },
  "hysteresis": {
    "enabled": true,
    "reset_threshold": 75.0
  },
  "actions": [
    {"type": "visual", "widget": "lbl_temp", "flash_color": "#e74c3c"},
    {"type": "log", "message": "Temperature exceeded 80°C: {value}"},
    {"type": "script", "code": "self.send_email_alert('High temp alarm')"}
  ],
  "check_interval_ms": 500,
  "cooldown_ms": 5000
}
```

**Condition Types:**

| Type | Parameters | Description | Example |
|------|-----------|-------------|---------|
| `gt` | `threshold` | value > threshold | `{"type": "gt", "threshold": 80.0}` |
| `lt` | `threshold` | value < threshold | `{"type": "lt", "threshold": 0.0}` |
| `gte` | `threshold` | value >= threshold | `{"type": "gte", "threshold": 100.0}` |
| `lte` | `threshold` | value <= threshold | `{"type": "lte", "threshold": 5.0}` |
| `eq` | `value` | value == target | `{"type": "eq", "value": 0}` |
| `neq` | `value` | value != target | `{"type": "neq", "value": -1}` |
| `in_range` | `min`, `max` | min <= value <= max | `{"type": "in_range", "min": 18.0, "max": 25.0}` |
| `out_of_range` | `min`, `max` | value < min or value > max | `{"type": "out_of_range", "min": 10.0, "max": 50.0}` |
| `rate_of_change` | `max_rate`, `window_s` | abs(delta) / window > max_rate | `{"type": "rate_of_change", "max_rate": 5.0, "window_s": 60.0}` |
| `stale_data` | `timeout_s` | No update for N seconds | `{"type": "stale_data", "timeout_s": 10.0}` |
| `deviation` | `reference`, `max_dev` | abs(value - reference) > max_dev | `{"type": "deviation", "reference_var": "setpoint", "max_deviation": 0.5}` |

---

### 4.2 Alarm Actions

#### 4.2.1 Action Types

| Type | Parameters | Description |
|------|-----------|-------------|
| `visual` | `widget`, `flash_color`, `duration_ms` | Flash widget color |
| `log` | `message`, `level` | Write to log file/console |
| `script` | `code` | Execute custom Python code |
| `sound` | `frequency`, `duration_ms` | Play beep (platform-dependent) |
| `popup` | `title`, `message` | Show message dialog |
| `set_variable` | `variable`, `value` | Set another state variable |
| `stop_binding` | `binding_id` | Stop an instrument binding |

#### 4.2.2 Hysteresis Configuration

```json
{
  "hysteresis": {
    "enabled": true,
    "reset_threshold": 75.0,
    "description": "Trigger at >80°C, reset at <75°C"
  }
}
```

Prevents alarm flapping when the value oscillates around the threshold.

---

### 4.3 Generated Alarm Code

```python
"""
Generated by LabGUI Builder - Alarm System
Alarm: high_temperature
Condition: temperature > 80.0
Hysteresis: reset at 75.0
"""

import tkinter as tk
import threading
import time
import logging

logger = logging.getLogger("labgui.alarms")


class AlarmCondition:
    """Evaluates a condition against a value."""

    def __init__(self, config):
        self.type = config["type"]
        self.config = config

    def evaluate(self, value):
        """Return True if condition is met."""
        if value is None:
            return False
        t = self.type
        c = self.config

        if t == "gt":
            return value > c["threshold"]
        elif t == "lt":
            return value < c["threshold"]
        elif t == "gte":
            return value >= c["threshold"]
        elif t == "lte":
            return value <= c["threshold"]
        elif t == "eq":
            return value == c["value"]
        elif t == "neq":
            return value != c["value"]
        elif t == "in_range":
            return c["min"] <= value <= c["max"]
        elif t == "out_of_range":
            return value < c["min"] or value > c["max"]
        elif t == "rate_of_change":
            # Requires historical data - handled by AlarmMonitor
            pass
        elif t == "stale_data":
            # Requires timestamp tracking - handled by AlarmMonitor
            pass
        return False


class AlarmMonitor:
    """
    Monitors a state variable and triggers actions when condition is met.
    Supports hysteresis to prevent alarm flapping.
    """

    def __init__(self, root, state_registry, alarm_config):
        self.root = root
        self.state_registry = state_registry
        self.config = alarm_config

        self.alarm_id = alarm_config["alarm_id"]
        self.source_var = alarm_config["source"]
        self.condition = AlarmCondition(alarm_config["condition"])
        self.actions = alarm_config.get("actions", [])
        self.check_interval_ms = alarm_config.get("check_interval_ms", 500)
        self.cooldown_ms = alarm_config.get("cooldown_ms", 5000)

        # Hysteresis
        hyst = alarm_config.get("hysteresis", {})
        self.hysteresis_enabled = hyst.get("enabled", False)
        self.hysteresis_reset = hyst.get("reset_threshold")

        # Internal state
        self._active = False
        self._running = False
        self._thread = None
        self._last_trigger_time = 0
        self._last_value = None
        self._value_history = []  # For rate_of_change

    def start(self):
        """Start alarm monitoring thread."""
        if self._running:
            return
        self._running = True
        self._thread = threading.Thread(
            target=self._alarm_loop,
            name=f"Alarm-{self.alarm_id}",
            daemon=True
        )
        self._thread.start()

    def stop(self):
        """Stop alarm monitoring."""
        self._running = False
        if self._thread:
            self._thread.join(timeout=self.check_interval_ms / 1000.0 + 1.0)

    def _check_cooldown(self):
        """Check if cooldown period has elapsed."""
        if self.cooldown_ms <= 0:
            return True
        elapsed = (time.time() - self._last_trigger_time) * 1000
        return elapsed >= self.cooldown_ms

    def _should_trigger(self, value):
        """Check if alarm should trigger, considering hysteresis."""
        if self.hysteresis_enabled and self.hysteresis_reset is not None:
            if self._active:
                # Already active, check reset threshold
                if self.config["condition"]["type"] in ("gt", "gte"):
                    return value > self.hysteresis_reset
                elif self.config["condition"]["type"] in ("lt", "lte"):
                    return value < self.hysteresis_reset
                return self.condition.evaluate(value)
            else:
                # Not active, check main threshold
                return self.condition.evaluate(value)
        else:
            return self.condition.evaluate(value)

    def _should_reset(self, value):
        """Check if alarm should reset, considering hysteresis."""
        if not self.hysteresis_enabled or self.hysteresis_reset is None:
            return not self.condition.evaluate(value)

        c_type = self.config["condition"]["type"]
        if c_type in ("gt", "gte"):
            return value < self.hysteresis_reset
        elif c_type in ("lt", "lte"):
            return value > self.hysteresis_reset
        return not self.condition.evaluate(value)

    def _trigger_actions(self, value):
        """Execute all configured actions."""
        self._last_trigger_time = time.time()
        for action in self.actions:
            try:
                self._execute_action(action, value)
            except Exception as e:
                logger.error(f"Alarm action failed: {e}")

    def _execute_action(self, action, value):
        """Execute a single action."""
        a_type = action["type"]

        if a_type == "visual":
            self.root.after(0, lambda: self._action_visual(action, value))
        elif a_type == "log":
            msg = action.get("message", f"Alarm {self.alarm_id}: {value}").format(value=value)
            level = action.get("level", "warning")
            getattr(logger, level)(msg)
        elif a_type == "script":
            code = action.get("code", "")
            exec(code, {"self": self, "value": value, "root": self.root})
        elif a_type == "popup":
            title = action.get("title", "Alarm")
            msg = action.get("message", f"{self.alarm_id}: {value}").format(value=value)
            self.root.after(0, lambda: self._show_popup(title, msg))
        elif a_type == "set_variable":
            var_name = action["variable"]
            var_value = action["value"]
            self.state_registry.set_value(var_name, var_value)
        elif a_type == "sound":
            freq = action.get("frequency", 1000)
            dur = action.get("duration_ms", 200)
            self.root.after(0, lambda: self._play_beep(freq, dur))

    def _action_visual(self, action, value):
        """Visual alarm action - flash widget."""
        widget_name = action.get("widget")
        flash_color = action.get("flash_color", "#e74c3c")
        original_color = None

        # Find widget (stored reference)
        widget = self._get_widget_by_name(widget_name)
        if widget:
            try:
                original_color = widget.cget("foreground")
                widget.configure(foreground=flash_color)
                # Flash pattern: 3 quick flashes
                for i in range(1, 6):
                    color = flash_color if i % 2 == 1 else original_color
                    self.root.after(i * 200, lambda c=color, w=widget: w.configure(foreground=c))
                # Return to alarm color after flashing
                self.root.after(1200, lambda: widget.configure(foreground=flash_color))
            except tk.TclError:
                pass

    def _show_popup(self, title, message):
        """Show alarm popup dialog."""
        import tkinter.messagebox as mb
        mb.showwarning(title, message)

    def _play_beep(self, frequency, duration_ms):
        """Play system beep (Windows) or terminal bell."""
        import platform
        if platform.system() == "Windows":
            import winsound
            winsound.Beep(frequency, duration_ms)
        else:
            print("\\a")  # Terminal bell

    def _get_widget_by_name(self, name):
        """Get widget reference by name."""
        # Widgets are stored in the application namespace
        app = self.root._app_ref if hasattr(self.root, '_app_ref') else None
        if app:
            return getattr(app, name, None)
        return None

    def _alarm_loop(self):
        """Main alarm checking loop."""
        while self._running:
            try:
                # Get current value
                sv = self.state_registry.get(self.source_var)
                if sv:
                    value = sv.get()
                    self._last_value = value

                    # Check for trigger
                    if not self._active and self._should_trigger(value):
                        if self._check_cooldown():
                            self._active = True
                            self._trigger_actions(value)

                    # Check for reset
                    elif self._active and self._should_reset(value):
                        self._active = False
                        # Execute reset actions (restore visual state)
                        for action in self.actions:
                            if action["type"] == "visual":
                                self.root.after(0, lambda a=action: self._reset_visual(a))

            except Exception as e:
                logger.error(f"Alarm loop error: {e}")

            time.sleep(self.check_interval_ms / 1000.0)

    def _reset_visual(self, action):
        """Reset visual alarm state."""
        widget = self._get_widget_by_name(action.get("widget"))
        if widget:
            try:
                widget.configure(foreground="")  # Reset to default
            except tk.TclError:
                pass


# Rate-of-change alarm specialization
class RateOfChangeAlarm(AlarmMonitor):
    """Alarm that triggers on rate of change, not absolute value."""

    def __init__(self, root, state_registry, alarm_config):
        super().__init__(root, state_registry, alarm_config)
        self.window_s = alarm_config["condition"].get("window_s", 60.0)
        self.max_rate = alarm_config["condition"].get("max_rate", 1.0)

    def _should_trigger(self, value):
        now = time.time()
        self._value_history.append((now, value))

        # Remove old entries outside window
        cutoff = now - self.window_s
        self._value_history = [(t, v) for t, v in self._value_history if t >= cutoff]

        if len(self._value_history) < 2:
            return False

        # Calculate rate
        first_val = self._value_history[0][1]
        last_val = self._value_history[-1][1]
        time_span = self._value_history[-1][0] - self._value_history[0][0]

        if time_span <= 0:
            return False

        rate = abs(last_val - first_val) / time_span
        return rate > self.max_rate


# Stale data alarm specialization
class StaleDataAlarm(AlarmMonitor):
    """Alarm that triggers when no data updates are received."""

    def __init__(self, root, state_registry, alarm_config):
        super().__init__(root, state_registry, alarm_config)
        self.timeout_s = alarm_config["condition"].get("timeout_s", 10.0)
        self._last_update_time = time.time()

        # Monitor the source variable for updates
        sv = state_registry.get(self.source_var)
        if sv:
            sv.tk_var.trace_add("write", self._on_value_update)

    def _on_value_update(self, *args):
        self._last_update_time = time.time()

    def _should_trigger(self, value):
        elapsed = time.time() - self._last_update_time
        return elapsed > self.timeout_s


# Usage in generated application:
"""
# Create and configure alarm
alarm_config = {
    "alarm_id": "high_temperature",
    "name": "High Temperature Alarm",
    "enabled": True,
    "source": "temperature",
    "condition": {"type": "gt", "threshold": 80.0},
    "hysteresis": {"enabled": True, "reset_threshold": 75.0},
    "actions": [
        {"type": "visual", "widget": "lbl_temp", "flash_color": "#e74c3c"},
        {"type": "log", "message": "HIGH TEMP: {value}°C", "level": "warning"}
    ],
    "check_interval_ms": 500,
    "cooldown_ms": 5000
}

self.temp_alarm = AlarmMonitor(root, self.state_registry, alarm_config)
self.temp_alarm.start()
"""
```

---

## 5. Lab Templates

### 5.1 Template Catalog

Templates are pre-built GUI configurations that users can instantiate as starting points. Each template includes complete widget trees, state variable definitions, instrument bindings, and logging configuration.

#### 5.1.1 Template 1: Multimeter Readout

```json
{
  "template_id": "multimeter-readout",
  "name": "Multimeter Readout",
  "description": "Basic digital multimeter readout panel with voltage, current, and resistance displays.",
  "category": "Measurement",
  "tags": ["multimeter", "dmm", "readout", "measurement"],
  "icon": "multimeter",
  "version": "1.0",

  "widgets": [
    {
      "type": "Frame",
      "id": "main_frame",
      "layout": {"row": 0, "column": 0, "padx": 10, "pady": 10},
      "children": [
        {
          "type": "Label",
          "id": "lbl_title",
          "text": "Digital Multimeter",
          "font": {"family": "Arial", "size": 14, "weight": "bold"},
          "layout": {"row": 0, "column": 0, "columnspan": 2, "pady": 5}
        },
        {
          "type": "Label",
          "id": "lbl_v_label",
          "text": "Voltage DC:",
          "font": {"family": "Consolas", "size": 11},
          "layout": {"row": 1, "column": 0, "sticky": "e", "padx": 5}
        },
        {
          "type": "Label",
          "id": "lbl_voltage",
          "text": "---",
          "font": {"family": "Consolas", "size": 16, "weight": "bold"},
          "foreground": "#2c3e50",
          "width": 15,
          "layout": {"row": 1, "column": 1, "padx": 5}
        },
        {
          "type": "Label",
          "id": "lbl_i_label",
          "text": "Current DC:",
          "font": {"family": "Consolas", "size": 11},
          "layout": {"row": 2, "column": 0, "sticky": "e", "padx": 5}
        },
        {
          "type": "Label",
          "id": "lbl_current",
          "text": "---",
          "font": {"family": "Consolas", "size": 16, "weight": "bold"},
          "foreground": "#2c3e50",
          "width": 15,
          "layout": {"row": 2, "column": 1, "padx": 5}
        },
        {
          "type": "Label",
          "id": "lbl_r_label",
          "text": "Resistance:",
          "font": {"family": "Consolas", "size": 11},
          "layout": {"row": 3, "column": 0, "sticky": "e", "padx": 5}
        },
        {
          "type": "Label",
          "id": "lbl_resistance",
          "text": "---",
          "font": {"family": "Consolas", "size": 16, "weight": "bold"},
          "foreground": "#2c3e50",
          "width": 15,
          "layout": {"row": 3, "column": 1, "padx": 5}
        },
        {
          "type": "Frame",
          "id": "btn_frame",
          "layout": {"row": 4, "column": 0, "columnspan": 2, "pady": 10},
          "children": [
            {
              "type": "Button",
              "id": "btn_read",
              "text": "Start Reading",
              "command": "toggle_reading",
              "layout": {"row": 0, "column": 0, "padx": 5}
            },
            {
              "type": "Button",
              "id": "btn_stop",
              "text": "Stop",
              "command": "stop_reading",
              "state": "disabled",
              "layout": {"row": 0, "column": 1, "padx": 5}
            },
            {
              "type": "Button",
              "id": "btn_config",
              "text": "Configure",
              "command": "show_config",
              "layout": {"row": 0, "column": 2, "padx": 5}
            }
          ]
        },
        {
          "type": "Label",
          "id": "lbl_status",
          "text": "Status: Disconnected",
          "font": {"family": "Arial", "size": 9},
          "foreground": "#7f8c8d",
          "layout": {"row": 5, "column": 0, "columnspan": 2}
        }
      ]
    }
  ],

  "state_variables": [
    {"name": "voltage",    "type": "float", "default": 0.0,   "format": "%.6f V"},
    {"name": "current",    "type": "float", "default": 0.0,   "format": "%.6f A"},
    {"name": "resistance", "type": "float", "default": 0.0,   "format": "%.2f Ohm"},
    {"name": "running",    "type": "bool",  "default": false},
    {"name": "connected",  "type": "bool",  "default": false}
  ],

  "bindings": [
    {"variable": "voltage",    "widget": "lbl_voltage",    "property": "text", "direction": "one_way"},
    {"variable": "current",    "widget": "lbl_current",    "property": "text", "direction": "one_way"},
    {"variable": "resistance", "widget": "lbl_resistance", "property": "text", "direction": "one_way"},
    {"variable": "running",    "widget": "btn_read",       "property": "state", "direction": "one_way",
     "transform": {"type": "invert_boolean", "true_value": "disabled", "false_value": "normal"}}
  ],

  "instrument": {
    "name": "DMM-1",
    "protocol": "visa",
    "template_library": "keysight_34401a",
    "connection": {
      "resource_string": "GPIB0::22::INSTR",
      "backend": "pyvisa",
      "timeout_ms": 5000
    },
    "command_bindings": [
      {"command": "read_voltage_dc", "variable": "voltage",    "mode": "polled", "interval_ms": 500},
      {"command": "read_current_dc", "variable": "current",    "mode": "polled", "interval_ms": 500},
      {"command": "read_resistance", "variable": "resistance", "mode": "polled", "interval_ms": 500}
    ]
  },

  "alarms": [
    {
      "alarm_id": "ov_voltage",
      "source": "voltage",
      "condition": {"type": "gt", "threshold": 1000.0},
      "actions": [{"type": "visual", "widget": "lbl_voltage", "flash_color": "#e74c3c"}]
    }
  ]
}
```

#### 5.1.2 Template 2: Serial Monitor

```json
{
  "template_id": "serial-monitor",
  "name": "Serial Monitor",
  "description": "Full-featured serial terminal for RS-232/RS-485 communication.",
  "category": "Communication",
  "tags": ["serial", "terminal", "monitor", "rs232", "debug"],

  "widgets": [
    {
      "type": "Frame",
      "id": "main_frame",
      "layout": {"fill": "both", "expand": true},
      "children": [
        {
          "type": "Frame",
          "id": "toolbar",
          "layout": {"row": 0, "column": 0, "columnspan": 4, "sticky": "ew", "pady": 2},
          "children": [
            {
              "type": "Label", "text": "Port:",
              "layout": {"row": 0, "column": 0}
            },
            {
              "type": "Combobox",
              "id": "cmb_port",
              "values": ["COM1", "COM2", "COM3"],
              "width": 12,
              "layout": {"row": 0, "column": 1, "padx": 2}
            },
            {
              "type": "Label", "text": "Baud:",
              "layout": {"row": 0, "column": 2}
            },
            {
              "type": "Combobox",
              "id": "cmb_baud",
              "values": ["9600", "19200", "38400", "57600", "115200"],
              "width": 10,
              "state": "readonly",
              "layout": {"row": 0, "column": 3, "padx": 2}
            },
            {
              "type": "Button",
              "id": "btn_connect",
              "text": "Connect",
              "command": "toggle_connection",
              "layout": {"row": 0, "column": 4, "padx": 5}
            },
            {
              "type": "Button",
              "id": "btn_clear",
              "text": "Clear",
              "command": "clear_output",
              "layout": {"row": 0, "column": 5, "padx": 2}
            }
          ]
        },
        {
          "type": "Text",
          "id": "txt_output",
          "font": {"family": "Consolas", "size": 10},
          "background": "#1e1e1e",
          "foreground": "#d4d4d4",
          "height": 25,
          "width": 80,
          "state": "disabled",
          "layout": {"row": 1, "column": 0, "columnspan": 4, "pady": 5}
        },
        {
          "type": "Scrollbar",
          "id": "scr_output",
          "orient": "vertical",
          "target": "txt_output",
          "layout": {"row": 1, "column": 4, "sticky": "ns"}
        },
        {
          "type": "Entry",
          "id": "ent_command",
          "font": {"family": "Consolas", "size": 10},
          "width": 70,
          "layout": {"row": 2, "column": 0, "columnspan": 3, "pady": 5}
        },
        {
          "type": "Button",
          "id": "btn_send",
          "text": "Send",
          "command": "send_command",
          "layout": {"row": 2, "column": 3, "padx": 5}
        },
        {
          "type": "Checkbutton",
          "id": "chk_hex",
          "text": "Hex",
          "variable": "hex_mode",
          "layout": {"row": 2, "column": 4}
        }
      ]
    }
  ],

  "state_variables": [
    {"name": "connected",    "type": "bool",   "default": false},
    {"name": "hex_mode",     "type": "bool",   "default": false},
    {"name": "port",         "type": "string", "default": "COM1"},
    {"name": "baudrate",     "type": "int",    "default": 9600, "format": "%d"},
    {"name": "output_text",  "type": "string", "default": ""}
  ],

  "instrument": {
    "protocol": "serial",
    "connection": {
      "port": "{state.port}",
      "baudrate": "{state.baudrate}",
      "bytesize": 8,
      "parity": "N",
      "stopbits": 1,
      "timeout_s": 1
    }
  }
}
```

#### 5.1.3 Template 3: Data Logger Dashboard

```json
{
  "template_id": "data-logger-dashboard",
  "name": "Data Logger Dashboard",
  "description": "Multi-channel data logger with real-time display and file output.",
  "category": "Data Acquisition",
  "tags": ["logger", "acquisition", "csv", "multi-channel"],

  "widgets": [
    {
      "type": "Frame",
      "id": "main",
      "children": [
        {
          "type": "Label",
          "id": "lbl_title",
          "text": "Data Logger Dashboard",
          "font": {"size": 14, "weight": "bold"},
          "layout": {"row": 0, "column": 0, "columnspan": 4, "pady": 5}
        },
        {
          "type": "Frame",
          "id": "channels",
          "layout": {"row": 1, "column": 0, "columnspan": 4},
          "children": [
            {"type": "Label", "text": "CH1:", "layout": {"row": 0, "column": 0}},
            {"type": "Label", "id": "lbl_ch1", "text": "---", "font": {"family": "Consolas", "size": 12}, "width": 12, "layout": {"row": 0, "column": 1}},
            {"type": "Label", "text": "CH2:", "layout": {"row": 0, "column": 2}},
            {"type": "Label", "id": "lbl_ch2", "text": "---", "font": {"family": "Consolas", "size": 12}, "width": 12, "layout": {"row": 0, "column": 3}},
            {"type": "Label", "text": "CH3:", "layout": {"row": 1, "column": 0}},
            {"type": "Label", "id": "lbl_ch3", "text": "---", "font": {"family": "Consolas", "size": 12}, "width": 12, "layout": {"row": 1, "column": 1}},
            {"type": "Label", "text": "CH4:", "layout": {"row": 1, "column": 2}},
            {"type": "Label", "id": "lbl_ch4", "text": "---", "font": {"family": "Consolas", "size": 12}, "width": 12, "layout": {"row": 1, "column": 3}}
          ]
        },
        {
          "type": "Frame",
          "id": "controls",
          "layout": {"row": 2, "column": 0, "columnspan": 4, "pady": 10},
          "children": [
            {
              "type": "Button",
              "id": "btn_start",
              "text": "Start Logging",
              "command": "start_logging",
              "layout": {"row": 0, "column": 0, "padx": 5}
            },
            {
              "type": "Button",
              "id": "btn_stop",
              "text": "Stop Logging",
              "command": "stop_logging",
              "state": "disabled",
              "layout": {"row": 0, "column": 1, "padx": 5}
            },
            {
              "type": "Label",
              "id": "lbl_status",
              "text": "IDLE",
              "foreground": "#7f8c8d",
              "layout": {"row": 0, "column": 2, "padx": 10}
            }
          ]
        },
        {
          "type": "Label",
          "text": "File:",
          "layout": {"row": 3, "column": 0}
        },
        {
          "type": "Entry",
          "id": "ent_file",
          "text": "./logs/data_{timestamp}.csv",
          "width": 40,
          "layout": {"row": 3, "column": 1, "columnspan": 3}
        }
      ]
    }
  ],

  "state_variables": [
    {"name": "ch1_value",    "type": "float", "default": 0.0, "format": "%.4f"},
    {"name": "ch2_value",    "type": "float", "default": 0.0, "format": "%.4f"},
    {"name": "ch3_value",    "type": "float", "default": 0.0, "format": "%.4f"},
    {"name": "ch4_value",    "type": "float", "default": 0.0, "format": "%.4f"},
    {"name": "logging",      "type": "bool",  "default": false},
    {"name": "file_path",    "type": "string", "default": "./logs/data_{timestamp}.csv"},
    {"name": "status",       "type": "enum",  "default": "IDLE"}
  ],

  "data_logger": {
    "sources": [
      {"variable": "ch1_value", "column_name": "CH1"},
      {"variable": "ch2_value", "column_name": "CH2"},
      {"variable": "ch3_value", "column_name": "CH3"},
      {"variable": "ch4_value", "column_name": "CH4"}
    ],
    "interval_ms": 1000,
    "format": "csv"
  }
}
```

#### 5.1.4 Template 4: Calibration UI

```json
{
  "template_id": "calibration-ui",
  "name": "Instrument Calibration",
  "description": "Calibration worksheet with standard/measured value entry, deviation calculation, and pass/fail determination.",
  "category": "Calibration",
  "tags": ["calibration", "quality", "compliance", "metrology"],

  "widgets": [
    {
      "type": "Frame",
      "id": "main",
      "children": [
        {
          "type": "Label",
          "id": "lbl_title",
          "text": "Calibration Worksheet",
          "font": {"size": 14, "weight": "bold"},
          "layout": {"row": 0, "column": 0, "columnspan": 4, "pady": 5}
        },
        {
          "type": "Frame",
          "id": "info_frame",
          "layout": {"row": 1, "column": 0, "columnspan": 4, "pady": 5},
          "children": [
            {"type": "Label", "text": "Date:", "layout": {"row": 0, "column": 0}},
            {"type": "Entry", "id": "ent_date", "text": "{auto_date}", "width": 12, "layout": {"row": 0, "column": 1}},
            {"type": "Label", "text": "Operator:", "layout": {"row": 0, "column": 2}},
            {"type": "Entry", "id": "ent_operator", "width": 15, "layout": {"row": 0, "column": 3}},
            {"type": "Label", "text": "Instrument ID:", "layout": {"row": 1, "column": 0}},
            {"type": "Entry", "id": "ent_inst_id", "width": 20, "layout": {"row": 1, "column": 1, "columnspan": 2}}
          ]
        },
        {
          "type": "Frame",
          "id": "points_frame",
          "layout": {"row": 2, "column": 0, "columnspan": 4, "pady": 10},
          "children": [
            {"type": "Label", "text": "Point",      "font": {"weight": "bold"}, "layout": {"row": 0, "column": 0, "padx": 5}},
            {"type": "Label", "text": "Standard",   "font": {"weight": "bold"}, "layout": {"row": 0, "column": 1, "padx": 5}},
            {"type": "Label", "text": "Measured",   "font": {"weight": "bold"}, "layout": {"row": 0, "column": 2, "padx": 5}},
            {"type": "Label", "text": "Deviation",  "font": {"weight": "bold"}, "layout": {"row": 0, "column": 3, "padx": 5}},
            {"type": "Label", "text": "Result",     "font": {"weight": "bold"}, "layout": {"row": 0, "column": 4, "padx": 5}},

            {"type": "Label", "text": "1", "layout": {"row": 1, "column": 0}},
            {"type": "Entry", "id": "ent_std_1",  "width": 12, "layout": {"row": 1, "column": 1}},
            {"type": "Entry", "id": "ent_meas_1", "width": 12, "layout": {"row": 1, "column": 2}},
            {"type": "Label", "id": "lbl_dev_1",  "text": "---", "width": 12, "layout": {"row": 1, "column": 3}},
            {"type": "Label", "id": "lbl_res_1",  "text": "---", "width": 8,  "layout": {"row": 1, "column": 4}},

            {"type": "Label", "text": "2", "layout": {"row": 2, "column": 0}},
            {"type": "Entry", "id": "ent_std_2",  "width": 12, "layout": {"row": 2, "column": 1}},
            {"type": "Entry", "id": "ent_meas_2", "width": 12, "layout": {"row": 2, "column": 2}},
            {"type": "Label", "id": "lbl_dev_2",  "text": "---", "width": 12, "layout": {"row": 2, "column": 3}},
            {"type": "Label", "id": "lbl_res_2",  "text": "---", "width": 8,  "layout": {"row": 2, "column": 4}},

            {"type": "Label", "text": "3", "layout": {"row": 3, "column": 0}},
            {"type": "Entry", "id": "ent_std_3",  "width": 12, "layout": {"row": 3, "column": 1}},
            {"type": "Entry", "id": "ent_meas_3", "width": 12, "layout": {"row": 3, "column": 2}},
            {"type": "Label", "id": "lbl_dev_3",  "text": "---", "width": 12, "layout": {"row": 3, "column": 3}},
            {"type": "Label", "id": "lbl_res_3",  "text": "---", "width": 8,  "layout": {"row": 3, "column": 4}}
          ]
        },
        {
          "type": "Button",
          "id": "btn_calc",
          "text": "Calculate",
          "command": "calculate_calibration",
          "layout": {"row": 3, "column": 0, "pady": 10}
        },
        {
          "type": "Label",
          "id": "lbl_overall",
          "text": "Overall: ---",
          "font": {"size": 12, "weight": "bold"},
          "foreground": "#2c3e50",
          "layout": {"row": 3, "column": 2, "columnspan": 2}
        }
      ]
    }
  ],

  "state_variables": [
    {"name": "cal_date",       "type": "string", "default": ""},
    {"name": "cal_operator",   "type": "string", "default": ""},
    {"name": "cal_instrument", "type": "string", "default": ""},
    {"name": "std_1",          "type": "float",  "default": 0.0, "format": "%.6f"},
    {"name": "meas_1",         "type": "float",  "default": 0.0, "format": "%.6f"},
    {"name": "dev_1",          "type": "float",  "default": 0.0, "format": "%.6f"},
    {"name": "pass_1",         "type": "bool",   "default": false},
    {"name": "std_2",          "type": "float",  "default": 0.0, "format": "%.6f"},
    {"name": "meas_2",         "type": "float",  "default": 0.0, "format": "%.6f"},
    {"name": "dev_2",          "type": "float",  "default": 0.0, "format": "%.6f"},
    {"name": "pass_2",         "type": "bool",   "default": false},
    {"name": "std_3",          "type": "float",  "default": 0.0, "format": "%.6f"},
    {"name": "meas_3",         "type": "float",  "default": 0.0, "format": "%.6f"},
    {"name": "dev_3",          "type": "float",  "default": 0.0, "format": "%.6f"},
    {"name": "pass_3",         "type": "bool",   "default": false},
    {"name": "overall_pass",   "type": "bool",   "default": false},
    {"name": "tolerance",      "type": "float",  "default": 0.01, "format": "%.4f"}
  ]
}
```

#### 5.1.5 Template 5: Oscilloscope Display

```json
{
  "template_id": "oscilloscope-display",
  "name": "Oscilloscope Display",
  "description": "Digital oscilloscope interface with waveform canvas, channel controls, and time/voltage scaling.",
  "category": "Visualization",
  "tags": ["oscilloscope", "waveform", "canvas", "visualization"],

  "widgets": [
    {
      "type": "Frame",
      "id": "main",
      "children": [
        {
          "type": "Canvas",
          "id": "cvs_waveform",
          "width": 700,
          "height": 400,
          "background": "#0a0a0a",
          "layout": {"row": 0, "column": 0, "columnspan": 3, "pady": 5}
        },
        {
          "type": "Frame",
          "id": "controls",
          "layout": {"row": 1, "column": 0, "columnspan": 3},
          "children": [
            {
              "type": "Frame",
              "id": "time_controls",
              "layout": {"row": 0, "column": 0, "padx": 10},
              "children": [
                {"type": "Label", "text": "Time/div:", "layout": {"row": 0, "column": 0}},
                {"type": "Scale", "id": "scl_time", "from": 1, "to": 1000, "orient": "horizontal", "length": 150, "layout": {"row": 0, "column": 1}},
                {"type": "Label", "id": "lbl_time_val", "text": "1 ms", "layout": {"row": 0, "column": 2}}
              ]
            },
            {
              "type": "Frame",
              "id": "volt_controls",
              "layout": {"row": 0, "column": 1, "padx": 10},
              "children": [
                {"type": "Label", "text": "Volts/div:", "layout": {"row": 0, "column": 0}},
                {"type": "Scale", "id": "scl_volt", "from": 0.1, "to": 10, "resolution": 0.1, "orient": "horizontal", "length": 150, "layout": {"row": 0, "column": 1}},
                {"type": "Label", "id": "lbl_volt_val", "text": "1 V", "layout": {"row": 0, "column": 2}}
              ]
            },
            {
              "type": "Frame",
              "id": "trigger_controls",
              "layout": {"row": 0, "column": 2, "padx": 10},
              "children": [
                {"type": "Label", "text": "Trigger:", "layout": {"row": 0, "column": 0}},
                {"type": "Scale", "id": "scl_trigger", "from": -10, "to": 10, "resolution": 0.1, "orient": "horizontal", "length": 100, "layout": {"row": 0, "column": 1}}
              ]
            }
          ]
        },
        {
          "type": "Frame",
          "id": "ch_controls",
          "layout": {"row": 2, "column": 0, "columnspan": 3, "pady": 5},
          "children": [
            {
              "type": "Checkbutton",
              "id": "chk_ch1",
              "text": "CH1",
              "variable": "ch1_enabled",
              "layout": {"row": 0, "column": 0, "padx": 5}
            },
            {
              "type": "Checkbutton",
              "id": "chk_ch2",
              "text": "CH2",
              "variable": "ch2_enabled",
              "layout": {"row": 0, "column": 1, "padx": 5}
            },
            {
              "type": "Button",
              "id": "btn_run",
              "text": "Run",
              "command": "start_acquisition",
              "layout": {"row": 0, "column": 2, "padx": 10}
            },
            {
              "type": "Button",
              "id": "btn_stop",
              "text": "Stop",
              "command": "stop_acquisition",
              "layout": {"row": 0, "column": 3, "padx": 5}
            },
            {
              "type": "Button",
              "id": "btn_single",
              "text": "Single",
              "command": "single_capture",
              "layout": {"row": 0, "column": 4, "padx": 5}
            }
          ]
        }
      ]
    }
  ],

  "state_variables": [
    {"name": "ch1_data",       "type": "string", "default": "",  "format": "%s", "description": "CH1 waveform data (JSON array)"},
    {"name": "ch2_data",       "type": "string", "default": "",  "format": "%s", "description": "CH2 waveform data (JSON array)"},
    {"name": "ch1_enabled",    "type": "bool",   "default": true},
    {"name": "ch2_enabled",    "type": "bool",   "default": true},
    {"name": "time_div",       "type": "float",  "default": 1.0, "format": "%.2f ms"},
    {"name": "volts_div",      "type": "float",  "default": 1.0, "format": "%.2f V"},
    {"name": "trigger_level",  "type": "float",  "default": 0.0, "format": "%.2f V"},
    {"name": "running",        "type": "bool",   "default": false},
    {"name": "acq_mode",       "type": "enum",   "default": "continuous"}
  ]
}
```

---

### 5.2 Template System Architecture

#### 5.2.1 File Storage

```
templates/
├── builtin/
│   ├── multimeter-readout.json
│   ├── serial-monitor.json
│   ├── data-logger-dashboard.json
│   ├── calibration-ui.json
│   └── oscilloscope-display.json
├── user/
│   ├── my-custom-dmm.json
│   └── temperature-monitor.json
└── index.json          # Template catalog index
```

#### 5.2.2 Template Index Format

```json
{
  "version": "1.0",
  "templates": [
    {
      "template_id": "multimeter-readout",
      "source": "builtin",
      "name": "Multimeter Readout",
      "description": "Basic digital multimeter readout panel...",
      "category": "Measurement",
      "tags": ["multimeter", "dmm"],
      "icon": "builtin:multimeter",
      "thumbnail": "builtin/multimeter-readout.png",
      "path": "builtin/multimeter-readout.json"
    }
  ]
}
```

#### 5.2.3 Template Gallery UI

```
+-----------------------------------------------+
|  New Project                    [Blank Canvas] |
+-----------------------------------------------+
|                                               |
|  Search: [____________________]  [All Categories v]
|                                               |
|  +----------------+  +----------------+       |
|  | [Thumbnail]    |  | [Thumbnail]    |       |
|  | Multimeter     |  | Serial Monitor |       |
|  | Readout        |  |                |       |
|  | #measurement   |  | #communication |       |
|  | [Use Template] |  | [Use Template] |       |
|  +----------------+  +----------------+       |
|                                               |
|  +----------------+  +----------------+       |
|  | [Thumbnail]    |  | [Thumbnail]    |       |
|  | Data Logger    |  | Calibration    |       |
|  | Dashboard      |  | UI             |       |
|  | #acquisition   |  | #calibration   |       |
|  | [Use Template] |  | [Use Template] |       |
|  +----------------+  +----------------+       |
|                                               |
|  +----------------+                           |
|  | [Thumbnail]    |                           |
|  | Oscilloscope   |                           |
|  | Display        |                           |
|  | #visualization |                           |
|  | [Use Template] |                           |
|  +----------------+                           |
|                                               |
+-----------------------------------------------+
```

#### 5.2.4 Template Instantiation Flow

```python
class TemplateManager:
    """Manages template loading and instantiation."""

    def __init__(self, templates_dir="./templates"):
        self.templates_dir = templates_dir
        self._builtin_dir = os.path.join(templates_dir, "builtin")
        self._user_dir = os.path.join(templates_dir, "user")
        self._catalog = self._load_catalog()

    def _load_catalog(self):
        """Load template catalog index."""
        index_path = os.path.join(self.templates_dir, "index.json")
        with open(index_path, 'r') as f:
            return json.load(f)

    def list_templates(self, category=None, tags=None):
        """List available templates, optionally filtered."""
        results = self._catalog["templates"]
        if category:
            results = [t for t in results if t.get("category") == category]
        if tags:
            results = [t for t in results if any(tag in t.get("tags", []) for tag in tags)]
        return results

    def load_template(self, template_id):
        """Load a template definition by ID."""
        entry = next((t for t in self._catalog["templates"] if t["template_id"] == template_id), None)
        if not entry:
            raise ValueError(f"Template '{template_id}' not found")
        path = os.path.join(self.templates_dir, entry["path"])
        with open(path, 'r') as f:
            return json.load(f)

    def instantiate(self, template_id):
        """
        Instantiate a template into a new project.
        Returns a complete project IR ready for the designer.
        """
        template = self.load_template(template_id)

        project = {
            "project_name": template["name"],
            "version": "1.0",
            "created_from_template": template_id,
            "widgets": template.get("widgets", []),
            "state_variables": template.get("state_variables", []),
            "bindings": template.get("bindings", []),
            "instruments": [template["instrument"]] if "instrument" in template else [],
            "data_loggers": [template["data_logger"]] if "data_logger" in template else [],
            "alarms": template.get("alarms", [])
        }
        return project

    def save_as_template(self, project, name, description, category, tags):
        """Save current project as a user template."""
        template = {
            "template_id": f"user_{int(time.time())}",
            "name": name,
            "description": description,
            "category": category,
            "tags": tags,
            "version": "1.0",
            "widgets": project["widgets"],
            "state_variables": project["state_variables"],
            "bindings": project.get("bindings", []),
        }
        if project.get("instruments"):
            template["instrument"] = project["instruments"][0]
        if project.get("data_loggers"):
            template["data_logger"] = project["data_loggers"][0]

        # Save to user directory
        filename = f"{template['template_id']}.json"
        path = os.path.join(self._user_dir, filename)
        with open(path, 'w') as f:
            json.dump(template, f, indent=2)

        # Update catalog
        self._catalog["templates"].append({
            "template_id": template["template_id"],
            "source": "user",
            "name": name,
            "description": description,
            "category": category,
            "tags": tags,
            "path": f"user/{filename}"
        })
        self._save_catalog()

        return template["template_id"]
```

---

## 6. Real-Time Data Considerations

### 6.1 Data Acquisition Patterns

#### 6.1.1 Pattern Comparison

| Pattern | Latency | CPU Load | Complexity | Use Case |
|---------|---------|----------|------------|----------|
| **Polled** | Medium (interval/2 avg) | Higher (regular queries) | Low | Most multimeters, slow sensors |
| **Continuous** | Low (read buffer) | Lower (blocking read) | Medium | Oscilloscopes, data loggers |
| **Triggered** | Lowest (on event) | Lowest | High | Burst capture, transient events |

#### 6.1.2 Polled Pattern (Default)

```python
# Polled acquisition - simplest pattern
# Background thread queries at fixed interval

def polled_acquisition_loop(self):
    while self.running:
        t_start = time.time()
        try:
            value = self.instrument.query("MEAS:VOLT:DC?")
            parsed = float(value.strip())
            self.root.after(0, lambda v=parsed: self.var_voltage.set(v))
        except Exception as e:
            self.handle_error(e)

        # Sleep to maintain interval
        elapsed = time.time() - t_start
        sleep_time = max(0, self.interval_ms / 1000.0 - elapsed)
        time.sleep(sleep_time)
```

#### 6.1.3 Continuous Pattern

```python
# Continuous acquisition - instrument streams data
# Software reads from buffer as fast as possible

def continuous_acquisition_loop(self):
    self.instrument.write("INIT")  # Start continuous acquisition
    while self.running:
        try:
            # Non-blocking read with short timeout
            raw = self.instrument.read_bytes(count=self.chunk_size, timeout=100)
            if raw:
                samples = self.parse_binary_waveform(raw)
                self.root.after(0, lambda s=samples: self.update_waveform(s))
        except pyvisa.errors.VisaIOError as e:
            if e.error_code != pyvisa.constants.VI_ERROR_TMO:
                self.handle_error(e)
            # Timeout means no data available, continue
```

#### 6.1.4 Triggered Pattern

```python
# Triggered acquisition - wait for trigger, then capture

def triggered_acquisition_loop(self):
    while self.running:
        # Wait for trigger condition
        if not self.trigger_wait():
            time.sleep(0.01)
            continue

        # Capture data
        try:
            self.instrument.write("DIGitize")
            self.instrument.query("*OPC?")  # Wait for completion
            data = self.instrument.query_binary_values("CURVE?", datatype='h')
            self.root.after(0, lambda d=data: self.update_display(d))
        except Exception as e:
            self.handle_error(e)

        if self.acq_mode == "single":
            self.running = False
```

---

### 6.2 Performance Budgets

#### 6.2.1 Timing Specifications

| Component | Target Rate | Max Rate | Jitter Tolerance | Thread Priority |
|-----------|-------------|----------|-----------------|-----------------|
| GUI Updates | 30 fps | 60 fps | 33 ms | Main thread (after()) |
| Instrument Polling | 2 Hz | 10 Hz | ±50 ms | Daemon thread |
| Fast Polling | 10 Hz | 100 Hz | ±10 ms | Daemon thread |
| Data Logging | 1 Hz | 10 Hz | ±100 ms | Daemon thread |
| Alarm Checking | 2 Hz | 5 Hz | ±50 ms | Daemon thread |
| File I/O | On demand | 1 Hz burst | 500 ms | Daemon thread |

#### 6.2.2 Thread Architecture

```
Main Thread (tkinter)
├── tkinter mainloop()
├── Variable updates via after()
├── Widget redraws
└── User event handling

Thread Pool: InstrumentPolling (max 10)
├── Thread: DMM-1 voltage (500ms)
├── Thread: DMM-1 current (500ms)
├── Thread: DMM-2 voltage (500ms)
└── ...

Thread Pool: InstrumentTrigger (max 5)
├── Handle on-demand queries
└── Short-lived per-request

Thread: DataLogger (1 per logger)
├── CSV write at interval
└── File rotation

Thread: AlarmMonitor (1 per alarm)
├── Condition evaluation
└── Action execution
```

#### 6.2.3 Rate Limiting for GUI Updates

```python
class RateLimitedUpdater:
    """
    Rate-limits GUI updates to prevent flooding the main thread.
    Essential for high-frequency data sources.
    """

    def __init__(self, root, update_fn, max_fps=30):
        self.root = root
        self.update_fn = update_fn
        self.min_interval = 1.0 / max_fps
        self._pending_value = None
        self._has_pending = False
        self._last_update = 0
        self._scheduled = False

    def submit(self, value):
        """Submit a value for GUI update (thread-safe)."""
        self._pending_value = value
        self._has_pending = True

        if not self._scheduled:
            self._scheduled = True
            self.root.after(0, self._process)

    def _process(self):
        """Process pending update in main thread."""
        self._scheduled = False

        if not self._has_pending:
            return

        now = time.time()
        elapsed = now - self._last_update

        if elapsed >= self.min_interval:
            # Update now
            value = self._pending_value
            self._has_pending = False
            self._last_update = now
            self.update_fn(value)
        else:
            # Schedule for later
            delay_ms = int((self.min_interval - elapsed) * 1000)
            self._scheduled = True
            self.root.after(delay_ms, self._process)


# Usage for oscilloscope waveform display:
# waveform_updater = RateLimitedUpdater(root, update_canvas, max_fps=30)
# In acquisition thread: waveform_updater.submit(new_samples)
```

---

## 7. Error Handling Strategy

### 7.1 Instrument Error Handling

#### 7.1.1 Error Categories and Responses

| Error | Cause | Retry Strategy | GUI Feedback |
|-------|-------|---------------|--------------|
| Connection refused | Wrong address, powered off | Retry 3x exponential backoff, then show error | Red status indicator |
| Timeout | Instrument busy, wrong command | Log warning, retry next cycle (polled) | Yellow status indicator |
| Parse failure | Unexpected response format | Log raw + error, set NaN or keep last | Orange value display |
| Disconnection | Cable pulled, power loss | Attempt reconnect every 5s | Blinking red status |
| Permission denied | Port in use, access rights | No retry, show error immediately | Red error dialog |
| Buffer overflow | Data too fast | Drop oldest, log warning | Yellow indicator |

#### 7.1.2 Connection Recovery State Machine

```
         +---------+
         |  IDLE   |
         +----+----+
              | start()
              v
         +----+----+
    +--->| CONNECT |<-------------------+
    |    |  ING    |                    |
    |    +----+----+                    |
    |         | success                 |
    |         v                         |
    |    +----+----+     error          |
    |    | CONNECT |--------------------+
    |    |   ED    |
    |    +----+----+
    |         | query error
    |         v
    |    +----+----+     max retries    +---------+
    +----+ RECON  |-------------------->| FAILED  |
         | NECTING |    exceeded         | (stop)  |
         +---------+                     +---------+
```

#### 7.1.3 Generated Error Handling Code

```python
"""
Comprehensive error handling for instrument communication.
"""

import time
import logging
import enum

logger = logging.getLogger("labgui.instruments")


class ConnectionState(enum.Enum):
    IDLE = "idle"
    CONNECTING = "connecting"
    CONNECTED = "connected"
    RECONNECTING = "reconnecting"
    FAILED = "failed"


class InstrumentErrorHandler:
    """
    Centralized error handler for instrument connections.
    Implements retry logic, reconnection, and GUI feedback.
    """

    def __init__(self, root, status_var, max_retries=3,
                 base_retry_delay=1.0, reconnect_interval=5.0):
        self.root = root
        self.status_var = status_var  # StateVariable for connection status
        self.max_retries = max_retries
        self.base_retry_delay = base_retry_delay
        self.reconnect_interval = reconnect_interval

        self.state = ConnectionState.IDLE
        self.consecutive_errors = 0
        self.last_success_time = None

    def with_retry(self, operation, operation_name="operation"):
        """
        Execute an operation with retry logic.
        Returns (success, result_or_error).
        """
        last_error = None

        for attempt in range(1, self.max_retries + 1):
            try:
                result = operation()
                self._on_success()
                return True, result

            except Exception as e:
                last_error = e
                self._on_error(e, attempt, operation_name)

                if attempt < self.max_retries:
                    delay = self.base_retry_delay * (2 ** (attempt - 1))
                    logger.warning(f"Retry {attempt}/{self.max_retries} for {operation_name} in {delay:.1f}s")
                    time.sleep(delay)

        # All retries exhausted
        self._on_max_retries_exceeded(operation_name, last_error)
        return False, last_error

    def _on_success(self):
        """Called on successful operation."""
        self.consecutive_errors = 0
        self.last_success_time = time.time()
        if self.state != ConnectionState.CONNECTED:
            self.state = ConnectionState.CONNECTED
            self.root.after(0, lambda: self.status_var.set("connected"))

    def _on_error(self, error, attempt, operation_name):
        """Called on operation error."""
        self.consecutive_errors += 1
        logger.warning(f"{operation_name} error (attempt {attempt}): {error}")

    def _on_max_retries_exceeded(self, operation_name, error):
        """Called when all retries are exhausted."""
        logger.error(f"{operation_name} failed after {self.max_retries} attempts: {error}")

        if self.consecutive_errors >= self.max_retries * 2:
            # Enter reconnecting state
            self.state = ConnectionState.RECONNECTING
            self.root.after(0, lambda: self.status_var.set("reconnecting"))

    def should_reconnect(self):
        """Check if a reconnection attempt should be made."""
        return self.state in (ConnectionState.RECONNECTING, ConnectionState.FAILED)

    def handle_parse_error(self, raw_response, parse_error, variable_name):
        """
        Handle response parsing failure.
        Logs the raw response and error details.
        """
        logger.error(
            f"Parse error for '{variable_name}': {parse_error}. "
            f"Raw response: {repr(raw_response[:200])}"
        )
        # Return NaN for float types, None for others
        return float('nan')

    def handle_timeout(self, operation_name, is_polled=True):
        """
        Handle timeout error.
        Polled: log warning, continue to next cycle.
        Triggered: show error to user.
        """
        logger.warning(f"Timeout in {operation_name}")
        if is_polled:
            # Polled: just log, next cycle will retry
            pass
        else:
            # Triggered: notify user
            self.root.after(0, lambda: self._show_timeout_error(operation_name))

    def _show_timeout_error(self, operation_name):
        """Show timeout error dialog in main thread."""
        import tkinter.messagebox as mb
        mb.showwarning("Timeout", f"Operation timed out: {operation_name}")


# Decorator for instrument operations

def instrument_operation(handler, operation_name=None):
    """
    Decorator that wraps instrument operations with error handling.
    Usage:
        @instrument_operation(error_handler, "read_voltage")
        def read_voltage(self):
            return self.inst.query("MEAS:VOLT:DC?")
    """
    def decorator(fn):
        def wrapper(*args, **kwargs):
            name = operation_name or fn.__name__
            success, result = handler.with_retry(
                lambda: fn(*args, **kwargs),
                operation_name=name
            )
            if success:
                return result
            else:
                raise InstrumentError(f"{name} failed: {result}")
        return wrapper
    return decorator


class InstrumentError(Exception):
    """Custom exception for instrument errors."""
    pass
```

### 7.2 GUI Error Handling

#### 7.2.1 Thread Safety Principles

```python
"""
Critical rule: All GUI updates must happen in the main thread.
Background threads must use root.after(0, ...) to update widgets.
"""

import functools
import traceback


def gui_safe(fn):
    """
    Decorator: catch all exceptions, never let them crash the GUI.
    Logs full traceback for debugging.
    """
    @functools.wraps(fn)
    def wrapper(*args, **kwargs):
        try:
            return fn(*args, **kwargs)
        except Exception as e:
            logger = logging.getLogger("labgui.safe")
            logger.error(f"GUI error in {fn.__name__}: {e}")
            logger.debug(traceback.format_exc())
            # Never re-raise - GUI must keep running
    return wrapper


def thread_safe_gui_update(root):
    """
    Decorator factory: ensures a function runs in the main thread.
    Can be called from any thread safely.
    """
    def decorator(fn):
        @functools.wraps(fn)
        def wrapper(*args, **kwargs):
            def _run_in_main():
                try:
                    fn(*args, **kwargs)
                except Exception as e:
                    logging.getLogger("labgui.thread").error(
                        f"Thread-safe update error: {e}"
                    )
            root.after(0, _run_in_main)
        return wrapper
    return decorator


class StatusBar:
    """
    Status bar with error indicator.
    Shows last error message with timestamp.
    """

    def __init__(self, parent):
        self.frame = tk.Frame(parent, relief=tk.SUNKEN, bd=1)

        self.lbl_status = tk.Label(self.frame, text="Ready", anchor=tk.W)
        self.lbl_status.pack(side=tk.LEFT, fill=tk.X, expand=True)

        self.lbl_error = tk.Label(self.frame, text="", fg="#e74c3c", anchor=tk.E)
        self.lbl_error.pack(side=tk.RIGHT, padx=5)

        self._error_clear_timer = None

    def set_status(self, text):
        """Set normal status text."""
        self.lbl_status.configure(text=text, fg="#2c3e50")

    def show_error(self, text, duration_ms=5000):
        """Show error message that auto-clears."""
        self.lbl_error.configure(text=f"Error: {text}")

        if self._error_clear_timer:
            self.frame.after_cancel(self._error_clear_timer)

        self._error_clear_timer = self.frame.after(duration_ms, self._clear_error)

    def _clear_error(self):
        """Clear error display."""
        self.lbl_error.configure(text="")
        self._error_clear_timer = None

    def pack(self, **kwargs):
        self.frame.pack(**kwargs)
```

#### 7.2.2 Global Exception Handler

```python
def setup_global_exception_handler(root):
    """
    Install global exception handler that prevents GUI crashes.
    Must be called before root.mainloop().
    """
    import sys

    def handle_exception(exc_type, exc_value, exc_traceback):
        """Handle uncaught exceptions."""
        if issubclass(exc_type, KeyboardInterrupt):
            # Allow Ctrl+C to exit
            sys.__excepthook__(exc_type, exc_value, exc_traceback)
            return

        logger = logging.getLogger("labgui.global")
        logger.critical(
            "Uncaught exception:",
            exc_info=(exc_type, exc_value, exc_traceback)
        )

        # Show error in status bar (if available)
        error_msg = str(exc_value)[:50]
        # Try to find status bar and show error
        for widget in root.winfo_children():
            if isinstance(widget, StatusBar):
                widget.show_error(error_msg)
                break

    sys.excepthook = handle_exception

    # Also handle tkinter's internal errors
    old_report = tk.Tcl().call("info", "commands", "tkerror")
    def tk_error_handler(error):
        logging.getLogger("labgui.tk").error(f"Tkinter error: {error}")
    tk.Tcl().createcommand("tkerror", tk_error_handler)
```

#### 7.2.3 Logging Configuration

```python
"""
Standard logging setup for generated lab applications.
"""

import logging
import sys
from datetime import datetime


def setup_logging(log_file=None, console_level=logging.INFO, file_level=logging.DEBUG):
    """
    Configure logging for the lab application.
    Logs to both console and optional file.
    """
    root_logger = logging.getLogger("labgui")
    root_logger.setLevel(logging.DEBUG)

    # Console handler
    console = logging.StreamHandler(sys.stdout)
    console.setLevel(console_level)
    console_fmt = logging.Formatter(
        "%(asctime)s [%(levelname)7s] %(name)-20s %(message)s",
        datefmt="%H:%M:%S"
    )
    console.setFormatter(console_fmt)
    root_logger.addHandler(console)

    # File handler
    if log_file:
        file_handler = logging.FileHandler(log_file, mode='a')
        file_handler.setLevel(file_level)
        file_fmt = logging.Formatter(
            "%(asctime)s [%(levelname)7s] %(name)-20s [%(threadName)s] %(message)s",
            datefmt="%Y-%m-%d %H:%M:%S"
        )
        file_handler.setFormatter(file_fmt)
        root_logger.addHandler(file_handler)

    # Create sub-loggers
    for name in ["instruments", "logger", "alarms", "thread", "gui", "safe"]:
        logging.getLogger(f"labgui.{name}")

    return root_logger
```

---

## Appendix A: Complete Generated Application Example

This section shows a complete, runnable example of what the code generator produces for a simple multimeter readout application.

```python
#!/usr/bin/env python3
"""
Generated by LabGUI Builder v1.0
Project: Multimeter Readout
Template: multimeter-readout
Generated: 2024-01-15T09:30:00
"""

import tkinter as tk
from tkinter import ttk
import threading
import time
import logging
import pyvisa

# === Logging Setup ===
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    datefmt="%H:%M:%S"
)
logger = logging.getLogger("labgui.app")


# === State Variables ===
class StateVar:
    def __init__(self, var_type, default, fmt="%s"):
        self.type = var_type
        self.fmt = fmt
        if var_type == "float":
            self.var = tk.DoubleVar(value=default)
        elif var_type == "int":
            self.var = tk.IntVar(value=default)
        elif var_type == "bool":
            self.var = tk.BooleanVar(value=default)
        else:
            self.var = tk.StringVar(value=str(default))
        self.display = tk.StringVar(value=self._format(default))
        self.var.trace_add("write", self._on_change)

    def _format(self, v):
        try:
            return self.fmt % v
        except Exception:
            return str(v)

    def _on_change(self, *args):
        self.display.set(self._format(self.var.get()))

    def get(self):
        return self.var.get()

    def set(self, v):
        self.var.set(v)


# === Instrument Binding ===
class InstrumentBinding:
    def __init__(self, root, state_var, resource, cmd, interval_ms=500):
        self.root = root
        self.state_var = state_var
        self.resource = resource
        self.cmd = cmd
        self.interval_ms = interval_ms
        self.running = False
        self.inst = None
        self.rm = None

    def start(self):
        self.running = True
        threading.Thread(target=self._loop, daemon=True).start()

    def stop(self):
        self.running = False
        if self.inst:
            try:
                self.inst.close()
            except Exception:
                pass
        if self.rm:
            try:
                self.rm.close()
            except Exception:
                pass

    def _connect(self):
        try:
            self.rm = pyvisa.ResourceManager()
            self.inst = self.rm.open_resource(self.resource, timeout=5000)
            self.inst.read_termination = "\\n"
            self.inst.write_termination = "\\n"
            return True
        except Exception as e:
            logger.error(f"Connection failed: {e}")
            return False

    def _loop(self):
        while self.running:
            try:
                if not self.inst:
                    if not self._connect():
                        time.sleep(5)
                        continue
                resp = self.inst.query(self.cmd)
                value = float(resp.strip())
                self.root.after(0, lambda v=value: self.state_var.set(v))
            except Exception as e:
                logger.warning(f"Query error: {e}")
                if self.inst:
                    try:
                        self.inst.close()
                    except Exception:
                        pass
                    self.inst = None
            time.sleep(self.interval_ms / 1000.0)


# === Main Application ===
class MultimeterApp:
    def __init__(self, root):
        self.root = root
        root.title("Multimeter Readout")
        root.geometry("400x250")

        # State variables
        self.sv_voltage = StateVar("float", 0.0, "%.6f V")
        self.sv_current = StateVar("float", 0.0, "%.6f A")
        self.sv_resistance = StateVar("float", 0.0, "%.2f Ohm")
        self.sv_running = StateVar("bool", False)

        # Build UI
        self._build_ui()

        # Instrument bindings (placeholder - configure in UI)
        self.bindings = []

        root.protocol("WM_DELETE_WINDOW", self.on_close)

    def _build_ui(self):
        # Title
        ttk.Label(self.root, text="Digital Multimeter",
                 font=("Arial", 14, "bold")).grid(row=0, column=0, columnspan=2, pady=10)

        # Voltage
        ttk.Label(self.root, text="Voltage DC:",
                 font=("Consolas", 11)).grid(row=1, column=0, sticky="e", padx=5)
        ttk.Label(self.root, textvariable=self.sv_voltage.display,
                 font=("Consolas", 16, "bold"), width=15).grid(row=1, column=1, padx=5)

        # Current
        ttk.Label(self.root, text="Current DC:",
                 font=("Consolas", 11)).grid(row=2, column=0, sticky="e", padx=5)
        ttk.Label(self.root, textvariable=self.sv_current.display,
                 font=("Consolas", 16, "bold"), width=15).grid(row=2, column=1, padx=5)

        # Resistance
        ttk.Label(self.root, text="Resistance:",
                 font=("Consolas", 11)).grid(row=3, column=0, sticky="e", padx=5)
        ttk.Label(self.root, textvariable=self.sv_resistance.display,
                 font=("Consolas", 16, "bold"), width=15).grid(row=3, column=1, padx=5)

        # Buttons
        btn_frame = ttk.Frame(self.root)
        btn_frame.grid(row=4, column=0, columnspan=2, pady=15)

        ttk.Button(btn_frame, text="Start Reading",
                  command=self.start_reading).pack(side=tk.LEFT, padx=5)
        ttk.Button(btn_frame, text="Stop",
                  command=self.stop_reading).pack(side=tk.LEFT, padx=5)

        # Status
        self.lbl_status = ttk.Label(self.root, text="Status: Ready",
                                   font=("Arial", 9), foreground="#7f8c8d")
        self.lbl_status.grid(row=5, column=0, columnspan=2)

    def start_reading(self):
        self.sv_running.set(True)
        self.lbl_status.configure(text="Status: Running", foreground="#2ecc71")

        # Create bindings
        b1 = InstrumentBinding(self.root, self.sv_voltage,
                              "GPIB0::22::INSTR", "MEAS:VOLT:DC?\\n", 500)
        b2 = InstrumentBinding(self.root, self.sv_current,
                              "GPIB0::22::INSTR", "MEAS:CURR:DC?\\n", 500)
        b3 = InstrumentBinding(self.root, self.sv_resistance,
                              "GPIB0::22::INSTR", "MEAS:RES?\\n", 500)

        self.bindings = [b1, b2, b3]
        for b in self.bindings:
            b.start()

    def stop_reading(self):
        self.sv_running.set(False)
        self.lbl_status.configure(text="Status: Stopped", foreground="#7f8c8d")
        for b in self.bindings:
            b.stop()
        self.bindings = []

    def on_close(self):
        self.stop_reading()
        self.root.destroy()


if __name__ == "__main__":
    root = tk.Tk()
    app = MultimeterApp(root)
    root.mainloop()
```

---

## Appendix B: Glossary

| Term | Definition |
|------|-----------|
| **IR** | Intermediate Representation — the JSON structure that describes the GUI, variables, bindings, and configuration |
| **VISA** | Virtual Instrument Software Architecture — standard API for instrument communication |
| **SCPI** | Standard Commands for Programmable Instruments — text-based command language |
| **Binding** | Connection between a state variable and a widget property |
| **Polled** | Communication pattern where software initiates reads at fixed intervals |
| **Triggered** | Communication pattern where reads happen on demand (e.g., button click) |
| **Hysteresis** | Difference between alarm trigger and reset thresholds to prevent flapping |
| **File Rotation** | Creating new log files when size/time limits are reached |
| **Daemon Thread** | Background thread that exits when main program ends |

---

*End of Lab Domain Architecture Specification*
