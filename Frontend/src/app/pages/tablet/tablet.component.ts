import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SignalRService } from '../../services/signalr.service';
import { ClientIdentityService } from '../../services/client-identity.service';
import { HubConnectionInfo, MessageData } from '../../models/signalr.models';

@Component({
    selector: 'app-tablet',
    standalone: true,
    imports: [CommonModule, FormsModule],
    templateUrl: './tablet.component.html',
    styleUrl: './tablet.component.css'
})
export class TabletComponent implements OnInit, OnDestroy {
    private signalR = inject(SignalRService);
    private clientIdentity = inject(ClientIdentityService);

    // Form inputs
    clientName = '';
    messageText = '';

    // State
    isConnecting = false;
    error: string | null = null;

    // Getters per leggere i signals
    get identity() {
        return this.clientIdentity.identity();
    }

    get hubStates(): HubConnectionInfo[] {
        return Array.from(this.signalR.hubStates().values());
    }

    get isConnected(): boolean {
        return this.signalR.isAnyConnected();
    }

    get messages(): MessageData[] {
        return this.signalR.messages();
    }

    get connectedClients() {
        return this.signalR.connectedClients();
    }

    ngOnInit(): void {
        // Inizializza l'identità come tablet
        const identity = this.clientIdentity.initialize('tablet');
        this.clientName = identity.clientName;
    }

    ngOnDestroy(): void {
        this.signalR.disconnectAll();
    }

    async connect(): Promise<void> {
        if (this.isConnecting) return;

        this.isConnecting = true;
        this.error = null;

        try {
            // Aggiorna il nome se cambiato
            if (this.clientName !== this.identity?.clientName) {
                this.clientIdentity.updateName(this.clientName);
            }

            const identity = this.clientIdentity.getIdentityOrThrow();
            await this.signalR.connect(identity);

            // Richiedi la lista dei client connessi
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

    async sendMessage(): Promise<void> {
        if (!this.messageText.trim()) return;

        try {
            await this.signalR.sendMessage('devices', this.messageText);
            this.messageText = '';
        } catch (err) {
            console.error('Error sending message:', err);
        }
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
}
