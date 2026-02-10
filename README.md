# Test SignalR - Progetto Demo ASP.NET Core + Angular

Questo progetto dimostra l'utilizzo di SignalR ASP.NET Core per gestire connessioni in tempo reale tra un backend e un client Angular TypeScript che simula più dispositivi connessi simultaneamente.

## 🎯 Obiettivo

Comprendere il funzionamento di SignalR ASP.NET Core attraverso un progetto pratico che include:
- Backend ASP.NET Core con SignalR Hub e REST API
- Client Angular TypeScript che simula connessioni simultanee di più dispositivi
- Comunicazione bidirezionale in tempo reale
- Gestione dello stato delle connessioni

## 📋 Requisiti

- **.NET 10.0 SDK** o superiore
- **Node.js 18+** e **npm**
- **Angular CLI** (`npm install -g @angular/cli`)

## 🚀 Installazione e Avvio

### Backend (ASP.NET Core)

```bash
# Naviga nella directory Backend
cd Backend

# Ripristina le dipendenze (opzionale, già fatto automaticamente)
dotnet restore

# Avvia il server
dotnet run
```

Il backend sarà disponibile su:
- HTTP: `http://localhost:5000`
- HTTPS: `https://localhost:5001`
- SignalR Hub: `http://localhost:5000/deviceHub`

### Frontend (Angular)

```bash
# Naviga nella directory Frontend
cd Frontend

# Installa le dipendenze
npm install

# Avvia il server di sviluppo
npm start
# oppure
ng serve
```

Il frontend sarà disponibile su: `http://localhost:4200`

## 📖 Struttura del Progetto

### Backend (`/Backend`)

```
Backend/
├── Controllers/
│   └── DevicesController.cs    # REST API controller
├── Hubs/
│   └── DeviceHub.cs            # SignalR Hub principale
├── Program.cs                   # Configurazione dell'applicazione
└── appsettings.json            # Configurazione
```

**Caratteristiche del Backend:**
- **DeviceHub**: Hub SignalR che gestisce connessioni dispositivi
- **DevicesController**: API REST per broadcast e notifiche
- **CORS configurato** per permettere connessioni da `http://localhost:4200`
- **Gestione automatica** della lista dei dispositivi connessi

**Metodi SignalR Hub disponibili:**
- `SendMessage(deviceName, message)`: Invia messaggio broadcast a tutti
- `SendMessageToDevice(targetDeviceId, message)`: Invia messaggio a dispositivo specifico
- `BroadcastDeviceStatus(deviceName, status)`: Broadcast dello stato del dispositivo
- `GetConnectedDevices()`: Ottiene lista dispositivi connessi

**Eventi SignalR (client riceve):**
- `DeviceConnected`: Notifica nuova connessione
- `DeviceDisconnected`: Notifica disconnessione
- `ConnectedDevicesList`: Lista completa dispositivi connessi
- `ReceiveMessage`: Ricezione messaggio
- `DeviceStatusUpdate`: Aggiornamento stato dispositivo
- `ReceiveNotification`: Ricezione notifica

**API REST disponibili:**
- `POST /api/devices/broadcast`: Broadcast messaggio via REST API
- `POST /api/devices/notify`: Invia notifica a tutti i dispositivi
- `GET /api/devices/status`: Stato del server
- `GET /api/health`: Health check

### Frontend (`/Frontend`)

```
Frontend/src/app/
├── models/
│   └── signalr.models.ts       # Modelli TypeScript
├── services/
│   └── signalr.service.ts      # Service per SignalR
├── app.ts                       # Componente principale
├── app.html                     # Template HTML
└── app.css                      # Stili CSS
```

**Caratteristiche del Frontend:**
- **Simulazione multi-dispositivo**: Connette N dispositivi contemporaneamente
- **Real-time messaging**: Invia e riceve messaggi in tempo reale
- **Monitoraggio connessioni**: Visualizza tutti i dispositivi connessi al server
- **UI intuitiva**: Interfaccia moderna e responsive
- **Gestione stato**: Observable RxJS per aggiornamenti real-time

## 🎮 Come Usare

1. **Avvia il Backend** (vedi sezione Installazione)
2. **Avvia il Frontend** in un nuovo terminale
3. **Apri il browser** su `http://localhost:4200`
4. **Configura il numero di dispositivi** (default: 3)
5. **Clicca "Connetti Dispositivi"** per simulare le connessioni
6. **Invia messaggi** da tutti i dispositivi o da uno specifico
7. **Osserva in tempo reale**:
   - Lista dispositivi connessi
   - Messaggi broadcast
   - Stato delle connessioni

