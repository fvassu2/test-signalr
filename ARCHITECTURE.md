# DeviceHub Architecture

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         ANGULAR CLIENT                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────┐     ┌────────────────┐    ┌──────────────┐  │
│  │  Component   │────▶│ SignalR Service│───▶│ @microsoft/  │  │
│  │              │     │                │    │  signalr     │  │
│  └──────────────┘     └────────────────┘    └──────────────┘  │
│         │                     │                      │         │
│         │                     ▼                      │         │
│         │            ┌─────────────────┐             │         │
│         │            │  ClientInfo     │             │         │
│         │            │  MessageData    │             │         │
│         │            └─────────────────┘             │         │
│         │                                            │         │
└─────────┼────────────────────────────────────────────┼─────────┘
          │                                            │
          │         WebSocket Connection               │
          │         (SignalR Protocol)                 │
          │                                            │
┌─────────▼────────────────────────────────────────────▼─────────┐
│                    ASP.NET CORE BACKEND                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                    DeviceHub                              │  │
│  │  ┌────────────────────────────────────────────────┐      │  │
│  │  │  ConcurrentDictionary<string, ClientInfo>      │      │  │
│  │  │  Key: DeviceId (persistent)                    │      │  │
│  │  │  Value: ClientInfo (with ConnectionId)         │      │  │
│  │  └────────────────────────────────────────────────┘      │  │
│  │                                                           │  │
│  │  Methods:                                                 │  │
│  │  • RegisterClient(ClientInfo)                             │  │
│  │  • GetConnectedClients()                                  │  │
│  │  • SendMessage(senderId, senderName, message)             │  │
│  │  • SendMessageToClient(targetDeviceId, message)           │  │
│  │  • OnDisconnectedAsync(exception)                         │  │
│  │                                                           │  │
│  │  Events:                                                  │  │
│  │  • ClientConnected(ClientInfo)                            │  │
│  │  • ClientDisconnected(ClientInfo)                         │  │
│  │  • ConnectedClientsList(ClientInfo[])                     │  │
│  │  • ReceiveMessage(MessageData)                            │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │              DevicesController (REST API)                 │  │
│  │  • POST /api/devices/broadcast                            │  │
│  │  • POST /api/devices/notify                               │  │
│  │  • GET /api/devices/status                                │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## Client Registration Flow

```
┌────────┐                      ┌──────────┐
│ Client │                      │   Hub    │
└───┬────┘                      └────┬─────┘
    │                                │
    │  1. Connect to /deviceHub      │
    ├───────────────────────────────▶│
    │                                │
    │  2. Connection Established     │
    │◀───────────────────────────────┤
    │  (ConnectionId = "ABC123")     │
    │                                │
    │  3. RegisterClient(ClientInfo) │
    │     {                          │
    │       deviceId: "device-001",  │
    │       deviceName: "Tablet 1",  │
    │       deviceType: "tablet"     │
    │     }                          │
    ├───────────────────────────────▶│
    │                                │
    │                                │  Store in Dictionary:
    │                                │  ["device-001"] = {
    │                                │    DeviceId: "device-001",
    │                                │    ConnectionId: "ABC123",
    │                                │    ...
    │                                │  }
    │                                │
    │  4. ClientConnected (broadcast)│
    │◀───────────────────────────────┤ (to all clients)
    │                                │
    │  5. ConnectedClientsList       │
    │◀───────────────────────────────┤ (to caller only)
    │                                │
    ▼                                ▼
```

## Message Broadcasting Flow

```
┌──────────┐              ┌──────────┐              ┌──────────┐
│ Client A │              │   Hub    │              │ Client B │
└────┬─────┘              └────┬─────┘              └────┬─────┘
     │                         │                         │
     │  SendMessage(           │                         │
     │    "device-001",        │                         │
     │    "Tablet 1",          │                         │
     │    "Hello!"             │                         │
     │  )                      │                         │
     ├────────────────────────▶│                         │
     │                         │                         │
     │                         │  Create MessageData:    │
     │                         │  {                      │
     │                         │    Id: 1,               │
     │                         │    SenderId: "device-001",│
     │                         │    SenderName: "Tablet 1",│
     │                         │    Message: "Hello!",   │
     │                         │    Timestamp: now       │
     │                         │  }                      │
     │                         │                         │
     │  ReceiveMessage(data)   │  ReceiveMessage(data)   │
     │◀────────────────────────┤────────────────────────▶│
     │                         │                         │
     ▼                         ▼                         ▼
```

