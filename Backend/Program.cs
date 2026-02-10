using Scalar.AspNetCore;
using SignalRBackend.Hubs;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.
builder.Services.AddControllers();
builder.Services.AddSignalR();

// Configure CORS for Angular client
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAngularClient", policy =>
    {
        policy.WithOrigins("http://localhost:4200")
              .AllowAnyMethod()
              .AllowAnyHeader()
              .AllowCredentials();
    });
});

// Learn more about configuring OpenAPI at https://aka.ms/aspnet/openapi
builder.Services.AddOpenApi();

var app = builder.Build();

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
    app.MapScalarApiReference(); // ✅ Aggiungi questa riga
}

// Comment out HTTPS redirection for development to allow HTTP connections
// app.UseHttpsRedirection();

// Enable CORS
app.UseCors("AllowAngularClient");

app.UseAuthorization();

app.MapControllers();

// Map SignalR Hub
app.MapHub<DeviceHub>("/deviceHub");
app.MapHub<ChatHub>("/chatHub");

// Health check endpoint
app.MapGet("/api/health", () =>
{
    return Results.Ok(new
    {
        Status = "Healthy",
        Timestamp = DateTime.UtcNow,
        Service = "SignalR Backend"
    });
});

app.Run();
