# Quick Reference Card - DeviceHub Refactoring

## 🚀 Quick Start

### Backend (Already Done) ✅
```bash
cd Backend
dotnet run
# Server runs on http://localhost:5000
```

### Frontend (Needs Update)
```typescript
// 1. Connect
await connection.start();

// 2. Register (NEW - Required!)
await connection.invoke('RegisterClient', {
    deviceId: 'device-001',      // Persistent ID
    deviceName: 'Tablet 1',
    deviceType: 'tablet',        // or 'manager'
    connectedAt: new Date(),
    connectionId: ''
});

// 3. Send message (Updated signature)
await connection.invoke('SendMessage', 
    'device-001',      // senderId
    'Tablet 1',        // senderName
    'Hello!'          // message
);
```

## 📋 Cheat Sheet

### Event Names (Changed!)

| Old | New |
|-----|-----|
| DeviceConnected | **ClientConnected** |
| DeviceDisconnected | **ClientDisconnected** |
| ConnectedDevicesList | **ConnectedClientsList** |
| ReceiveMessage | ReceiveMessage ✓ |

### Model Properties (Changed!)

**MessageData:**
| Old | New |
|-----|-----|
| DeviceId | **SenderId** |
| DeviceName | **SenderName** |

**ClientInfo (was DeviceInfo):**
| Property | Type | New? |
|----------|------|------|
| DeviceId | string | ✓ (now persistent) |
| DeviceName | string | ✓ |
| DeviceType | string | **NEW** |
| ConnectedAt | DateTime | ✓ |
| ConnectionId | string | **NEW** |

### Hub Methods

```typescript
// Register client (NEW - Required after connect)
RegisterClient(clientInfo: ClientInfo): void

// Get connected clients
GetConnectedClients(): void
// → Emits: ConnectedClientsList

// Send to all (signature changed)
SendMessage(senderId: string, senderName: string, message: string): void
// → Emits: ReceiveMessage

// Send to specific (uses DeviceId now)
SendMessageToClient(targetDeviceId: string, message: string): void
// → Emits: ReceiveMessage (to target only)
```

## 🔧 Frontend Migration Checklist

### Phase 1: Update Models
```typescript
// models/signalr.models.ts
export interface ClientInfo {
    deviceId: string;
    deviceName: string;
    deviceType: 'tablet' | 'manager';  // ADD
    connectedAt: Date;
    connectionId: string;              // ADD
}

export interface MessageData {
    id: number;
    senderId: string;        // RENAME from deviceId
    senderName: string;      // RENAME from deviceName
    message: string;
    timestamp: Date;
}
```

### Phase 2: Update Service
```typescript
// services/signalr.service.ts

// ADD: Persistent device ID
private getDeviceId(): string {
    let id = localStorage.getItem('deviceId');
    if (!id) {
        id = `device-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        localStorage.setItem('deviceId', id);
    }
    return id;
}

// UPDATE: Connection method
async startConnection(name: string, type: 'tablet' | 'manager') {
    await this.connection.start();
    
    // CALL RegisterClient
    await this.connection.invoke('RegisterClient', {
        deviceId: this.getDeviceId(),
        deviceName: name,
        deviceType: type,
        connectedAt: new Date(),
        connectionId: ''
    });
}

// UPDATE: Event handlers
setupEventHandlers() {
    this.connection.on('ClientConnected', (info) => { ... });     // CHANGE
    this.connection.on('ClientDisconnected', (info) => { ... });  // CHANGE
    this.connection.on('ConnectedClientsList', (list) => { ... }); // CHANGE
    this.connection.on('ReceiveMessage', (msg) => {
        // Use msg.senderId and msg.senderName  // CHANGE
    });
}

// UPDATE: Send method
async sendMessage(message: string) {
    await this.connection.invoke('SendMessage',
        this.getDeviceId(),      // ADD
        this.deviceName,         // ADD
        message
    );
}
```

### Phase 3: Update Component
```typescript
// component.ts

// UPDATE: Connection call
async connect() {
    await this.signalRService.startConnection(
        'Tablet 1',
        'tablet'  // ADD device type
    );
}

