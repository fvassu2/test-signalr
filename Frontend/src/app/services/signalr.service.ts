import { Injectable, signal, computed } from '@angular/core';
import * as signalR from '@microsoft/signalr';
import { HubConnection, HubConnectionState } from '@microsoft/signalr';
import {
  HubConfig,
  ConnectionState,
  HubConnectionInfo,
  DeviceInfo,
  MessageData,
  DeviceStatusUpdate,
  Notification,
  ClientIdentity
} from '../models/signalr.models';

/**
 * Configurazione di default degli Hub disponibili.
 * Puoi aggiungerne altri qui o passarli dinamicamente.
 */
export const DEFAULT_HUB_CONFIGS: HubConfig[] = [
  { name: 'devices', url: 'http://localhost:5000/deviceHub', autoConnect: true },
  // Aggiungi altri hub qui:
  // { name: 'chat', url: 'http://localhost:5000/chatHub', autoConnect: false },
  // { name: 'notifications', url: 'http://localhost:5000/notificationHub', autoConnect: true },
];

/**
 * SignalRService - Gestisce connessioni multiple a diversi Hub SignalR.
 * 
 * USO:
 * 1. Inietta il servizio nel componente
 * 2. Chiama connect() passando l'identità del client
 * 3. Usa i signals per leggere lo stato in modo reattivo
 * 4. Chiama i metodi per inviare messaggi
 */
@Injectable({
  providedIn: 'root'
})
export class SignalRService {
  /** Mappa delle connessioni attive: hubName -> HubConnection */
  private connections = new Map<string, HubConnection>();

  /** Configurazione degli hub */
  private hubConfigs: HubConfig[] = [];

  /** Identità del client corrente */
  private clientIdentity: ClientIdentity | null = null;

  // ============================================
  // SIGNALS - Stato reattivo
  // ============================================

  /** Stato di connessione per ogni hub */
  public hubStates = signal<Map<string, HubConnectionInfo>>(new Map());

  /** Lista dei client/device connessi (ricevuta dal server) */
  public connectedClients = signal<DeviceInfo[]>([]);

  /** Messaggi ricevuti */
  public messages = signal<MessageData[]>([]);

  /** Ultima notifica ricevuta */
  public notification = signal<Notification | null>(null);

  /** Ultimo aggiornamento di stato di un device */
  public deviceStatus = signal<DeviceStatusUpdate | null>(null);

  // ============================================
  // COMPUTED SIGNALS
  // ============================================

  /** True se almeno un hub è connesso */
  public isAnyConnected = computed(() => {
    const states = this.hubStates();
    return Array.from(states.values()).some(h => h.state === 'Connected');
  });

  /** True se tutti gli hub configurati sono connessi */
  public isAllConnected = computed(() => {
    const states = this.hubStates();
    if (states.size === 0) return false;
    return Array.from(states.values()).every(h => h.state === 'Connected');
  });

  /** Lista degli hub con errori */
  public hubsWithErrors = computed(() => {
    const states = this.hubStates();
    return Array.from(states.values()).filter(h => h.state === 'Error');
  });

  constructor() { }

  // ============================================
  // PUBLIC METHODS
  // ============================================

  /**
   * Inizializza e connette agli hub configurati.
   * @param identity - Identità del client (tablet/manager)
   * @param configs - Configurazioni hub (opzionale, usa default se non specificato)
   */
  public async connect(identity: ClientIdentity, configs?: HubConfig[]): Promise<void> {
    this.clientIdentity = identity;
    this.hubConfigs = configs ?? DEFAULT_HUB_CONFIGS;

    // Inizializza gli stati
    const initialStates = new Map<string, HubConnectionInfo>();
    for (const config of this.hubConfigs) {
      initialStates.set(config.name, {
        name: config.name,
        url: config.url,
        state: 'Disconnected'
      });
    }
    this.hubStates.set(initialStates);

    // Connetti agli hub con autoConnect = true
    const autoConnectHubs = this.hubConfigs.filter(c => c.autoConnect !== false);
    await Promise.all(autoConnectHubs.map(config => this.connectToHub(config.name)));
  }

  /**
   * Connette a un hub specifico.
   */
  public async connectToHub(hubName: string): Promise<void> {
    const config = this.hubConfigs.find(c => c.name === hubName);
    if (!config) {
      console.error(`Hub config not found: ${hubName}`);
      return;
    }

    if (this.connections.has(hubName)) {
      console.warn(`Already connected to hub: ${hubName}`);
      return;
    }

    this.updateHubState(hubName, 'Connecting');

    try {
      const connection = new signalR.HubConnectionBuilder()
        .withUrl(config.url)
        .withAutomaticReconnect()
        .configureLogging(signalR.LogLevel.Information)
        .build();

      this.setupEventHandlers(connection, hubName);
      this.connections.set(hubName, connection);

      await connection.start();
      console.log(`[${hubName}] Connected`);
      this.updateHubState(hubName, 'Connected');

      // Registra questo client sul server
      if (this.clientIdentity) {
        await this.registerClient(hubName);
      }
    } catch (error) {
      console.error(`[${hubName}] Connection error:`, error);
      this.updateHubState(hubName, 'Error', String(error));
      throw error;
    }
  }

