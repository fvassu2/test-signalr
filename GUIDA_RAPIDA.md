# SignalR Test Project - Quick Start Guide

## 🚀 Avvio Rapido / Quick Start

### Backend
```bash
cd Backend
dotnet run
```
Il backend sarà disponibile su `http://localhost:5000`

### Frontend
```bash
cd Frontend
npm install  # solo la prima volta
npm start
```
Il frontend sarà disponibile su `http://localhost:4200`

## 📊 Test delle Funzionalità

### 1. Simulazione Multi-Dispositivo
1. Apri il browser su `http://localhost:4200`
2. Imposta il numero di dispositivi (es. 3)
3. Clicca "Connetti Dispositivi"
4. Vedrai tutti i dispositivi connettersi in tempo reale

### 2. Messaging Real-time
1. Dopo aver connesso i dispositivi
2. Scrivi un messaggio nel campo di input
3. Clicca "Invia da Tutti i Dispositivi"
4. Vedrai i messaggi apparire in tempo reale da tutti i dispositivi

### 3. Test REST API
Puoi inviare messaggi anche tramite REST API:

```bash
curl -X POST http://localhost:5000/api/devices/broadcast \
  -H "Content-Type: application/json" \
  -d '{"message":"Messaggio da API REST"}'
```

Tutti i client connessi riceveranno il messaggio in tempo reale.

### 4. Invio Messaggio da Dispositivo Singolo
1. Clicca sul pulsante "Invia Messaggio" su un dispositivo specifico
2. Solo quel dispositivo invierà il messaggio

## 🔍 Cosa Osservare

### Nel Browser
- **Stato Connessione**: Mostra lo stato della connessione SignalR
- **Dispositivi Simulati**: Lista dei dispositivi creati dal client
- **Dispositivi Connessi Totali**: Tutti i dispositivi connessi al server (inclusi altri browser)
- **Messaggi**: Contatore dei messaggi ricevuti

### Console del Browser (F12)
- Puoi vedere i log di SignalR
- Eventi di connessione/disconnessione
- Messaggi ricevuti in tempo reale

### Console del Backend
- Richieste HTTP
- Connessioni SignalR
- Eventi hub

## 📝 Funzionalità SignalR Implementate

### Hub Methods (Server)
- `SendMessage(deviceName, message)` - Broadcast a tutti
- `SendMessageToDevice(targetDeviceId, message)` - Messaggio diretto
- `BroadcastDeviceStatus(deviceName, status)` - Broadcast stato
- `GetConnectedDevices()` - Lista dispositivi connessi

### Hub Events (Client riceve)
- `DeviceConnected` - Nuova connessione
- `DeviceDisconnected` - Disconnessione
- `ConnectedDevicesList` - Lista completa dispositivi
- `ReceiveMessage` - Ricezione messaggio
- `DeviceStatusUpdate` - Aggiornamento stato
- `ReceiveNotification` - Notifica

### REST API Endpoints
- `POST /api/devices/broadcast` - Broadcast messaggio
- `POST /api/devices/notify` - Invia notifica
- `GET /api/devices/status` - Stato server
- `GET /api/health` - Health check

## 🧪 Test Avanzati

### Test con Browser Multipli
1. Apri il progetto in più finestre/browser
2. Connetti dispositivi in ciascuna finestra
3. Invia messaggi da una finestra
4. Vedrai i messaggi apparire in tutte le finestre in tempo reale

### Test di Disconnessione
1. Connetti alcuni dispositivi
2. Clicca "Disconnetti Tutti"
3. Osserva come i dispositivi vengono rimossi dalla lista in tempo reale

### Test di Riconnessione Automatica
1. Connetti i dispositivi
2. Ferma il backend (Ctrl+C)
3. Riavvia il backend
4. SignalR si riconnetterà automaticamente

## 🎯 Obiettivi di Apprendimento

Questo progetto dimostra:
- ✅ Configurazione SignalR in ASP.NET Core
- ✅ Client SignalR in Angular/TypeScript
- ✅ Gestione connessioni multiple simultanee
- ✅ Messaging bidirezionale real-time
- ✅ Integrazione REST API con SignalR
- ✅ Gestione stato con RxJS
- ✅ CORS configuration
- ✅ Riconnessione automatica
- ✅ UI reattiva con Angular

## 🔧 Personalizzazioni

### Cambiare il Numero di Dispositivi
Nel frontend, puoi modificare il campo "Numero di dispositivi" (min: 1, max: 10)

### Cambiare la Porta del Backend
Modifica `Backend/appsettings.json`:
```json
"Urls": "http://localhost:5000;https://localhost:5001"
```

Poi aggiorna anche `Frontend/src/app/services/signalr.service.ts`:
```typescript
private hubUrl = 'http://localhost:5000/deviceHub';
```

## 📚 Risorse Utili

- [ASP.NET Core SignalR Documentation](https://docs.microsoft.com/en-us/aspnet/core/signalr/)
- [SignalR JavaScript Client](https://docs.microsoft.com/en-us/aspnet/core/signalr/javascript-client)
- [Angular Documentation](https://angular.io/docs)
- [RxJS Documentation](https://rxjs.dev/)

## 🐛 Troubleshooting

### Il frontend non si connette
- Verifica che il backend sia in esecuzione
- Controlla la console del browser per errori
- Verifica che CORS sia configurato correttamente

### Errori di compilazione TypeScript
```bash
cd Frontend
rm -rf node_modules package-lock.json
npm install
```

### Errori di build .NET
```bash
cd Backend
dotnet clean
dotnet restore
dotnet build
```

## ✨ Prossimi Passi

Possibili estensioni del progetto:
- Aggiungere autenticazione con JWT
- Implementare gruppi SignalR
- Aggiungere persistenza messaggi (database)
- Implementare notifiche push
- Aggiungere unit tests
- Dockerizzare il progetto
- Aggiungere logging avanzato

---

**Buon divertimento con SignalR! 🚀**
