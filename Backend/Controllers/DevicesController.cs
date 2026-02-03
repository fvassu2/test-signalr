using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using SignalRBackend.Hubs;

namespace SignalRBackend.Controllers;

[ApiController]
[Route("api/[controller]")]
public class DevicesController : ControllerBase
{
    private readonly IHubContext<DeviceHub> _hubContext;
    private readonly ILogger<DevicesController> _logger;

    public DevicesController(IHubContext<DeviceHub> hubContext, ILogger<DevicesController> logger)
    {
        _hubContext = hubContext;
        _logger = logger;
    }

    [HttpPost("broadcast")]
    public async Task<IActionResult> BroadcastMessage([FromBody] BroadcastRequest request)
    {
        _logger.LogInformation("Broadcasting message from API: {Message}", request.Message);
        
        await _hubContext.Clients.All.SendAsync("ReceiveMessage", new
        {
            Id = 0,
            SenderId = "API",
            SenderName = "REST API",
            Message = request.Message,
            Timestamp = DateTime.UtcNow
        });
        
        return Ok(new { Success = true, Message = "Message broadcasted successfully" });
    }

    [HttpPost("notify")]
    public async Task<IActionResult> NotifyAllDevices([FromBody] NotificationRequest request)
    {
        _logger.LogInformation("Sending notification: {Title}", request.Title);
        
        await _hubContext.Clients.All.SendAsync("ReceiveNotification", new
        {
            Title = request.Title,
            Message = request.Message,
            Timestamp = DateTime.UtcNow
        });
        
        return Ok(new { Success = true, Message = "Notification sent successfully" });
    }

    [HttpGet("status")]
    public IActionResult GetStatus()
    {
        return Ok(new
        {
            Status = "Running",
            ServerTime = DateTime.UtcNow,
            Version = "1.0.0"
        });
    }
}

public class BroadcastRequest
{
    public string Message { get; set; } = string.Empty;
}

public class NotificationRequest
{
    public string Title { get; set; } = string.Empty;
    public string Message { get; set; } = string.Empty;
}
