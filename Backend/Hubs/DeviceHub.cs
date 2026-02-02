using Microsoft.AspNetCore.SignalR;

namespace SignalRBackend.Hubs;

public class DeviceHub : Hub
{
    private static readonly Dictionary<string, DeviceInfo> ConnectedDevices = new();
    private static int _messageCounter = 0;

    public override async Task OnConnectedAsync()
    {
        var deviceId = Context.ConnectionId;
        var deviceInfo = new DeviceInfo
        {
            DeviceId = deviceId,
            ConnectedAt = DateTime.UtcNow,
            DeviceName = $"Device-{ConnectedDevices.Count + 1}"
        };
        
        ConnectedDevices[deviceId] = deviceInfo;
        
        // Notify all clients about new device connection
        await Clients.All.SendAsync("DeviceConnected", deviceInfo);
        
        // Send current connected devices list to the new client
        await Clients.Caller.SendAsync("ConnectedDevicesList", ConnectedDevices.Values);
        
        await base.OnConnectedAsync();
    }

    public override async Task OnDisconnectedAsync(Exception? exception)
    {
        var deviceId = Context.ConnectionId;
        
        if (ConnectedDevices.TryGetValue(deviceId, out var deviceInfo))
        {
            ConnectedDevices.Remove(deviceId);
            
            // Notify all clients about device disconnection
            await Clients.All.SendAsync("DeviceDisconnected", deviceInfo);
        }
        
        await base.OnDisconnectedAsync(exception);
    }

    public async Task SendMessage(string deviceName, string message)
    {
        _messageCounter++;
        var messageData = new MessageData
        {
            Id = _messageCounter,
            DeviceId = Context.ConnectionId,
            DeviceName = deviceName,
            Message = message,
            Timestamp = DateTime.UtcNow
        };
        
        // Broadcast message to all connected clients
        await Clients.All.SendAsync("ReceiveMessage", messageData);
    }

    public async Task SendMessageToDevice(string targetDeviceId, string message)
    {
        _messageCounter++;
        var messageData = new MessageData
        {
            Id = _messageCounter,
            DeviceId = Context.ConnectionId,
            DeviceName = ConnectedDevices.GetValueOrDefault(Context.ConnectionId)?.DeviceName ?? "Unknown",
            Message = message,
            Timestamp = DateTime.UtcNow
        };
        
        // Send message to specific device
        await Clients.Client(targetDeviceId).SendAsync("ReceiveMessage", messageData);
    }

    public async Task BroadcastDeviceStatus(string deviceName, string status)
    {
        var statusData = new
        {
            DeviceId = Context.ConnectionId,
            DeviceName = deviceName,
            Status = status,
            Timestamp = DateTime.UtcNow
        };
        
        await Clients.All.SendAsync("DeviceStatusUpdate", statusData);
    }

    public Task<IEnumerable<DeviceInfo>> GetConnectedDevices()
    {
        return Task.FromResult(ConnectedDevices.Values.AsEnumerable());
    }
}

public class DeviceInfo
{
    public string DeviceId { get; set; } = string.Empty;
    public string DeviceName { get; set; } = string.Empty;
    public DateTime ConnectedAt { get; set; }
}

public class MessageData
{
    public int Id { get; set; }
    public string DeviceId { get; set; } = string.Empty;
    public string DeviceName { get; set; } = string.Empty;
    public string Message { get; set; } = string.Empty;
    public DateTime Timestamp { get; set; }
}
