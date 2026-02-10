// ============================================
// HUB CONFIGURATION
// ============================================

/** Configurazione di un singolo Hub */
export interface HubConfig {
  /** Nome identificativo dell'hub (es: 'devices', 'chat', 'notifications') */
  name: string;
  /** URL dell'hub (es: 'http://localhost:5000/deviceHub') */
  url: string;
  /** Se true, si connette automaticamente all'avvio */
  autoConnect?: boolean;
}

/** Stato di connessione di un Hub */
export type ConnectionState = 'Disconnected' | 'Connecting' | 'Connected' | 'Reconnecting' | 'Error';

/** Informazioni sullo stato di un Hub */
export interface HubConnectionInfo {
  name: string;
  url: string;
  state: ConnectionState;
  error?: string;
}

// ============================================
// CLIENT IDENTITY
// ============================================

/** Tipo di client (tablet o manager) */
export type ClientType = 'tablet' | 'manager';

/** Identità del client corrente */
export interface ClientIdentity {
  /** ID univoco del client (generato e persistito per tab) */
  clientId: string;
  /** Nome visualizzato del client */
  clientName: string;
  /** Tipo di client */
  clientType: ClientType;
  /** Timestamp di quando il client è stato creato */
  createdAt: Date;
}

// ============================================
// DEVICE/CLIENT INFO (dal server)
// ============================================

export interface DeviceInfo {
  deviceId: string;
  deviceName: string;
  deviceType: ClientType;
  connectedAt: Date;
}

export interface MessageData {
  id: number;
  senderId: string;
  senderName: string;
  message: string;
  timestamp: Date;
  /** Hub da cui proviene il messaggio */
  hubName?: string;
  /** Se presente, il messaggio è privato e destinato a questo client */
  targetClientId?: string;
}

export interface DeviceStatusUpdate {
  deviceId: string;
  deviceName: string;
  status: string;
  timestamp: Date;
}

export interface Notification {
  id?: string;
  title: string;
  message: string;
  timestamp: Date;
  /** A chi è destinata (tutti, o un clientId specifico) */
  targetClientId?: string;
}

// ============================================
// EVENTS (per comunicazione tra componenti)
// ============================================

export interface ClientConnectedEvent {
  client: DeviceInfo;
  hubName: string;
}

export interface ClientDisconnectedEvent {
  clientId: string;
  hubName: string;
}
