# Multi-Hub Architecture - Visual Overview

## System Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                        ANGULAR FRONTEND                              │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌────────────────────────────────────────────────────────────┐    │
│  │            SignalRService (Multi-Hub Manager)              │    │
│  │                                                            │    │
│  │  DEFAULT_HUB_CONFIGS:                                      │    │
│  │  • devices   → http://localhost:5000/deviceHub            │    │
│  │  • chat      → http://localhost:5000/chatHub              │    │
│  │  • notifications → http://localhost:5000/notificationHub  │    │
│  │                                                            │    │
│  │  connections: Map<string, HubConnection>                   │    │
│  │  hubStates: Signal<Map<string, HubConnectionInfo>>        │    │
│  └────────────────────────────────────────────────────────────┘    │
│         │                    │                    │                 │
│         │ WebSocket          │ WebSocket          │ WebSocket       │
│         │                    │                    │                 │
└─────────┼────────────────────┼────────────────────┼─────────────────┘
          │                    │                    │
          ▼                    ▼                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    ASP.NET CORE BACKEND                              │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │                       BaseHub (Abstract)                      │  │
│  │  ┌────────────────────────────────────────────────────────┐  │  │
│  │  │  Shared Functionality:                                 │  │  │
│  │  │  • RegisterClient(ClientInfo)                          │  │  │
│  │  │  • GetConnectedClients()                               │  │  │
│  │  │  • SendMessage(senderId, senderName, message)          │  │  │
│  │  │  • SendMessageToClient(targetDeviceId, message)        │  │  │
│  │  │  • OnDisconnectedAsync(exception)                      │  │  │
│  │  │                                                         │  │  │
│  │  │  Abstract Properties:                                   │  │  │
│  │  │  • ConnectedClients (ConcurrentDictionary)             │  │  │
│  │  │  • GetMessageCounterRef() (ref int)                    │  │  │
│  │  │                                                         │  │  │
│  │  │  Virtual Hook Methods:                                 │  │  │
│  │  │  • OnClientRegistered(client)                          │  │  │
│  │  │  • OnMessageSent(message)                              │  │  │
│  │  │  • OnDirectMessageSent(message, targetId)              │  │  │
│  │  │  • OnClientDisconnected(client)                        │  │  │
│  │  └────────────────────────────────────────────────────────┘  │  │
│  └──────────────────────────────────────────────────────────────┘  │
│         ▲                      ▲                      ▲             │
│         │                      │                      │             │
│         │ inherits             │ inherits             │ inherits    │
│         │                      │                      │             │
│  ┌──────┴────────┐      ┌──────┴────────┐      ┌──────┴────────┐  │
│  │  DeviceHub    │      │   ChatHub     │      │ Notification  │  │
│  │               │      │               │      │     Hub       │  │
│  │ Endpoint:     │      │ Endpoint:     │      │ Endpoint:     │  │
│  │ /deviceHub    │      │ /chatHub      │      │ /notification │  │
│  │               │      │               │      │      Hub      │  │
│  │ Own clients:  │      │ Own clients:  │      │ Own clients:  │  │
│  │ _connected    │      │ _connected    │      │ _connected    │  │
│  │   Clients     │      │   Clients     │      │   Clients     │  │
│  │               │      │               │      │               │  │
│  │ Own counter:  │      │ Own counter:  │      │ Own counter:  │  │
│  │ _message      │      │ _message      │      │ _message      │  │
│  │   Counter     │      │   Counter     │      │   Counter     │  │
│  └───────────────┘      └───────────────┘      └───────────────┘  │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
```

## Hub Inheritance Diagram

```
                    ┌─────────────────┐
                    │   Hub (base)    │
                    │   SignalR Core  │
                    └────────┬────────┘
                             │
                             │ extends
                             ▼
                    ┌─────────────────┐
                    │   BaseHub       │
                    │   (abstract)    │
                    │                 │
                    │ Shared Logic:   │
                    │ • Client mgmt   │
                    │ • Messaging     │
                    │ • Disconnect    │
                    └────────┬────────┘
                             │
                             │ inherits
            ┌────────────────┼────────────────┐
            │                │                │
            ▼                ▼                ▼
    ┌───────────────┐ ┌───────────────┐ ┌───────────────┐
    │  DeviceHub    │ │   ChatHub     │ │ CustomHub     │
    │               │ │               │ │               │
    │ + Own state   │ │ + Own state   │ │ + Own state   │
    │ + Custom      │ │ + Legacy      │ │ + Specific    │
    │   methods     │ │   support     │ │   features    │
    └───────────────┘ └───────────────┘ └───────────────┘
