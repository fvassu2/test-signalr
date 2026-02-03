using Microsoft.AspNetCore.SignalR;
using System.Collections.Concurrent;

namespace SignalRBackend.Hubs;

public class DeviceHub : Hub
{
    // Use ConcurrentDictionary for thread-safety
    // Map DeviceId -> ClientInfo (DeviceId is persistent, ConnectionId changes on reconnect)
    private static readonly ConcurrentDictionary<string, ClientInfo> ConnectedClients = new();
    private static int _messageCounter = 0;

    /// <summary>
    /// Register a client with the hub. This should be called by the client after connecting.
    /// </summary>
    public async Task RegisterClient(ClientInfo clientInfo)
    {
        // Set the current ConnectionId
        clientInfo.ConnectionId = Context.ConnectionId;
        clientInfo.ConnectedAt = DateTime.UtcNow;
        
        // Add or update the client in the dictionary using DeviceId as key
        ConnectedClients[clientInfo.DeviceId] = clientInfo;
        
        // Notify all clients about new client connection
        await Clients.All.SendAsync("ClientConnected", clientInfo);
        
        // Send current connected clients list to the caller
        await Clients.Caller.SendAsync("ConnectedClientsList", ConnectedClients.Values.ToArray());
    }

    /// <summary>
    /// Get all connected clients and send to the caller
    /// </summary>
    public async Task GetConnectedClients()
    {
        await Clients.Caller.SendAsync("ConnectedClientsList", ConnectedClients.Values.ToArray());
    }

    /// <summary>
    /// Send a message to all connected clients
    /// </summary>
    public async Task SendMessage(string senderId, string senderName, string message)
    {
        var messageData = new MessageData
        {
            Id = Interlocked.Increment(ref _messageCounter),
            SenderId = senderId,
            SenderName = senderName,
            Message = message,
            Timestamp = DateTime.UtcNow
        };
        
        // Broadcast message to all connected clients
        await Clients.All.SendAsync("ReceiveMessage", messageData);
    }

    /// <summary>
    /// Send a message to a specific client using their DeviceId
    /// </summary>
    public async Task SendMessageToClient(string targetDeviceId, string message)
    {
        // Find the client by DeviceId to get their current ConnectionId
        if (ConnectedClients.TryGetValue(targetDeviceId, out var targetClient))
        {
            // Get sender info
            var senderClient = ConnectedClients.Values.FirstOrDefault(c => c.ConnectionId == Context.ConnectionId);
            
            var messageData = new MessageData
            {
                Id = Interlocked.Increment(ref _messageCounter),
                SenderId = senderClient?.DeviceId ?? "Unknown",
                SenderName = senderClient?.DeviceName ?? "Unknown",
                Message = message,
                Timestamp = DateTime.UtcNow
            };
            
            // Send message to specific client using their ConnectionId
            await Clients.Client(targetClient.ConnectionId).SendAsync("ReceiveMessage", messageData);
        }
    }

    /// <summary>
    /// Handle client disconnection
    /// </summary>
    public override async Task OnDisconnectedAsync(Exception? exception)
    {
        // Find the client by ConnectionId
        var disconnectedClient = ConnectedClients.Values.FirstOrDefault(c => c.ConnectionId == Context.ConnectionId);
        
        if (disconnectedClient != null)
        {
            // Remove the client from the dictionary
            ConnectedClients.TryRemove(disconnectedClient.DeviceId, out _);
            
            // Notify all clients about client disconnection
            await Clients.All.SendAsync("ClientDisconnected", disconnectedClient);
        }
        
        await base.OnDisconnectedAsync(exception);
    }
}

/// <summary>
/// Client information model
/// </summary>
public class ClientInfo
{
    /// <summary>
    /// Persistent device identifier (doesn't change on reconnect)
    /// </summary>
    public string DeviceId { get; set; } = string.Empty;
    
    /// <summary>
    /// Display name for the device
    /// </summary>
    public string DeviceName { get; set; } = string.Empty;
    
    /// <summary>
    /// Type of device: "tablet" or "manager"
    /// </summary>
    public string DeviceType { get; set; } = string.Empty;
    
    /// <summary>
    /// When the client connected
    /// </summary>
    public DateTime ConnectedAt { get; set; }
    
    /// <summary>
    /// Current SignalR connection ID (changes on reconnect)
    /// </summary>
    public string ConnectionId { get; set; } = string.Empty;
}

/// <summary>
/// Message data model
/// </summary>
public class MessageData
{
    /// <summary>
    /// Incremental message ID
    /// </summary>
    public int Id { get; set; }
    
    /// <summary>
    /// Sender's device ID
    /// </summary>
    public string SenderId { get; set; } = string.Empty;
    
    /// <summary>
    /// Sender's display name
    /// </summary>
    public string SenderName { get; set; } = string.Empty;
    
    /// <summary>
    /// Message content
    /// </summary>
    public string Message { get; set; } = string.Empty;
    
    /// <summary>
    /// When the message was sent
    /// </summary>
    public DateTime Timestamp { get; set; }
}
