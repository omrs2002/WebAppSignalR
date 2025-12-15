using Microsoft.AspNetCore.SignalR;
using Microsoft.Extensions.Logging;
using System;
using System.Threading.Tasks;

namespace WebAppSignalR.Hubs
{
    public class ChatHub : Hub
    {
        private readonly ILogger<ChatHub> _logger;

        public ChatHub(ILogger<ChatHub> logger)
        {
            _logger = logger;
        }

        public override async Task OnConnectedAsync()
        {
            _logger.LogInformation("Client {ClientId} connected", Context.ConnectionId);
            await base.OnConnectedAsync();
        }

        public override async Task OnDisconnectedAsync(Exception? exception)
        {
            _logger.LogInformation("Client {ClientId} disconnected", Context.ConnectionId);
            if (exception != null)
            {
                _logger.LogError(exception, "Client {ClientId} disconnected with error", Context.ConnectionId);
            }
            await base.OnDisconnectedAsync(exception);
        }

        public async Task SendMessage(string user, string message)
        {
            // Input validation
            if (string.IsNullOrWhiteSpace(user))
            {
                throw new HubException("User name cannot be empty");
            }

            if (string.IsNullOrWhiteSpace(message))
            {
                throw new HubException("Message cannot be empty");
            }

            // Trim inputs to prevent whitespace-only entries
            user = user.Trim();
            message = message.Trim();

            // Length validation
            if (user.Length > 50)
            {
                throw new HubException("User name is too long (max 50 characters)");
            }

            if (message.Length > 1000)
            {
                throw new HubException("Message is too long (max 1000 characters)");
            }

            _logger.LogInformation("Message from {User}: {Message}", user, message);

            // Send message to all connected clients with timestamp
            await Clients.All.SendAsync("ReceiveMessage", user, message, DateTime.UtcNow);
        }
    }
}