```

## Client Connection Flow

```
┌────────┐                                           ┌──────────────┐
│ Client │                                           │   Backend    │
└───┬────┘                                           └──────┬───────┘
    │                                                       │
    │  1. Connect to /deviceHub                            │
    ├──────────────────────────────────────────────────────▶
    │                                                       │
    │  2. Connection Established (ConnectionId: "ABC123")  │
    │◀──────────────────────────────────────────────────────┤
    │                                                       │
    │  3. RegisterClient({ deviceId, deviceName, ... })    │
    ├──────────────────────────────────────────────────────▶
    │                                                       │
    │                            DeviceHub._connectedClients│
    │                            ["device-123"] = {         │
    │                              ConnectionId: "ABC123",  │
    │                              ...                      │
    │                            }                          │
    │                                                       │
    │  4. ClientConnected (broadcast to all)               │
    │◀──────────────────────────────────────────────────────┤
    │                                                       │
    │  5. ConnectedClientsList (to caller only)            │
    │◀──────────────────────────────────────────────────────┤
    │                                                       │
    │  ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─     │
    │                                                       │
    │  6. Connect to /chatHub (new connection)             │
    ├──────────────────────────────────────────────────────▶
    │                                                       │
    │  7. Connection Established (ConnectionId: "DEF456")  │
    │◀──────────────────────────────────────────────────────┤
    │                                                       │
    │  8. RegisterClient({ deviceId, deviceName, ... })    │
    ├──────────────────────────────────────────────────────▶
    │                                                       │
    │                                ChatHub._connectedClients│
    │                                ["device-123"] = {     │
    │                                  ConnectionId: "DEF456",│
    │                                  ...                  │
    │                                }                      │
    │                                                       │
    │  9. ClientConnected (broadcast to all in ChatHub)    │
    │◀──────────────────────────────────────────────────────┤
    │                                                       │
    ▼                                                       ▼
```

## Hub Isolation

Each hub maintains its own state:

```
DeviceHub Instance:
├── _connectedClients: { "device-123", "device-456", "device-789" }
├── _messageCounter: 42
└── Clients see only DeviceHub clients

ChatHub Instance:
├── _connectedClients: { "device-123", "device-999" }
├── _messageCounter: 17
└── Clients see only ChatHub clients

NotificationHub Instance:
├── _connectedClients: { "device-123", "device-456" }
├── _messageCounter: 8
└── Clients see only NotificationHub clients
```

**Note:** Same device (device-123) can be connected to multiple hubs simultaneously!

## Message Flow - Broadcast

```
┌──────────┐                ┌──────────┐                ┌──────────┐
│ Client A │                │DeviceHub │                │ Client B │
│device-123│                │          │                │device-456│
└────┬─────┘                └────┬─────┘                └────┬─────┘
     │                           │                           │
     │ SendMessage(              │                           │
     │   "device-123",           │                           │
     │   "Tablet 1",             │                           │
     │   "Hello!"                │                           │
     │ )                         │                           │
     ├──────────────────────────▶│                           │
     │                           │                           │
     │                           │ BaseHub.SendMessage()     │
     │                           │ creates MessageData       │
     │                           │ with counter++            │
     │                           │                           │
     │ ReceiveMessage(data)      │      ReceiveMessage(data) │
     │◀──────────────────────────┼──────────────────────────▶│
     │                           │                           │
     │        Both clients receive the same message          │
     │                           │                           │
     ▼                           ▼                           ▼
