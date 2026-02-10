using Microsoft.AspNetCore.SignalR;
using SignalRBackend.Models;
using System.Collections.Concurrent;

namespace SignalRBackend.Hubs;

/// <summary>
/// Hub for device management and communication.
/// Inherits common functionality from BaseHub.
/// </summary>
public class DeviceHub : BaseHub
{
    // Thread-safe dictionary for this hub's clients
    private static readonly ConcurrentDictionary<string, ClientInfo> _connectedClients = new();
    private static int _messageCounter = 0;

    protected override ConcurrentDictionary<string, ClientInfo> ConnectedClients => _connectedClients;
    
    protected override ref int GetMessageCounterRef() => ref _messageCounter;

    // DeviceHub can add device-specific methods here if needed
    // For now, all functionality is inherited from BaseHub

    protected override void OnClientRegistered(ClientInfo client)
    {
        // Optional: Add device-specific logging or actions
        Console.WriteLine($"[DeviceHub] Client registered: {client.DeviceName} ({client.DeviceType})");
    }

    protected override void OnClientDisconnected(ClientInfo client)
    {
        // Optional: Add device-specific logging or actions
        Console.WriteLine($"[DeviceHub] Client disconnected: {client.DeviceName}");
    }
}
