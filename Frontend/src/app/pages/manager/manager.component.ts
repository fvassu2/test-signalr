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
    private signalRService = inject(SignalRService);
    private clientIdentityService = inject(ClientIdentityService);

    // Form inputs
    broadcastMessage = '';
    selectedClientId: string | null = null;
    privateMessage = '';

    // State
    isConnecting = false;
    error: string | null = null;

    // Getters
    get identity() {
        return this.clientIdentityService.identity();
    }

    get hubStates(): HubConnectionInfo[] {
        return Array.from(this.signalRService.hubStates().values());
    }

    get isConnected(): boolean {
        return this.signalRService.isAnyConnected();
    }

    get connectedClients(): DeviceInfo[] {
        return this.signalRService.connectedClients();
    }

    get tablets(): DeviceInfo[] {
        return this.connectedClients.filter(c => c.deviceType === 'tablet');
    }

    get managers(): DeviceInfo[] {
        return this.connectedClients.filter(c => c.deviceType === 'manager');
    }

    get messages(): MessageData[] {
        return this.signalRService.messages();
    }

    get lastNotification() {
        return this.signalRService.notification();
    }

    ngOnInit(): void {
        // Inizializza come manager
        const { isNew } = this.clientIdentityService.initialize('manager');
        // Auto-connect solo se è un'identità esistente (manager di solito si riconnette sempre)
        // Ma rispettiamo la stessa logica del tablet per coerenza
        if (!isNew) {
            this.connect();
        }
    }

    ngOnDestroy(): void {
        this.signalRService.disconnectAll();
    }

    async connect(): Promise<void> {
        if (this.isConnecting || this.isConnected) return;

        this.isConnecting = true;
        this.error = null;

        try {
            const identity = this.clientIdentityService.getIdentityOrThrow();
            await this.signalRService.connect(identity);

            // Richiedi subito la lista dei client
            await this.signalRService.requestConnectedClients('devices');
        } catch (err) {
            this.error = err instanceof Error ? err.message : 'Errore di connessione';
            console.error('Connection error:', err);
        } finally {
            this.isConnecting = false;
        }
    }

    async disconnect(): Promise<void> {
        await this.signalRService.disconnectAll();
    }

    async sendBroadcast(): Promise<void> {
        if (!this.broadcastMessage.trim()) return;

        try {
            await this.signalRService.sendMessage('devices', this.broadcastMessage);
            this.broadcastMessage = '';
        } catch (err) {
            console.error('Error sending broadcast:', err);
        }
    }

    async sendPrivateMessage(): Promise<void> {
        if (!this.selectedClientId || !this.privateMessage.trim()) return;

        try {
            await this.signalRService.sendMessageToClient('devices', this.selectedClientId, this.privateMessage);
            this.privateMessage = '';
        } catch (err) {
            console.error('Error sending private message:', err);
        }
    }

    selectClient(clientId: string): void {
        this.selectedClientId = this.selectedClientId === clientId ? null : clientId;
    }

    async refreshClients(): Promise<void> {
        await this.signalRService.requestConnectedClients('devices');
    }

    clearMessages(): void {
        this.signalRService.clearMessages();
    }

    isMessagePrivate(message: MessageData): boolean {
        return !!message.targetClientId;
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
