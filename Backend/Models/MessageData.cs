namespace SignalRBackend.Models;

/// <summary>
/// Message data model - shared across all hubs
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
