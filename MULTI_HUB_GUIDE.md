# Multi-Hub Architecture Guide

## Overview

The SignalR backend now supports multiple hubs with shared functionality through a **BaseHub** architecture. This allows you to easily add new hubs while maintaining consistency and avoiding code duplication.

## Architecture

### BaseHub (Abstract Class)

The `BaseHub` class provides common functionality for all SignalR hubs:

```csharp
public abstract class BaseHub : Hub
{
    protected abstract ConcurrentDictionary<string, ClientInfo> ConnectedClients { get; }
    protected abstract ref int GetMessageCounterRef();
    
    // Common methods:
    public virtual async Task RegisterClient(ClientInfo clientInfo)
    public virtual async Task GetConnectedClients()
    public virtual async Task SendMessage(string senderId, string senderName, string message)
    public virtual async Task SendMessageToClient(string targetDeviceId, string message)
    public override async Task OnDisconnectedAsync(Exception? exception)
    
    // Hook methods for customization:
    protected virtual void OnClientRegistered(ClientInfo client)
    protected virtual void OnMessageSent(MessageData message)
    protected virtual void OnDirectMessageSent(MessageData message, string targetDeviceId)
    protected virtual void OnClientDisconnected(ClientInfo client)
}
```

### Hub Implementations

#### 1. DeviceHub

Specialized for device management:

```csharp
public class DeviceHub : BaseHub
{
    private static readonly ConcurrentDictionary<string, ClientInfo> _connectedClients = new();
    private static int _messageCounter = 0;

    protected override ConcurrentDictionary<string, ClientInfo> ConnectedClients => _connectedClients;
    protected override ref int GetMessageCounterRef() => ref _messageCounter;
    
    // Add device-specific methods here if needed
}
```

**Endpoint:** `http://localhost:5000/deviceHub`

#### 2. ChatHub

Specialized for chat communication:

```csharp
public class ChatHub : BaseHub
{
    private static readonly ConcurrentDictionary<string, ClientInfo> _connectedClients = new();
    private static int _messageCounter = 0;

    protected override ConcurrentDictionary<string, ClientInfo> ConnectedClients => _connectedClients;
    protected override ref int GetMessageCounterRef() => ref _messageCounter;
    
    // Legacy support for old NewMessage method
    public async Task NewMessage(long username, string message)
    
    // Add chat-specific methods here if needed
}
```

**Endpoint:** `http://localhost:5000/chatHub`

## Shared Models

### ClientInfo

Represents a connected client:

```csharp
public class ClientInfo
{
    public string DeviceId { get; set; }      // Persistent ID
    public string DeviceName { get; set; }    // Display name
    public string DeviceType { get; set; }    // "tablet" or "manager"
    public DateTime ConnectedAt { get; set; } // Connection timestamp
    public string ConnectionId { get; set; }  // SignalR connection (changes on reconnect)
}
```

### MessageData

Represents a message:

```csharp
public class MessageData
{
    public int Id { get; set; }            // Incremental ID
    public string SenderId { get; set; }   // Sender's DeviceId
    public string SenderName { get; set; } // Sender's display name
    public string Message { get; set; }    // Message content
    public DateTime Timestamp { get; set; } // When sent
}
```

## Common Hub Methods

All hubs inheriting from BaseHub support these methods:

### 1. RegisterClient

Register a client after connecting:

```typescript
await connection.invoke('RegisterClient', {
    deviceId: 'device-123',
    deviceName: 'Tablet 1',
    deviceType: 'tablet',
    connectedAt: new Date()
});
```

**Server Response:**
- Broadcasts `ClientConnected` to all clients
- Sends `ConnectedClientsList` to caller

### 2. GetConnectedClients

Request the list of connected clients:

```typescript
await connection.invoke('GetConnectedClients');
```

**Server Response:**
- Sends `ConnectedClientsList` to caller

### 3. SendMessage

Broadcast a message to all clients:

```typescript
await connection.invoke('SendMessage', 'device-123', 'Tablet 1', 'Hello everyone!');
```

**Server Response:**
- Broadcasts `ReceiveMessage` to all clients

### 4. SendMessageToClient

Send a message to a specific client:

```typescript
await connection.invoke('SendMessageToClient', 'target-device-456', 'Private message');
```

**Server Response:**
- Sends `ReceiveMessage` to target client only

## Hub Events

All hubs emit these events:

| Event | Data | Description |
|-------|------|-------------|
| `ClientConnected` | `ClientInfo` | New client registered |
| `ClientDisconnected` | `ClientInfo` | Client disconnected |
| `ConnectedClientsList` | `ClientInfo[]` | List of all connected clients |
| `ReceiveMessage` | `MessageData` | Message received |

## Creating a New Hub

To create a new hub, follow these steps:

### 1. Create the Hub Class

