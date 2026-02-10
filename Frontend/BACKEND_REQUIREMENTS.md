# Backend Requirements - Private Messaging Support

## Overview
Questo documento descrive le modifiche necessarie all'Hub SignalR per supportare la messaggistica privata tra tablet, oltre alle funzionalità broadcast esistenti.

## Modifiche richieste al DevicesHub

### 1. MessageData Model Extension
Il modello `MessageData` deve includere un campo opzionale per identificare il destinatario dei messaggi privati:

```csharp
public class MessageData
{
    public string SenderId { get; set; }
    public string SenderName { get; set; }
    public string Message { get; set; }
    public DateTime Timestamp { get; set; }
    public string TargetClientId { get; set; } // NUOVO: null per broadcast, deviceId per privati
}
```

### 2. Server Method - SendMessageToClient
Aggiungere un nuovo metodo per inviare messaggi privati a un client specifico:

```csharp
public async Task SendMessageToClient(string targetDeviceId, string message)
{
    var senderInfo = _connectedClients.GetValueOrDefault(Context.ConnectionId);
    if (senderInfo == null) return;

    var targetConnectionId = _connectedClients
        .FirstOrDefault(c => c.Value.DeviceId == targetDeviceId)
        .Key;

    if (string.IsNullOrEmpty(targetConnectionId))
    {
        // Target client non trovato - gestire errore
        return;
    }

    var messageData = new MessageData
    {
        SenderId = senderInfo.DeviceId,
        SenderName = senderInfo.DeviceName,
        Message = message,
        Timestamp = DateTime.Now,
        TargetClientId = targetDeviceId // IMPORTANTE: indica che è privato
    };

    // Invia solo al mittente e al destinatario
    await Clients.Clients(Context.ConnectionId, targetConnectionId)
        .SendAsync("ReceiveMessage", messageData);
}
```

### 3. Update Existing SendMessage Method
Il metodo broadcast esistente deve impostare `TargetClientId = null`:

```csharp
public async Task SendMessage(string message)
{
    var senderInfo = _connectedClients.GetValueOrDefault(Context.ConnectionId);
    if (senderInfo == null) return;

    var messageData = new MessageData
    {
        SenderId = senderInfo.DeviceId,
        SenderName = senderInfo.DeviceName,
        Message = message,
        Timestamp = DateTime.Now,
        TargetClientId = null // IMPORTANTE: null indica broadcast
    };

    await Clients.All.SendAsync("ReceiveMessage", messageData);
}
```

## Frontend Integration

### TypeScript Interface (già implementato)
```typescript
export interface MessageData {
  senderId: string;
  senderName: string;
  message: string;
  timestamp: Date;
  targetClientId?: string; // Opzionale - presente solo per messaggi privati
}
```

### Client Usage (già implementato)

#### Sending Private Message
```typescript
await signalRService.sendMessageToClient('devices', targetClientId, 'Messaggio privato');
```

#### Sending Broadcast Message
```typescript
await signalRService.sendMessage('devices', 'Messaggio pubblico');
```

#### Detecting Message Type
```typescript
isPrivateMessage(msg: MessageData): boolean {
  return !!msg.targetClientId;
}
```

## UI Features Implemented

### Tablet Component
- ✅ Recipient selector con bottoni (📢 Tutti / 🔒 Nome Tablet)
- ✅ Icone 🔒/📢 su ogni messaggio per indicare privato/pubblico
- ✅ Placeholder dinamico nell'input ("Messaggio privato a..." / "Messaggio pubblico...")
- ✅ Solo altri tablet visibili come destinatari (manager esclusi)
- ✅ Auto-esclusione del client corrente dalla lista destinatari

### Manager Component
- ✅ Icone 🔒/📢 nel log messaggi
- ✅ Funzionalità esistente di messaggistica privata verso i client

## Testing Checklist

### Test Scenario 1: Private Message Between Tablets
1. Aprire 2 tab con `/tablet` (Tablet A e Tablet B)
2. Su Tablet A, selezionare Tablet B come destinatario
3. Inviare messaggio "Ciao Tablet B"
4. ✅ Verificare che solo Tablet A e B vedano il messaggio
5. ✅ Verificare icona 🔒 sul messaggio

### Test Scenario 2: Broadcast Message
1. Con multiple tab `/tablet` aperte
2. Non selezionare alcun destinatario (📢 Tutti attivo)
3. Inviare messaggio "Ciao a tutti"
4. ✅ Verificare che tutti i client vedano il messaggio
5. ✅ Verificare icona 📢 sul messaggio

### Test Scenario 3: Manager to Tablet Private Message
1. Aprire `/manager` e `/tablet`
2. Dal manager, selezionare il tablet dalla lista
3. Inviare messaggio privato
4. ✅ Verificare che solo manager e tablet selezionato vedano il messaggio
5. ✅ Verificare icona 🔒

### Test Scenario 4: Mixed Messages
1. Inviare mix di messaggi pubblici e privati
2. ✅ Verificare corretta visualizzazione icone
3. ✅ Verificare corretto routing (privati solo a destinatari, pubblici a tutti)

## Security Considerations

### Backend Validation
- Validare che `targetDeviceId` esista prima di inviare
- Non permettere spoofing del `senderId` (usare sempre `Context.ConnectionId`)
- Sanitizzare il contenuto dei messaggi se necessario

### Frontend Validation
- Verificare che il recipient selezionato esista nella lista connectedClients
- Gestire il caso in cui il destinatario si disconnetta mentre si scrive

## Future Enhancements
- Notifiche visive per nuovi messaggi privati
- Badge con conteggio messaggi non letti
- Cronologia messaggi privati separata da quella pubblica
- Typing indicators per messaggi privati
- Conferma di lettura