// UPDATE: Message display
displayMessage(msg: MessageData) {
    console.log(`From ${msg.senderName} (${msg.senderId}): ${msg.message}`);
    // Use senderName and senderId, not deviceName and deviceId
}
```

## 💡 Key Concepts

### Persistent vs Transient IDs

```
┌─────────────────────────────────────────────────┐
│ DeviceId (Persistent - Never Changes)          │
│ ┌─────────────────────────────────────────────┐ │
│ │ "device-001"                                │ │
│ └─────────────────────────────────────────────┘ │
│                                                 │
│ ConnectionId (Transient - Changes on Reconnect)│
│ ┌──────────────┐  ┌──────────────┐            │
│ │ "ABC123"     │→ │ "XYZ789"     │            │
│ │ (connect)    │  │ (reconnect)  │            │
│ └──────────────┘  └──────────────┘            │
└─────────────────────────────────────────────────┘
```

### Registration Flow

```
Old Way (Automatic):
connection.start() → Auto-registered ✗

New Way (Explicit):
connection.start() → RegisterClient() ✓
```

## 🎯 Common Patterns

### Pattern 1: Connect & Register
```typescript
async connectDevice() {
    // 1. Establish connection
    this.connection = new signalR.HubConnectionBuilder()
        .withUrl('http://localhost:5000/deviceHub')
        .build();
    
    // 2. Start connection
    await this.connection.start();
    
    // 3. Register client (NEW!)
    await this.connection.invoke('RegisterClient', {
        deviceId: this.getDeviceId(),
        deviceName: 'My Device',
        deviceType: 'tablet',
        connectedAt: new Date(),
        connectionId: ''
    });
}
```

### Pattern 2: Send Message
```typescript
async sendMessage(text: string) {
    await this.connection.invoke('SendMessage',
        this.getDeviceId(),    // Sender ID
        this.deviceName,       // Sender name
        text                   // Message
    );
}
```

### Pattern 3: Send Direct Message
```typescript
async sendDirect(targetDeviceId: string, text: string) {
    await this.connection.invoke('SendMessageToClient',
        targetDeviceId,  // Target's persistent ID
        text
    );
}
```

### Pattern 4: Handle Events
```typescript
this.connection.on('ClientConnected', (client: ClientInfo) => {
    console.log(`${client.deviceName} connected`);
    this.updateClientList();
});

this.connection.on('ReceiveMessage', (msg: MessageData) => {
    console.log(`${msg.senderName}: ${msg.message}`);
    this.messages.push(msg);
});
```

## 🐛 Troubleshooting

### Issue: "Connection works but no events received"
**Solution**: Did you call RegisterClient?
```typescript
await connection.invoke('RegisterClient', clientInfo);
```

### Issue: "Events not firing"
**Solution**: Update event names
```typescript
// Old
connection.on('DeviceConnected', ...)  ✗
// New
connection.on('ClientConnected', ...)  ✓
```

### Issue: "Message properties undefined"
**Solution**: Use new property names
```typescript
// Old
msg.deviceId, msg.deviceName  ✗
// New
msg.senderId, msg.senderName  ✓
```

### Issue: "SendMessage error"
**Solution**: Add senderId and senderName
```typescript
// Old
invoke('SendMessage', 'name', 'text')  ✗
// New
invoke('SendMessage', 'id', 'name', 'text')  ✓
```

## 📚 Documentation

| Need | See |
|------|-----|
| Complete guide | REFACTORING_GUIDE.md |
| Before/After | API_COMPARISON.md |
| Diagrams | ARCHITECTURE.md |
| Summary | REFACTORING_SUMMARY.md |

## ✅ Testing

```bash
# Backend (already working)
cd Backend && dotnet run

# Test health
curl http://localhost:5000/api/health

# Test broadcast
curl -X POST http://localhost:5000/api/devices/broadcast \
  -H "Content-Type: application/json" \
  -d '{"message":"Test"}'

# Run automated tests
./test-hub-refactoring.sh
```

## 🚦 Status Indicator

| Component | Status |
|-----------|--------|
| Backend | ✅ Complete |
| Documentation | ✅ Complete |
| Frontend | ⚠️ Update Required |

---

**Remember**: The frontend MUST be updated to work with the new backend!