```csharp
using Microsoft.AspNetCore.SignalR;
using SignalRBackend.Models;
using System.Collections.Concurrent;

namespace SignalRBackend.Hubs;

public class NotificationHub : BaseHub
{
    private static readonly ConcurrentDictionary<string, ClientInfo> _connectedClients = new();
    private static int _messageCounter = 0;

    protected override ConcurrentDictionary<string, ClientInfo> ConnectedClients => _connectedClients;
    protected override ref int GetMessageCounterRef() => ref _messageCounter;
    
    // Add notification-specific methods here
    public async Task SendNotification(string title, string message)
    {
        await Clients.All.SendAsync("ReceiveNotification", new 
        { 
            Title = title, 
            Message = message, 
            Timestamp = DateTime.UtcNow 
        });
    }
    
    // Optional: Override hook methods
    protected override void OnClientRegistered(ClientInfo client)
    {
        Console.WriteLine($"[NotificationHub] Client registered: {client.DeviceName}");
    }
}
```

### 2. Register the Hub in Program.cs

```csharp
app.MapHub<NotificationHub>("/notificationHub");
```

### 3. Update Frontend Configuration

```typescript
export const DEFAULT_HUB_CONFIGS: HubConfig[] = [
    { name: 'devices', url: 'http://localhost:5000/deviceHub', autoConnect: true },
    { name: 'chat', url: 'http://localhost:5000/chatHub', autoConnect: false },
    { name: 'notifications', url: 'http://localhost:5000/notificationHub', autoConnect: true },
];
```

## Frontend Usage

### Connecting to Multiple Hubs

```typescript
import { SignalRService } from './services/signalr.service';

// In component
constructor(private signalRService: SignalRService) {}

async ngOnInit() {
    const identity: ClientIdentity = {
        clientId: this.getDeviceId(),
        clientName: 'My Device',
        clientType: 'tablet',
        createdAt: new Date()
    };
    
    // Connect to all configured hubs
    await this.signalRService.connect(identity);
}
```

### Sending Messages to Specific Hubs

```typescript
// Send to devices hub
await this.signalRService.sendMessage('devices', 'Hello from device hub!');

// Send to chat hub
await this.signalRService.sendMessage('chat', 'Hello from chat hub!');
```

### Receiving Messages from All Hubs

The service automatically handles messages from all hubs:

```typescript
// Subscribe to messages from all hubs
this.signalRService.messages$.subscribe(messages => {
    messages.forEach(msg => {
        console.log(`Message from ${msg.hubName}: ${msg.message}`);
    });
});
```

## Benefits

1. **Code Reusability**: Common logic in BaseHub
2. **Consistency**: All hubs work the same way
3. **Maintainability**: Bug fixes apply to all hubs
4. **Scalability**: Easy to add new hubs
5. **Thread Safety**: Built-in with ConcurrentDictionary
6. **Flexibility**: Override methods for custom behavior

## Testing

### Test with curl

```bash
# Check backend health
curl http://localhost:5000/api/health

# Test broadcast (works for both hubs)
curl -X POST http://localhost:5000/api/devices/broadcast \
  -H "Content-Type: application/json" \
  -d '{"message":"Test message"}'
```

### Test with Frontend

1. Start backend: `cd Backend && dotnet run`
2. Start frontend: `cd Frontend && npm start`
3. Open browser at `http://localhost:4200`
4. Enable multiple hubs in the configuration
5. Connect and test messaging

## Hub Isolation

Each hub has its own:
- Client collection (separate `_connectedClients`)
- Message counter (separate `_messageCounter`)
- Connection tracking
- Message history

Clients connected to DeviceHub don't see clients from ChatHub and vice versa.

## Advanced Customization

### Custom Events

Add hub-specific events by calling `Clients.All.SendAsync`:

```csharp
protected override void OnClientRegistered(ClientInfo client)
{
    // Send custom event
    await Clients.All.SendAsync("DeviceStatusChanged", new {
        DeviceId = client.DeviceId,
        Status = "Online"
    });
}
```

### Custom Methods

Add hub-specific methods:

```csharp
public async Task BroadcastAlert(string alertType, string message)
{
    await Clients.All.SendAsync("AlertReceived", new {
        Type = alertType,
        Message = message,
        Timestamp = DateTime.UtcNow
    });
}
```

### Filtering

Override methods to add filtering logic:

```csharp
public override async Task SendMessage(string senderId, string senderName, string message)
{
    // Only allow managers to broadcast
    var client = ConnectedClients.Values.FirstOrDefault(c => c.ConnectionId == Context.ConnectionId);
    if (client?.DeviceType == "manager")
    {
        await base.SendMessage(senderId, senderName, message);
    }
}
```

## Troubleshooting

### Hub not receiving messages

- Verify the hub is registered in `Program.cs`
- Check the URL matches the frontend configuration
- Ensure client called `RegisterClient` after connecting

### Messages appearing in wrong hub

- Each hub has separate client collections
- Verify you're calling the correct hub name in frontend
- Check `hubName` property in received messages

### Backend not building

- Ensure all using statements are correct:
  - `using SignalRBackend.Models;`
  - `using System.Collections.Concurrent;`
- Verify `GetMessageCounterRef()` returns `ref int`

## Migration from Old Code

If you have existing hubs without BaseHub:

1. Extract static fields (clients, counter)
2. Implement abstract properties
3. Remove duplicated methods
4. Add hook method overrides if needed
5. Test thoroughly

See `DeviceHub.cs` and `ChatHub.cs` for examples.
