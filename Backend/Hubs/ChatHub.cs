
using Microsoft.AspNetCore.SignalR;
using SignalRBackend.Models;
using System.Collections.Concurrent;

namespace SignalRBackend.Hubs;

/// <summary>
/// Hub for chat communication.
/// Inherits common functionality from BaseHub.
/// </summary>
public class ChatHub : BaseHub
{
    // Thread-safe dictionary for this hub's clients
    private static readonly ConcurrentDictionary<string, ClientInfo> _connectedClients = new();
    private static int _messageCounter = 0;

    protected override ConcurrentDictionary<string, ClientInfo> ConnectedClients => _connectedClients;
    
    protected override ref int GetMessageCounterRef() => ref _messageCounter;

    // Keep backward compatibility with old NewMessage method
    /// <summary>
    /// Legacy method for sending chat messages (backward compatibility)
    /// </summary>
    /// <param name="username">Username (will be treated as senderId)</param>
    /// <param name="message">Message content</param>
    public async Task NewMessage(long username, string message)
    {
        // Convert to standard SendMessage format
        await SendMessage(username.ToString(), $"User-{username}", message);
        
        // Also emit legacy event for old clients
        await Clients.All.SendAsync("messageReceived", username, message);
    }

    protected override void OnClientRegistered(ClientInfo client)
    {
        Console.WriteLine($"[ChatHub] Client registered: {client.DeviceName} ({client.DeviceType})");
    }

    protected override void OnClientDisconnected(ClientInfo client)
    {
        Console.WriteLine($"[ChatHub] Client disconnected: {client.DeviceName}");
    }
}
