import { Injectable, signal } from '@angular/core';
import { ClientIdentity, ClientType } from '../models/signalr.models';

/**
 * ClientIdentityService - Gestisce l'identità unica del client (tab del browser).
 * 
 * Ogni tab ha un ID univoco che viene:
 * - Generato al primo accesso
 * - Persistito in sessionStorage (così ogni tab ha il suo ID)
 * - Usato per identificare il client sul server SignalR
 * 
 * NOTA: Usa sessionStorage (non localStorage) perché:
 * - sessionStorage è unico per ogni tab
 * - localStorage è condiviso tra tutte le tab
 */
@Injectable({
    providedIn: 'root'
})
export class ClientIdentityService {
    private readonly STORAGE_KEY = 'signalr_client_identity';

    /** Identità corrente del client */
    public identity = signal<ClientIdentity | null>(null);

    constructor() {
        // Carica l'identità esistente se presente
        this.loadIdentity();
    }

    /**
     * Inizializza o crea l'identità del client.
     * @param clientType - Tipo di client (tablet o manager)
     * @param customName - Nome personalizzato (opzionale)
     * @returns { identity, isNew } - L'identità e un flag che indica se è stata appena creata
     */
    public initialize(clientType: ClientType, customName?: string): { identity: ClientIdentity; isNew: boolean } {
        // Controlla se esiste già un'identità per questa tab
        let existing = this.identity();

        // Se esiste già e il tipo è lo stesso, riusa
        if (existing && existing.clientType === clientType) {
            console.log('Using existing client identity:', existing);
            return { identity: existing, isNew: false };
        }

        // Crea una nuova identità
        const newIdentity: ClientIdentity = {
            clientId: this.generateClientId(),
            clientName: customName ?? this.generateClientName(clientType),
            clientType: clientType,
            createdAt: new Date()
        };

        this.saveIdentity(newIdentity);
        this.identity.set(newIdentity);

        console.log('Created new client identity:', newIdentity);
        return { identity: newIdentity, isNew: true };
    }

    /**
     * Aggiorna il nome del client.
     */
    public updateName(newName: string): void {
        const current = this.identity();
        if (current) {
            const updated = { ...current, clientName: newName };
            this.saveIdentity(updated);
            this.identity.set(updated);
        }
    }

    /**
     * Reimposta l'identità (genera un nuovo ID).
     */
    public reset(): void {
        sessionStorage.removeItem(this.STORAGE_KEY);
        this.identity.set(null);
    }

    /**
     * Ottiene l'identità corrente (throw se non inizializzata).
     */
    public getIdentityOrThrow(): ClientIdentity {
        const id = this.identity();
        if (!id) {
            throw new Error('Client identity not initialized. Call initialize() first.');
        }
        return id;
    }

    // ============================================
    // PRIVATE METHODS
    // ============================================

    private loadIdentity(): void {
        try {
            const stored = sessionStorage.getItem(this.STORAGE_KEY);
            if (stored) {
                const parsed = JSON.parse(stored) as ClientIdentity;
                // Converti la data da stringa
                parsed.createdAt = new Date(parsed.createdAt);
                this.identity.set(parsed);
                console.log('Loaded client identity from storage:', parsed);
            }
        } catch (error) {
            console.error('Error loading client identity:', error);
            sessionStorage.removeItem(this.STORAGE_KEY);
        }
    }

    private saveIdentity(identity: ClientIdentity): void {
        try {
            sessionStorage.setItem(this.STORAGE_KEY, JSON.stringify(identity));
        } catch (error) {
            console.error('Error saving client identity:', error);
        }
    }

    private generateClientId(): string {
        // Genera un UUID v4-like
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
            const r = Math.random() * 16 | 0;
            const v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }

    private generateClientName(clientType: ClientType): string {
        const suffix = Math.random().toString(36).substring(2, 6).toUpperCase();
        return clientType === 'tablet'
            ? `Tablet-${suffix}`
            : `Manager-${suffix}`;
    }
}
