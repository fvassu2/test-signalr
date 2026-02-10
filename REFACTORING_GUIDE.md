# DeviceHub Refactoring Documentation

## Overview

The DeviceHub has been refactored to support a new Angular frontend with improved client management, persistent device IDs, and thread-safe operations.

## Key Changes

### 1. Client Management

**Before:**
- Used ConnectionId as the device identifier
- ConnectionId changes on every reconnect
- Automatic registration on connection

**After:**
- Uses persistent DeviceId (doesn't change on reconnect)
- ConnectionId is tracked separately and updated on reconnect
- Explicit registration via RegisterClient method
- Clients must call RegisterClient after connecting

### 2. Thread Safety

**Before:**
- Used regular Dictionary (not thread-safe)

**After:**
- Uses ConcurrentDictionary for thread-safe operations
- Uses Interlocked.Increment for message counter

### 3. Data Models

#### ClientInfo (previously DeviceInfo)

```csharp
public class ClientInfo
{
    public string DeviceId { get; set; }        // Persistent identifier
    public string DeviceName { get; set; }      // Display name
    public string DeviceType { get; set; }      // "tablet" or "manager"
    public DateTime ConnectedAt { get; set; }   // Connection timestamp
    public string ConnectionId { get; set; }    // Current SignalR connection (changes on reconnect)
}
```

#### MessageData

```csharp
public class MessageData
{
    public int Id { get; set; }              // Incremental message ID
    public string SenderId { get; set; }     // Sender's DeviceId (was DeviceId)
    public string SenderName { get; set; }   // Sender's name (was DeviceName)
    public string Message { get; set; }      // Message content
    public DateTime Timestamp { get; set; }  // Message timestamp
}
```

## Hub Methods (Client → Server)

### RegisterClient(ClientInfo clientInfo)

Register a client with the hub after connecting.

**Client must call this after establishing SignalR connection.**

```typescript
// Angular/TypeScript example
const clientInfo = {
    deviceId: 'unique-device-id-123',  // Persistent ID (e.g., from localStorage)
    deviceName: 'Tablet 1',
    deviceType: 'tablet',  // or 'manager'
    connectedAt: new Date(),
    connectionId: ''  // Will be set by server
};

await hubConnection.invoke('RegisterClient', clientInfo);
```

**Server Response:**
- Broadcasts `ClientConnected` event to all clients
- Sends `ConnectedClientsList` to the caller

### GetConnectedClients()

Request the list of all connected clients.

```typescript
await hubConnection.invoke('GetConnectedClients');
```

**Server Response:**
- Sends `ConnectedClientsList` event to caller with array of ClientInfo

### SendMessage(senderId, senderName, message)

Broadcast a message to all connected clients.

**Parameters:**
- `senderId`: The sender's DeviceId
- `senderName`: The sender's display name
- `message`: The message content

```typescript
await hubConnection.invoke('SendMessage', 'device-123', 'Tablet 1', 'Hello everyone!');
```

**Server Response:**
- Broadcasts `ReceiveMessage` event to all clients with MessageData

### SendMessageToClient(targetDeviceId, message)

Send a message to a specific client using their DeviceId.

**Parameters:**
- `targetDeviceId`: The target client's DeviceId (not ConnectionId)
- `message`: The message content

```typescript
await hubConnection.invoke('SendMessageToClient', 'device-456', 'Private message');
```

**Server Response:**
- Sends `ReceiveMessage` event only to the target client

## Hub Events (Server → Client)

### ClientConnected(ClientInfo)

Emitted when a new client registers.

```typescript
hubConnection.on('ClientConnected', (clientInfo: ClientInfo) => {
    console.log('New client connected:', clientInfo);
});
```

### ClientDisconnected(ClientInfo)

Emitted when a client disconnects.

```typescript
hubConnection.on('ClientDisconnected', (clientInfo: ClientInfo) => {
    console.log('Client disconnected:', clientInfo);
});
```

### ConnectedClientsList(ClientInfo[])

Emitted with the list of all connected clients.

```typescript
hubConnection.on('ConnectedClientsList', (clients: ClientInfo[]) => {
    console.log('Connected clients:', clients);
});
```

### ReceiveMessage(MessageData)

Emitted when a message is received.

```typescript
hubConnection.on('ReceiveMessage', (messageData: MessageData) => {
    console.log('Message received:', messageData);
});
```

## Migration Guide

### Angular Frontend Updates Required

#### 1. Update Models

```typescript
// models/signalr.models.ts
export interface ClientInfo {
    deviceId: string;        // Changed from deviceId (now persistent)
    deviceName: string;
    deviceType: 'tablet' | 'manager';  // NEW
    connectedAt: Date;
    connectionId: string;    // NEW (tracked separately)
}

export interface MessageData {
    id: number;
    senderId: string;        // Changed from deviceId
    senderName: string;      // Changed from deviceName
    message: string;
    timestamp: Date;
}
```

#### 2. Update SignalR Service

```typescript
// services/signalr.service.ts

// Generate or retrieve persistent device ID
private getDeviceId(): string {
    let deviceId = localStorage.getItem('deviceId');
    if (!deviceId) {
        deviceId = `device-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        localStorage.setItem('deviceId', deviceId);
    }
    return deviceId;
}