### Test delle Funzionalità

#### 1. Connessioni Multiple Simultanee
- Imposta numero dispositivi (es. 5)
- Clicca "Connetti Dispositivi"
- Verifica che tutti si connettano correttamente
- Osserva la lista "Tutti i Dispositivi Connessi al Server"

#### 2. Messaging Real-time
- Scrivi un messaggio nel campo di input
- Clicca "Invia da Tutti i Dispositivi"
- Tutti i dispositivi invieranno il messaggio
- Vedrai i messaggi apparire in tempo reale

#### 3. Messaggi Singoli
- Clicca "Invia Messaggio" su un dispositivo specifico
- Solo quel dispositivo invierà il messaggio

#### 4. REST API Broadcast
```bash
# Da terminale, invia un messaggio via REST API
curl -X POST http://localhost:5000/api/devices/broadcast \
  -H "Content-Type: application/json" \
  -d '{"message":"Messaggio da API REST"}'

# Tutti i client connessi riceveranno il messaggio
```

## 🔧 Funzionalità Tecniche

### SignalR Features Implementate

- **Hub-based communication**: Comunicazione centralizzata tramite Hub
- **Automatic reconnection**: Riconnessione automatica in caso di disconnessione
- **Connection management**: Gestione automatica delle connessioni
- **Broadcast messaging**: Invio messaggi a tutti i client
- **Group messaging**: Possibilità di inviare a gruppi specifici
- **Client-to-client**: Comunicazione tra client tramite hub

### Gestione Connessioni

- **OnConnectedAsync**: Gestisce nuove connessioni
- **OnDisconnectedAsync**: Gestisce disconnessioni
- **ConnectionId**: ID univoco per ogni connessione
- **Connection tracking**: Tracciamento di tutti i dispositivi connessi

### CORS Configuration

Il backend è configurato per accettare connessioni da:
- `http://localhost:4200` (Angular dev server)

Per modificare, vedi `Program.cs` nel backend.

## 📚 Risorse

- [ASP.NET Core SignalR Documentation](https://docs.microsoft.com/en-us/aspnet/core/signalr/)
- [SignalR JavaScript Client](https://docs.microsoft.com/en-us/aspnet/core/signalr/javascript-client)
- [Angular Documentation](https://angular.io/docs)

## 🐛 Troubleshooting

### Backend non si avvia
- Verifica che .NET 10.0 SDK sia installato: `dotnet --version`
- Controlla che le porte 5000/5001 non siano in uso

### Frontend non si connette al backend
- Verifica che il backend sia in esecuzione
- Controlla la configurazione CORS in `Program.cs`
- Verifica l'URL dell'hub in `signalr.service.ts`

### Errori CORS
- Assicurati che il backend sia configurato per accettare `http://localhost:4200`
- Controlla i log del browser per dettagli

## 📝 Note

- Il progetto è configurato per ambiente di sviluppo
- I dispositivi simulati utilizzano una singola pagina web ma creano connessioni SignalR separate
- Ogni dispositivo ha un ConnectionId univoco assegnato dal server
- I messaggi sono broadcast a tutti i client connessi

---

## English Version

# SignalR Test - ASP.NET Core + Angular Demo Project

This project demonstrates the use of SignalR ASP.NET Core to manage real-time connections between a backend and an Angular TypeScript client that simulates multiple simultaneously connected devices.

## 🎯 Goal

Understand how SignalR ASP.NET Core works through a practical project that includes:
- ASP.NET Core backend with SignalR Hub and REST API
- Angular TypeScript client simulating simultaneous connections from multiple devices
- Bidirectional real-time communication
- Connection state management

## 🚀 Quick Start

### Backend
```bash
cd Backend
dotnet run
```

### Frontend
```bash
cd Frontend
npm install
npm start
```

Open browser at `http://localhost:4200`

## 📖 Features

- **Multi-device simulation**: Connect N devices simultaneously
- **Real-time messaging**: Send and receive messages in real-time
- **Connection monitoring**: View all devices connected to the server
- **Modern UI**: Intuitive and responsive interface
- **REST API integration**: Broadcast messages via REST endpoints

---

**Creato per testare e comprendere SignalR ASP.NET Core** 🚀