```

## Message Flow - Direct Message

```
┌──────────┐                ┌──────────┐                ┌──────────┐
│ Client A │                │DeviceHub │                │ Client B │
│device-123│                │          │                │device-456│
└────┬─────┘                └────┬─────┘                └────┬─────┘
     │                           │                           │
     │ SendMessageToClient(      │                           │
     │   "device-456",           │                           │
     │   "Private msg"           │                           │
     │ )                         │                           │
     ├──────────────────────────▶│                           │
     │                           │                           │
     │                           │ 1. Find device-456        │
     │                           │    in _connectedClients   │
     │                           │                           │
     │                           │ 2. Get ConnectionId       │
     │                           │                           │
     │                           │ 3. Send to that           │
     │                           │    ConnectionId only      │
     │                           │                           │
     │                           │      ReceiveMessage(data) │
     │                           ├──────────────────────────▶│
     │                           │                           │
     │         Only Client B receives the message            │
     │                           │                           │
     ▼                           ▼                           ▼
```

## Frontend Multi-Hub State Management

```
┌────────────────────────────────────────────────────────┐
│              SignalRService State                      │
├────────────────────────────────────────────────────────┤
│                                                        │
│  connections: Map {                                    │
│    "devices" → HubConnection (state: Connected)        │
│    "chat"    → HubConnection (state: Connected)        │
│  }                                                     │
│                                                        │
│  hubStates: Signal<Map> {                             │
│    "devices" → { name: "devices", state: "Connected" } │
│    "chat"    → { name: "chat", state: "Connected" }    │
│  }                                                     │
│                                                        │
│  connectedClients: Signal<DeviceInfo[]>               │
│    [unified list from all hubs]                       │
│                                                        │
│  messages: Signal<MessageData[]>                      │
│    [messages tagged with hubName]                     │
│                                                        │
└────────────────────────────────────────────────────────┘
```

## Code Reuse Statistics

**Before BaseHub:**
```
DeviceHub.cs:  165 lines (all logic duplicated)
ChatHub.cs:      9 lines (basic only)
Total:         174 lines
Duplication:   100% (if adding another hub)
```

**After BaseHub:**
```
BaseHub.cs:    175 lines (shared logic)
DeviceHub.cs:   34 lines (hub-specific)
ChatHub.cs:     45 lines (hub-specific + legacy)
Total:         254 lines
Duplication:     0% (no duplication)
```

**Savings per new hub:** ~165 lines of code!

## Thread Safety Visualization

```
Multiple Clients → Same Hub → ConcurrentDictionary

Client 1 ──┐
           ├──▶ DeviceHub._connectedClients (thread-safe)
Client 2 ──┤
           │
Client 3 ──┘

Operations:
• Add/Update: Thread-safe ✓
• Remove:     Thread-safe ✓
• Read:       Thread-safe ✓
• Counter:    Interlocked.Increment ✓
```

## Adding a New Hub - Quick Guide

1. **Create Hub Class:**
   ```csharp
   public class MyHub : BaseHub
   {
       private static readonly ConcurrentDictionary<string, ClientInfo> _clients = new();
       private static int _counter = 0;
       
       protected override ConcurrentDictionary<string, ClientInfo> ConnectedClients => _clients;
       protected override ref int GetMessageCounterRef() => ref _counter;
   }
   ```

2. **Register in Program.cs:**
   ```csharp
   app.MapHub<MyHub>("/myHub");
   ```

3. **Add to Frontend Config:**
   ```typescript
   { name: 'my', url: 'http://localhost:5000/myHub', autoConnect: true }
   ```

Done! Your hub now has full client management, messaging, and more!
