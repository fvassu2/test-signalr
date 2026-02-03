namespace SignalRBackend.Models;

/// <summary>
/// Client information model - shared across all hubs
/// </summary>
public class ClientInfo
{
    /// <summary>
    /// Persistent device identifier (doesn't change on reconnect)
    /// </summary>
    public string DeviceId { get; set; } = string.Empty;
    
    /// <summary>
    /// Display name for the device/client
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