// Register client after connection
public async startConnection(deviceName: string, deviceType: 'tablet' | 'manager'): Promise<void> {
    // ... establish connection ...
    
    await this.hubConnection.start();
    
    // Register the client
    const clientInfo = {
        deviceId: this.getDeviceId(),
        deviceName: deviceName,
        deviceType: deviceType,
        connectedAt: new Date(),
        connectionId: ''
    };
    
    await this.hubConnection.invoke('RegisterClient', clientInfo);
}

// Update event handlers
private setupEventHandlers(): void {
    // Changed from 'DeviceConnected'
    this.hubConnection.on('ClientConnected', (clientInfo: ClientInfo) => {
        console.log('Client connected:', clientInfo);
        // Update your client list
    });

    // Changed from 'DeviceDisconnected'
    this.hubConnection.on('ClientDisconnected', (clientInfo: ClientInfo) => {
        console.log('Client disconnected:', clientInfo);
        // Update your client list
    });

    // Changed from 'ConnectedDevicesList'
    this.hubConnection.on('ConnectedClientsList', (clients: ClientInfo[]) => {
        console.log('Connected clients:', clients);
        // Update your client list
    });

    this.hubConnection.on('ReceiveMessage', (message: MessageData) => {
        console.log('Message received:', message);
        // Note: use message.senderId and message.senderName
    });
}

// Update send message method
public async sendMessage(message: string): Promise<void> {
    const deviceId = this.getDeviceId();
    const deviceName = this.currentDeviceName; // Store this when registering
    
    await this.hubConnection.invoke('SendMessage', deviceId, deviceName, message);
}
```

#### 3. Update Component

```typescript
// app.component.ts

async connectDevice(deviceName: string, deviceType: 'tablet' | 'manager'): Promise<void> {
    await this.signalRService.startConnection(deviceName, deviceType);
}
```

## Benefits of Refactoring

1. **Persistent Identity**: DeviceId remains the same across reconnections
2. **Thread Safety**: ConcurrentDictionary prevents race conditions
3. **Explicit Registration**: Better control over client lifecycle
4. **Device Types**: Distinguish between tablets and managers
5. **Flexible Messaging**: Send to specific devices using persistent DeviceId
6. **Reconnection Support**: Automatic handling of connection ID changes

## Testing

### Manual Testing Steps

1. **Start Backend:**
   ```bash
   cd Backend
   dotnet run
   ```

2. **Test with Angular Client:**
   - Connect client with RegisterClient
   - Verify ClientConnected event received by all
   - Send messages and verify ReceiveMessage events
   - Disconnect and verify ClientDisconnected event
   - Reconnect with same DeviceId and verify it works

3. **Test REST API:**
   ```bash
   curl -X POST http://localhost:5000/api/devices/broadcast \
     -H "Content-Type: application/json" \
     -d '{"message":"Test from API"}'
   ```

## Backward Compatibility

**Breaking Changes:**
- Event names changed (DeviceConnected → ClientConnected, etc.)
- Model property names changed (DeviceId → SenderId in MessageData)
- Clients must explicitly call RegisterClient
- SendMessage now requires senderId and senderName parameters

**Migration Required:**
- Frontend Angular application must be updated
- Cannot use old client with new backend

## Support

For questions or issues, refer to:
- README.md
- GUIDA_RAPIDA.md
- Code comments in DeviceHub.cs
