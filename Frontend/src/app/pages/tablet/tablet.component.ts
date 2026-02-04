import { Component, OnInit, OnDestroy, inject, effect, ChangeDetectorRef, untracked } from '@angular/core';
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
    private cdr = inject(ChangeDetectorRef);

    // Form inputs
    clientName = '';
    messageText = '';
    selectedRecipientId: string | null = null; // Client selezionato per messaggio privato

    // State
    isConnecting = false;
    error: string | null = null;
    showConnectionCard = true; // Mostra la card di connessione
    clientsAccordionOpen = false; // Accordion client connessi
    toastVisible = false;
    toastMessage = '';
    private toastTimeout?: number;

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
        // "Tu" sempre in cima, poi escludi te stesso e i manager (messaggi privati solo tra tablet)
        const all = this.signalR.connectedClients();
        const me = all.filter(c => c.deviceId === this.identity?.clientId);
        const otherTablets = all.filter(c =>
            c.deviceId !== this.identity?.clientId &&
            c.deviceType === 'tablet'
        );
        const managers = all.filter(c => c.deviceType === 'manager');

        return [...me, ...otherTablets, ...managers];
    }

    get availableRecipients() {
        // Solo altri tablet (escludi te stesso e i manager)
        return this.signalR.connectedClients().filter(c =>
            c.deviceId !== this.identity?.clientId &&
            c.deviceType === 'tablet'
        );
    }

    isMessagePrivate(msg: MessageData): boolean {
        // Un messaggio è privato se ha targetClientId E sono coinvolto (mittente o destinatario)
        if (!msg.targetClientId) return false;
        return msg.targetClientId === this.identity?.clientId ||
            msg.senderId === this.identity?.clientId;
    }

    getMessageClass(msg: MessageData): string {
        const senderId = msg.senderId;
        const senderType = this.connectedClients.find(c => c.deviceId === senderId)?.deviceType;

        if (senderId === this.identity?.clientId) {
            return 'message-mine'; // I miei messaggi
        } else if (senderType === 'manager') {
            return 'message-manager'; // Messaggi dal manager
        } else {
            return 'message-other'; // Messaggi da altri tablet
        }
    }

    constructor() {
        // Effect per mostrare toast quando arriva una notifica
        effect(() => {
            const notification = this.signalR.notification();
            if (notification) {
                // Usa untracked per evitare che l'effect causi change detection issues
                untracked(() => {
                    const message = notification.title ? `${notification.title}: ${notification.message}` : notification.message;
                    this.toastMessage = message;
                    this.toastVisible = true;
                    this.cdr.detectChanges();

                    // Auto-hide dopo 4 secondi
                    if (this.toastTimeout) {
                        clearTimeout(this.toastTimeout);
                    }
                    this.toastTimeout = window.setTimeout(() => {
                        this.hideToast();
                        this.cdr.detectChanges();
                    }, 4000);
                });
            }
        });
    }

    ngOnInit(): void {
        // Inizializza l'identità come tablet
        const { identity, isNew } = this.clientIdentity.initialize('tablet');
        this.clientName = identity.clientName;

        // Auto-connect solo se è un'identità esistente (refresh della pagina)
        // Se è nuova, l'utente deve cliccare "Connetti" manualmente
        if (!isNew && !this.isConnected) {
            console.log('Auto-connecting (existing identity)...');
            this.connect();
        }
    } ngOnDestroy(): void {
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

            // Nascondi la card di connessione
            this.showConnectionCard = false;
        } catch (err) {
            this.error = err instanceof Error ? err.message : 'Errore di connessione';
            console.error('Connection error:', err);
        } finally {
            this.isConnecting = false;
        }
    }

    async disconnect(): Promise<void> {
        await this.signalR.disconnectAll();
        this.showConnectionCard = true; // Mostra di nuovo la card
    }

    toggleClientsAccordion(): void {
        this.clientsAccordionOpen = !this.clientsAccordionOpen;
    }

    async sendMessage(): Promise<void> {
        if (!this.messageText.trim()) return;

        try {
            if (this.selectedRecipientId) {
                // Messaggio privato
                await this.signalR.sendMessageToClient('devices', this.selectedRecipientId, this.messageText);
            } else {
                // Messaggio broadcast
                await this.signalR.sendMessage('devices', this.messageText);
            }
            this.messageText = '';
        } catch (err) {
            console.error('Error sending message:', err);
        }
    }

    selectRecipient(clientId: string | null): void {
        // Toggle selezione
        this.selectedRecipientId = this.selectedRecipientId === clientId ? null : clientId;
    }

    getRecipientName(): string {
        if (!this.selectedRecipientId) return '';
        const recipient = this.connectedClients.find(c => c.deviceId === this.selectedRecipientId);
        return recipient?.deviceName || '';
    }

    clearMessages(): void {
        this.signalR.clearMessages();
    }

    showToast(message: string): void {
        this.toastMessage = message;
        this.toastVisible = true;

        // Auto-hide dopo 4 secondi
        if (this.toastTimeout) {
            clearTimeout(this.toastTimeout);
        }
        this.toastTimeout = window.setTimeout(() => {
            this.hideToast();
        }, 4000);
    }

    hideToast(): void {
        this.toastVisible = false;
        if (this.toastTimeout) {
            clearTimeout(this.toastTimeout);
        }
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
