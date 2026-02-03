import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SignalRService } from '../../services/signalr.service';
import { ClientIdentityService } from '../../services/client-identity.service';
import { DeviceInfo, HubConnectionInfo, MessageData } from '../../models/signalr.models';

@Component({
    selector: 'app-manager',
    standalone: true,
    imports: [CommonModule, FormsModule],
    templateUrl: './manager.component.html',
    styleUrl: './manager.component.css'
})
export class ManagerComponent implements OnInit, OnDestroy {
    private signalR = inject(SignalRService);
    private clientIdentity = inject(ClientIdentityService);

    // Form inputs
    broadcastMessage = '';
    selectedClientId: string | null = null;
    privateMessage = '';

    // State
    isConnecting = false;
    error: string | null = null;

    // Getters
    get identity() {
        return this.clientIdentity.identity();
    }

    get hubStates(): HubConnectionInfo[] {
        return Array.from(this.signalR.hubStates().values());
    }

    get isConnected(): boolean {
        return this.signalR.isAnyConnected();
    }

    get connectedClients(): DeviceInfo[] {
        return this.signalR.connectedClients();
    }

    get tablets(): DeviceInfo[] {
        return this.connectedClients.filter(c => c.deviceType === 'tablet');
    }

    get managers(): DeviceInfo[] {
        return this.connectedClients.filter(c => c.deviceType === 'manager');
    }

    get messages(): MessageData[] {
        return this.signalR.messages();
    }

    get lastNotification() {
        return this.signalR.notification();
    }

    ngOnInit(): void {
        // Inizializza come manager
        this.clientIdentity.initialize('manager');
        // Auto-connect
        this.connect();
    }

    ngOnDestroy(): void {
        this.signalR.disconnectAll();
    }

    async connect(): Promise<void> {
        if (this.isConnecting || this.isConnected) return;

        this.isConnecting = true;
        this.error = null;

        try {
            const identity = this.clientIdentity.getIdentityOrThrow();
            await this.signalR.connect(identity);

            // Richiedi subito la lista dei client
            await this.signalR.requestConnectedClients('devices');
        } catch (err) {
            this.error = err instanceof Error ? err.message : 'Errore di connessione';
            console.error('Connection error:', err);
        } finally {
            this.isConnecting = false;
        }
    }

    async disconnect(): Promise<void> {
        await this.signalR.disconnectAll();
    }

    async sendBroadcast(): Promise<void> {
        if (!this.broadcastMessage.trim()) return;

        try {
            await this.signalR.sendMessage('devices', this.broadcastMessage);
            this.broadcastMessage = '';
        } catch (err) {
            console.error('Error sending broadcast:', err);
        }
    }

    async sendPrivateMessage(): Promise<void> {
        if (!this.selectedClientId || !this.privateMessage.trim()) return;

        try {
            await this.signalR.sendMessageToClient('devices', this.selectedClientId, this.privateMessage);
            this.privateMessage = '';
        } catch (err) {
            console.error('Error sending private message:', err);
        }
    }

    selectClient(clientId: string): void {
        this.selectedClientId = this.selectedClientId === clientId ? null : clientId;
    }

    async refreshClients(): Promise<void> {
        await this.signalR.requestConnectedClients('devices');
    }

    clearMessages(): void {
        this.signalR.clearMessages();
    }

    getStateClass(state: string): string {
        switch (state) {
            case 'Connected': return 'state-connected';
            case 'Connecting': return 'state-connecting';
            case 'Reconnecting': return 'state-reconnecting';
            case 'Error': return 'state-error';
            default: return 'state-disconnected';
        }
    }

    formatTime(date: Date): string {
        return new Date(date).toLocaleTimeString('it-IT');
    }

    formatDateTime(date: Date): string {
        return new Date(date).toLocaleString('it-IT');
    }
}
