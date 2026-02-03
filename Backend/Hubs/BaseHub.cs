using Microsoft.AspNetCore.SignalR;
using SignalRBackend.Models;
using System.Collections.Concurrent;

namespace SignalRBackend.Hubs;

/// <summary>
/// Base hub class providing common functionality for all SignalR hubs.
/// Includes client management, messaging, and connection handling.
/// </summary>
public abstract class BaseHub : Hub
{
    /// <summary>
    /// Thread-safe dictionary mapping DeviceId to ClientInfo.
    /// DeviceId is persistent across reconnections, while ConnectionId changes.
    /// Each derived hub has its own client collection.
    /// </summary>
    protected abstract ConcurrentDictionary<string, ClientInfo> ConnectedClients { get; }
    
    /// <summary>
    /// Message counter for this hub instance.
    /// Each derived hub manages its own counter.
    /// </summary>
    protected abstract ref int GetMessageCounterRef();

    /// <summary>
    /// Register a client with the hub. This should be called by the client after connecting.
    /// </summary>
    /// <param name="clientInfo">Client information including deviceId, deviceName, and deviceType</param>
    public virtual async Task RegisterClient(ClientInfo clientInfo)
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
        
        OnClientRegistered(clientInfo);
    }

    /// <summary>
    /// Get all connected clients and send to the caller
    /// </summary>
    public virtual async Task GetConnectedClients()
    {
        await Clients.Caller.SendAsync("ConnectedClientsList", ConnectedClients.Values.ToArray());
    }

    /// <summary>
    /// Send a message to all connected clients
    /// </summary>
    /// <param name="senderId">Sender's device ID</param>
    /// <param name="senderName">Sender's display name</param>
    /// <param name="message">Message content</param>
    public virtual async Task SendMessage(string senderId, string senderName, string message)
    {
        var messageData = new MessageData
        {
            Id = Interlocked.Increment(ref GetMessageCounterRef()),
            SenderId = senderId,
            SenderName = senderName,
            Message = message,
            Timestamp = DateTime.UtcNow
        };
        
        // Broadcast message to all connected clients
        await Clients.All.SendAsync("ReceiveMessage", messageData);
        
        OnMessageSent(messageData);
    }

    /// <summary>
    /// Send a message to a specific client using their DeviceId
    /// </summary>
    /// <param name="targetDeviceId">Target client's persistent device ID</param>
    /// <param name="message">Message content</param>
    public virtual async Task SendMessageToClient(string targetDeviceId, string message)
    {
        // Find the client by DeviceId to get their current ConnectionId
        if (ConnectedClients.TryGetValue(targetDeviceId, out var targetClient))
        {
            // Get sender info
            var senderClient = ConnectedClients.Values.FirstOrDefault(c => c.ConnectionId == Context.ConnectionId);
            
            var messageData = new MessageData
            {
                Id = Interlocked.Increment(ref GetMessageCounterRef()),
                SenderId = senderClient?.DeviceId ?? "Unknown",
                SenderName = senderClient?.DeviceName ?? "Unknown",
                Message = message,
                Timestamp = DateTime.UtcNow
            };
            
            // Send message to specific client using their ConnectionId
            await Clients.Client(targetClient.ConnectionId).SendAsync("ReceiveMessage", messageData);
            
            OnDirectMessageSent(messageData, targetDeviceId);
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
            
            OnClientDisconnected(disconnectedClient);
        }
        
        await base.OnDisconnectedAsync(exception);
    }

    // ============================================
    // VIRTUAL METHODS - Override in derived classes for custom behavior
    // ============================================

    /// <summary>
    /// Called after a client has been registered. Override for custom logic.
    /// </summary>
    protected virtual void OnClientRegistered(ClientInfo client)
    {
        // Default: do nothing
    }

    /// <summary>
    /// Called after a message has been sent to all clients. Override for custom logic.
    /// </summary>
    protected virtual void OnMessageSent(MessageData message)
    {
        // Default: do nothing
    }

    /// <summary>
    /// Called after a direct message has been sent. Override for custom logic.
    /// </summary>
    protected virtual void OnDirectMessageSent(MessageData message, string targetDeviceId)
    {
        // Default: do nothing
    }

    /// <summary>
    /// Called after a client has disconnected. Override for custom logic.
    /// </summary>
    protected virtual void OnClientDisconnected(ClientInfo client)
    {
        // Default: do nothing
    }

    /// <summary>
    /// Get the current hub name (for logging purposes)
    /// </summary>
    protected virtual string GetHubName()
    {
        return GetType().Name;
    }
}
