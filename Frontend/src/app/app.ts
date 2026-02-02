import { Component, OnInit, OnDestroy, signal, ChangeDetectorRef } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SignalRService } from './services/signalr.service';
import { DeviceInfo, MessageData } from './models/signalr.models';

interface DeviceConnection {
  id: string;
  name: string;
  service: SignalRService;
  connected: boolean;
  status: string;
}

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, CommonModule, FormsModule],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App implements OnInit, OnDestroy {
  protected readonly title = signal('SignalR Multi-Device Test');
  
  devices: DeviceConnection[] = [];
  connectedDevices: DeviceInfo[] = [];
  messages: MessageData[] = [];
  
  numberOfDevices = 3;
  messageToSend = '';
  backendUrl = 'http://localhost:5000';
  
  connectionState = 'Disconnected';
  
  constructor(private cdr: ChangeDetectorRef) {}
  
  ngOnInit(): void {
    console.log('App initialized');
  }
  
  ngOnDestroy(): void {
    this.disconnectAllDevices();
  }
  
  async connectDevices(): Promise<void> {
    this.devices = [];
    
    for (let i = 0; i < this.numberOfDevices; i++) {
      const deviceName = `Device-${i + 1}`;
      const service = new SignalRService();
      
      const device: DeviceConnection = {
        id: `device-${i + 1}`,
        name: deviceName,
        service: service,
        connected: false,
        status: 'Connecting...'
      };
      
      this.devices.push(device);
      this.cdr.detectChanges();
      
      try {
        await service.startConnection(deviceName);
        device.connected = true;
        device.status = 'Connected';
        this.cdr.detectChanges();
        
        // Subscribe to messages for the first device only (to avoid duplicates)
        if (i === 0) {
          service.messages$.subscribe(messages => {
            this.messages = messages;
            this.cdr.detectChanges();
          });
          
          service.connectedDevices$.subscribe(devices => {
            this.connectedDevices = devices;
            this.cdr.detectChanges();
          });
          
          service.connectionState$.subscribe(state => {
            this.connectionState = state;
            this.cdr.detectChanges();
          });
        }
        
        console.log(`${deviceName} connected successfully`);
      } catch (error) {
        device.connected = false;
        device.status = 'Error';
        this.cdr.detectChanges();
        console.error(`Error connecting ${deviceName}:`, error);
      }
      
      // Small delay between connections to avoid overwhelming the server
      await this.delay(100);
    }
  }
  
  async disconnectAllDevices(): Promise<void> {
    for (const device of this.devices) {
      try {
        await device.service.stopConnection();
        device.connected = false;
        device.status = 'Disconnected';
      } catch (error) {
        console.error(`Error disconnecting ${device.name}:`, error);
      }
    }
    
    this.devices = [];
    this.messages = [];
    this.connectedDevices = [];
  }
  
  async sendMessageFromAllDevices(): Promise<void> {
    if (!this.messageToSend.trim()) {
      alert('Please enter a message');
      return;
    }
    
    for (const device of this.devices) {
      if (device.connected) {
        try {
          await device.service.sendMessage(device.name, this.messageToSend);
          await this.delay(50);
        } catch (error) {
          console.error(`Error sending message from ${device.name}:`, error);
        }
      }
    }
    
    this.messageToSend = '';
  }
  
  async sendMessageFromDevice(device: DeviceConnection): Promise<void> {
    const message = prompt(`Enter message from ${device.name}:`);
    if (message && device.connected) {
      try {
        await device.service.sendMessage(device.name, message);
      } catch (error) {
        console.error(`Error sending message from ${device.name}:`, error);
      }
    }
  }
  
  clearMessages(): void {
    this.messages = [];
    if (this.devices.length > 0) {
      this.devices[0].service.clearMessages();
    }
  }
  
  getStatusClass(status: string): string {
    switch (status) {
      case 'Connected':
        return 'status-connected';
      case 'Connecting...':
        return 'status-connecting';
      case 'Disconnected':
        return 'status-disconnected';
      case 'Error':
        return 'status-error';
      default:
        return '';
    }
  }
  
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

