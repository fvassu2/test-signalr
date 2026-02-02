import { Injectable } from '@angular/core';
import * as signalR from '@microsoft/signalr';
import { HubConnection, HubConnectionState } from '@microsoft/signalr';
import { BehaviorSubject, Observable } from 'rxjs';
import { DeviceInfo, MessageData, DeviceStatusUpdate, Notification } from '../models/signalr.models';

@Injectable({
  providedIn: 'root'
})
export class SignalRService {
  private hubUrl = 'http://localhost:5000/deviceHub';
  private hubConnection: HubConnection | null = null;
  
  // Observables for real-time updates
  private connectedDevicesSubject = new BehaviorSubject<DeviceInfo[]>([]);
  public connectedDevices$ = this.connectedDevicesSubject.asObservable();
  
  private messagesSubject = new BehaviorSubject<MessageData[]>([]);
  public messages$ = this.messagesSubject.asObservable();
  
  private connectionStateSubject = new BehaviorSubject<string>('Disconnected');
  public connectionState$ = this.connectionStateSubject.asObservable();
  
  private notificationsSubject = new BehaviorSubject<Notification | null>(null);
  public notifications$ = this.notificationsSubject.asObservable();
  
  private deviceStatusSubject = new BehaviorSubject<DeviceStatusUpdate | null>(null);
  public deviceStatus$ = this.deviceStatusSubject.asObservable();

  constructor() { }

  public async startConnection(deviceName: string = 'Device'): Promise<void> {
    try {
      this.hubConnection = new signalR.HubConnectionBuilder()
        .withUrl(this.hubUrl)
        .withAutomaticReconnect()
        .configureLogging(signalR.LogLevel.Information)
        .build();

      this.setupEventHandlers();
      
      await this.hubConnection.start();
      console.log('SignalR connection established');
      this.connectionStateSubject.next('Connected');
      
      // Broadcast initial status
      await this.broadcastDeviceStatus(deviceName, 'Online');
    } catch (error) {
      console.error('Error while starting SignalR connection:', error);
      this.connectionStateSubject.next('Error');
      throw error;
    }
  }

  private setupEventHandlers(): void {
    if (!this.hubConnection) return;

    // Handle device connected
    this.hubConnection.on('DeviceConnected', (deviceInfo: DeviceInfo) => {
      console.log('Device connected:', deviceInfo);
      const currentDevices = this.connectedDevicesSubject.value;
      this.connectedDevicesSubject.next([...currentDevices, deviceInfo]);
    });

    // Handle device disconnected
    this.hubConnection.on('DeviceDisconnected', (deviceInfo: DeviceInfo) => {
      console.log('Device disconnected:', deviceInfo);
      const currentDevices = this.connectedDevicesSubject.value;
      this.connectedDevicesSubject.next(
        currentDevices.filter(d => d.deviceId !== deviceInfo.deviceId)
      );
    });

    // Handle connected devices list
    this.hubConnection.on('ConnectedDevicesList', (devices: DeviceInfo[]) => {
      console.log('Connected devices list:', devices);
      this.connectedDevicesSubject.next(devices);
    });

    // Handle received messages
    this.hubConnection.on('ReceiveMessage', (message: MessageData) => {
      console.log('Message received:', message);
      const currentMessages = this.messagesSubject.value;
      this.messagesSubject.next([...currentMessages, message]);
    });

    // Handle device status updates
    this.hubConnection.on('DeviceStatusUpdate', (statusUpdate: DeviceStatusUpdate) => {
      console.log('Device status update:', statusUpdate);
      this.deviceStatusSubject.next(statusUpdate);
    });

    // Handle notifications
    this.hubConnection.on('ReceiveNotification', (notification: Notification) => {
      console.log('Notification received:', notification);
      this.notificationsSubject.next(notification);
    });

    // Handle connection state changes
    this.hubConnection.onreconnecting(() => {
      console.log('SignalR reconnecting...');
      this.connectionStateSubject.next('Reconnecting');
    });

    this.hubConnection.onreconnected(() => {
      console.log('SignalR reconnected');
      this.connectionStateSubject.next('Connected');
    });

    this.hubConnection.onclose(() => {
      console.log('SignalR connection closed');
      this.connectionStateSubject.next('Disconnected');
    });
  }

  public async sendMessage(deviceName: string, message: string): Promise<void> {
    if (this.hubConnection?.state === HubConnectionState.Connected) {
      await this.hubConnection.invoke('SendMessage', deviceName, message);
    } else {
      console.error('Cannot send message: Not connected to hub');
    }
  }

  public async sendMessageToDevice(targetDeviceId: string, message: string): Promise<void> {
    if (this.hubConnection?.state === HubConnectionState.Connected) {
      await this.hubConnection.invoke('SendMessageToDevice', targetDeviceId, message);
    } else {
      console.error('Cannot send message: Not connected to hub');
    }
  }

  public async broadcastDeviceStatus(deviceName: string, status: string): Promise<void> {
    if (this.hubConnection?.state === HubConnectionState.Connected) {
      await this.hubConnection.invoke('BroadcastDeviceStatus', deviceName, status);
    } else {
      console.error('Cannot broadcast status: Not connected to hub');
    }
  }

  public async stopConnection(): Promise<void> {
    if (this.hubConnection) {
      await this.hubConnection.stop();
      this.connectionStateSubject.next('Disconnected');
      console.log('SignalR connection stopped');
    }
  }

  public isConnected(): boolean {
    return this.hubConnection?.state === HubConnectionState.Connected;
  }

  public getConnectionState(): string {
    return this.hubConnection?.state || 'Disconnected';
  }

  public clearMessages(): void {
    this.messagesSubject.next([]);
  }
}
