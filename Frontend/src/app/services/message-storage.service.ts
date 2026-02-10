import { Injectable } from '@angular/core';
import { MessageData } from '../models/signalr.models';

/**
 * MessageStorageService - Persiste i messaggi in localStorage.
 * 
 * I messaggi vengono salvati per clientId, così ogni tab ha la sua cronologia.
 * Usa localStorage (non sessionStorage) per mantenere i dati anche dopo il refresh.
 */
@Injectable({
    providedIn: 'root'
})
export class MessageStorageService {
    private readonly STORAGE_KEY_PREFIX = 'signalr_messages_';
    private readonly MAX_MESSAGES = 100; // Limite per evitare di riempire localStorage

    constructor() { }

    /**
     * Salva i messaggi per un client specifico.
     */
    saveMessages(clientId: string, messages: MessageData[]): void {
        try {
            // Mantieni solo gli ultimi MAX_MESSAGES
            const toSave = messages.slice(-this.MAX_MESSAGES);
            const key = this.getStorageKey(clientId);
            localStorage.setItem(key, JSON.stringify(toSave));
        } catch (error) {
            console.error('Error saving messages to localStorage:', error);
        }
    }

    /**
     * Carica i messaggi salvati per un client.
     */
    loadMessages(clientId: string): MessageData[] {
        try {
            const key = this.getStorageKey(clientId);
            const stored = localStorage.getItem(key);
            if (stored) {
                const messages = JSON.parse(stored) as MessageData[];
                // Converti le date da stringa a Date
                return messages.map(m => ({
                    ...m,
                    timestamp: new Date(m.timestamp)
                }));
            }
        } catch (error) {
            console.error('Error loading messages from localStorage:', error);
        }
        return [];
    }

    /**
     * Aggiunge un nuovo messaggio alla cronologia.
     */
    addMessage(clientId: string, message: MessageData): void {
        const existing = this.loadMessages(clientId);
        existing.push(message);
        this.saveMessages(clientId, existing);
    }

    /**
     * Pulisce i messaggi per un client.
     */
    clearMessages(clientId: string): void {
        try {
            const key = this.getStorageKey(clientId);
            localStorage.removeItem(key);
        } catch (error) {
            console.error('Error clearing messages from localStorage:', error);
        }
    }

    /**
     * Pulisce tutti i messaggi (tutte le tab).
     */
    clearAllMessages(): void {
        try {
            const keys = Object.keys(localStorage);
            keys.forEach(key => {
                if (key.startsWith(this.STORAGE_KEY_PREFIX)) {
                    localStorage.removeItem(key);
                }
            });
        } catch (error) {
            console.error('Error clearing all messages:', error);
        }
    }

    private getStorageKey(clientId: string): string {
        return `${this.STORAGE_KEY_PREFIX}${clientId}`;
    }
}