## Reconnection Flow

```
┌────────┐                      ┌──────────┐
│ Client │                      │   Hub    │
└───┬────┘                      └────┬─────┘
    │                                │
    │  Initial Connection            │
    │  ConnectionId: "ABC123"        │
    ├───────────────────────────────▶│
    │  RegisterClient                │
    │  (deviceId: "device-001")      │
    ├───────────────────────────────▶│
    │                                │  Dictionary:
    │                                │  ["device-001"] = {
    │                                │    ConnectionId: "ABC123"
    │                                │  }
    │                                │
    │  ╳ Disconnect                  │
    ├───────────────────────────────▶│
    │                                │  Remove from Dictionary
    │                                │  Notify: ClientDisconnected
    │                                │
    │  Reconnect                     │
    │  New ConnectionId: "XYZ789"    │
    ├───────────────────────────────▶│
    │  RegisterClient                │
    │  (deviceId: "device-001")      │
    │    ← Same DeviceId!            │
    ├───────────────────────────────▶│
    │                                │  Dictionary:
    │                                │  ["device-001"] = {
    │                                │    ConnectionId: "XYZ789"
    │                                │  }  ← Updated!
    │                                │
    ▼                                ▼
```

## Direct Messaging Flow

```
┌──────────┐              ┌──────────┐              ┌──────────┐
│ Client A │              │   Hub    │              │ Client B │
│ device-  │              │          │              │ device-  │
│   001    │              │          │              │   002    │
└────┬─────┘              └────┬─────┘              └────┬─────┘
     │                         │                         │
     │  SendMessageToClient(   │                         │
     │    targetDeviceId:      │                         │
     │      "device-002",      │                         │
     │    message: "Hi B!"     │                         │
     │  )                      │                         │
     ├────────────────────────▶│                         │
     │                         │                         │
     │                         │  1. Find target:        │
     │                         │     ConnectedClients    │
     │                         │       ["device-002"]    │
     │                         │     → ConnectionId:     │
     │                         │       "XYZ789"          │
     │                         │                         │
     │                         │  2. Create MessageData  │
     │                         │                         │
     │                         │  3. Send to specific    │
     │                         │     ConnectionId        │
     │                         │  ReceiveMessage(data)   │
     │                         ├────────────────────────▶│
     │                         │                         │
     │                         │  (Only Client B gets it)│
     │                         │                         │
     ▼                         ▼                         ▼
```

## Data Models

### ClientInfo
```
┌───────────────────────────────────────┐
│         ClientInfo                    │
├───────────────────────────────────────┤
│ • DeviceId: string                    │  ← Persistent (key)
│ • DeviceName: string                  │  ← Display name
│ • DeviceType: "tablet" | "manager"    │  ← Device type
│ • ConnectedAt: DateTime               │  ← Timestamp
│ • ConnectionId: string                │  ← SignalR connection
└───────────────────────────────────────┘
```

### MessageData
```
┌───────────────────────────────────────┐
│         MessageData                   │
├───────────────────────────────────────┤
│ • Id: int                             │  ← Incremental
│ • SenderId: string                    │  ← Sender's DeviceId
│ • SenderName: string                  │  ← Sender's name
│ • Message: string                     │  ← Content
│ • Timestamp: DateTime                 │  ← When sent
└───────────────────────────────────────┘
```

## Thread Safety

```
┌─────────────────────────────────────────────────┐
│     ConcurrentDictionary<string, ClientInfo>    │
├─────────────────────────────────────────────────┤
│                                                 │
│  Thread 1          Thread 2          Thread 3  │
│     │                 │                 │       │
│     ▼                 ▼                 ▼       │
│  Add/Update        Read              Remove     │
│     │                 │                 │       │
│     └─────────────────┼─────────────────┘       │
│                       │                         │
│                  Thread-safe                    │
│              atomic operations                  │
│                                                 │
└─────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────┐
│        Interlocked.Increment(_messageCounter)   │
├─────────────────────────────────────────────────┤
│                                                 │
│  Thread 1     Thread 2     Thread 3             │
│     │            │            │                 │
│     ▼            ▼            ▼                 │
│  Increment   Increment   Increment              │
│     │            │            │                 │
│     └────────────┼────────────┘                 │
│                  │                              │
│            Atomic operation                     │
│       (no race conditions)                      │
│                                                 │
└─────────────────────────────────────────────────┘
```