  /**
   * Disconnette da un hub specifico.
   */
  public async disconnectFromHub(hubName: string): Promise<void> {
    const connection = this.connections.get(hubName);
    if (connection) {
      await connection.stop();
      this.connections.delete(hubName);
      this.updateHubState(hubName, 'Disconnected');
      console.log(`[${hubName}] Disconnected`);
    }
  }

  /**
   * Disconnette da tutti gli hub.
   */
  public async disconnectAll(): Promise<void> {
    const hubNames = Array.from(this.connections.keys());
    await Promise.all(hubNames.map(name => this.disconnectFromHub(name)));
  }

  /**
   * Invia un messaggio broadcast a tutti i client connessi a un hub.
   */
  public async sendMessage(hubName: string, message: string): Promise<void> {
    const connection = this.connections.get(hubName);
    if (!connection || connection.state !== HubConnectionState.Connected) {
      console.error(`Cannot send message: not connected to ${hubName}`);
      return;
    }

    if (!this.clientIdentity) {
      console.error('Cannot send message: client identity not set');
      return;
    }

    await connection.invoke('SendMessage', this.clientIdentity.clientId, this.clientIdentity.clientName, message);
  }

  /**
   * Invia un messaggio a un client specifico.
   */
  public async sendMessageToClient(hubName: string, targetClientId: string, message: string): Promise<void> {
    const connection = this.connections.get(hubName);
    if (!connection || connection.state !== HubConnectionState.Connected) {
      console.error(`Cannot send message: not connected to ${hubName}`);
      return;
    }

    await connection.invoke('SendMessageToClient', targetClientId, message);
  }

  /**
   * Richiede la lista dei client connessi.
   */
  public async requestConnectedClients(hubName: string): Promise<void> {
    const connection = this.connections.get(hubName);
    if (connection?.state === HubConnectionState.Connected) {
      await connection.invoke('GetConnectedClients');
    }
  }

  /**
   * Pulisce i messaggi.
   */
  public clearMessages(): void {
    this.messages.set([]);
  }

  /**
   * Ottiene la connessione a un hub (per usi avanzati).
   */
  public getConnection(hubName: string): HubConnection | undefined {
    return this.connections.get(hubName);
  }

  // ============================================
  // PRIVATE METHODS
  // ============================================

  private async registerClient(hubName: string): Promise<void> {
    const connection = this.connections.get(hubName);
    if (!connection || !this.clientIdentity) return;

    try {
      await connection.invoke('RegisterClient', {
        deviceId: this.clientIdentity.clientId,
        deviceName: this.clientIdentity.clientName,
        deviceType: this.clientIdentity.clientType,
        connectedAt: new Date()
      });
      console.log(`[${hubName}] Client registered:`, this.clientIdentity.clientName);
    } catch (error) {
      console.error(`[${hubName}] Failed to register client:`, error);
    }
  }

  private updateHubState(hubName: string, state: ConnectionState, error?: string): void {
    this.hubStates.update(states => {
      const newStates = new Map(states);
      const current = newStates.get(hubName);
      if (current) {
        newStates.set(hubName, { ...current, state, error });
      }
      return newStates;
    });
  }

  private setupEventHandlers(connection: HubConnection, hubName: string): void {
    // Client connesso
    connection.on('ClientConnected', (client: DeviceInfo) => {
      console.log(`[${hubName}] Client connected:`, client);
      this.connectedClients.update(clients => {
        // Evita duplicati
        if (clients.some(c => c.deviceId === client.deviceId)) {
          return clients;
        }
        return [...clients, client];
      });
    });

    // Client disconnesso
    connection.on('ClientDisconnected', (client: DeviceInfo) => {
      console.log(`[${hubName}] Client disconnected:`, client);
      this.connectedClients.update(clients =>
        clients.filter(c => c.deviceId !== client.deviceId)
      );
    });

    // Lista client connessi (risposta a GetConnectedClients)
    connection.on('ConnectedClientsList', (clients: DeviceInfo[]) => {
      console.log(`[${hubName}] Connected clients list:`, clients);
      this.connectedClients.set(clients);
    });

    // Messaggio ricevuto
    connection.on('ReceiveMessage', (message: MessageData) => {
      console.log(`[${hubName}] Message received:`, message);
      this.messages.update(msgs => [...msgs, { ...message, hubName }]);
    });

    // Aggiornamento stato device
    connection.on('DeviceStatusUpdate', (status: DeviceStatusUpdate) => {
      console.log(`[${hubName}] Device status update:`, status);
      this.deviceStatus.set(status);
    });

    // Notifica
    connection.on('ReceiveNotification', (notif: Notification) => {
      console.log(`[${hubName}] Notification:`, notif);
      this.notification.set(notif);
    });

    // Gestione riconnessione
    connection.onreconnecting(() => {
      console.log(`[${hubName}] Reconnecting...`);
      this.updateHubState(hubName, 'Reconnecting');
    });

    connection.onreconnected(() => {
      console.log(`[${hubName}] Reconnected`);
      this.updateHubState(hubName, 'Connected');
      // Ri-registra il client
      this.registerClient(hubName);
    });

    connection.onclose(() => {
      console.log(`[${hubName}] Connection closed`);
      this.updateHubState(hubName, 'Disconnected');
      this.connections.delete(hubName);
    });
  }
}
