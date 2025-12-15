# SignalR Best Practices - Detailed Examples

## Table of Contents
1. [Backend Validation Pattern](#backend-validation-pattern)
2. [Frontend Error Handling](#frontend-error-handling)
3. [Connection Lifecycle](#connection-lifecycle)
4. [Security Patterns](#security-patterns)

---

## Backend Validation Pattern

### ? BEFORE (No Validation)
```csharp
public async Task SendMessage(string user, string message)
{
    // No checks - could accept empty strings, very long messages, etc.
    await Clients.All.SendAsync("ReceiveMessage", user, message);
}
```

**Problems:**
- Empty messages could be sent
- No length limits (DoS potential)
- No error feedback to client
- Difficult to debug issues

### ? AFTER (Robust Validation)
```csharp
public async Task SendMessage(string user, string message)
{
    // Input validation - First line of defense
    if (string.IsNullOrWhiteSpace(user))
        throw new HubException("User name cannot be empty");
    
    if (string.IsNullOrWhiteSpace(message))
        throw new HubException("Message cannot be empty");
    
    // Trim inputs
    user = user.Trim();
    message = message.Trim();
    
    // Length validation
    if (user.Length > 50)
        throw new HubException("User name is too long (max 50 characters)");
    
    if (message.Length > 1000)
        throw new HubException("Message is too long (max 1000 characters)");
    
    // Log for debugging and auditing
    _logger.LogInformation("Message from {User}: {Message}", user, message);
    
    // Send with timestamp
    await Clients.All.SendAsync("ReceiveMessage", user, message, DateTime.UtcNow);
}
```

**Benefits:**
- ? Clear error messages returned to client
- ? Length limits prevent abuse
- ? Logging for troubleshooting
- ? Timestamps for ordering
- ? Whitespace trimming prevents "spam"

---

## Frontend Error Handling

### ? BEFORE (Minimal Error Handling)
```javascript
connection.start().then(function () {
    document.getElementById("sendButton").disabled = false;
}).catch(function (err) {
    return console.error(err.toString()); // Only logs to console
});

document.getElementById("sendButton").addEventListener("click", function (event) {
    var user = document.getElementById("userInput").value;
    var message = document.getElementById("messageInput").value;
    
    // No validation, no feedback
    connection.invoke("SendMessage", user, message).catch(function (err) {
        return console.error(err.toString()); // User never sees this
    });
    event.preventDefault();
});
```

**Problems:**
- Errors only logged to console (users don't see them)
- No input validation
- No retry mechanism
- No connection status indication
- Button remains enabled even if disconnected

### ? AFTER (Comprehensive Error Handling)
```javascript
// Connection with automatic reconnection
const connection = new signalR.HubConnectionBuilder()
    .withUrl("/chatHub")
    .withAutomaticReconnect([0, 0, 3000, 5000, 10000, 15000, 30000])
    .build();

// Lifecycle handlers
connection.onreconnecting((error) => {
    updateConnectionStatus("Reconnecting...", false);
    sendButton.disabled = true; // Disable during reconnection
});

connection.onreconnected((connectionId) => {
    updateConnectionStatus("Connected", true);
    sendButton.disabled = false;
});

connection.onclose((error) => {
    updateConnectionStatus("Disconnected", false);
    sendButton.disabled = true;
    if (error) {
        console.error("Connection closed with error: " + error);
    }
});

// Input validation before sending
function validateInputs(user, message) {
    const errors = [];
    
    if (!user || user.trim().length === 0) {
        errors.push("User name is required");
    } else if (user.length > 50) {
        errors.push("User name must be 50 characters or less");
    }
    
    if (!message || message.trim().length === 0) {
        errors.push("Message cannot be empty");
    } else if (message.length > 1000) {
        errors.push("Message must be 1000 characters or less");
    }
    
    return errors;
}

// Send with validation and feedback
sendButton.addEventListener("click", function (event) {
    const user = userInput.value;
    const message = messageInput.value;
    
    // Validate first
    const errors = validateInputs(user, message);
    if (errors.length > 0) {
        alert("Validation errors:\n" + errors.join("\n"));
        return;
    }
    
    // Send and provide feedback
    connection.invoke("SendMessage", user, message)
        .then(function () {
            messageInput.value = ""; // Clear on success
        })
        .catch(function (err) {
            console.error("Error sending message: " + err.toString());
            alert("Failed to send message: " + err.toString()); // User feedback
        });
    
    event.preventDefault();
});
```

**Benefits:**
- ? User sees connection status
- ? Button disabled when disconnected
- ? Automatic reconnection with backoff
- ? Input validation before sending
- ? Error messages shown to user
- ? Success feedback (clear input)

---

## Connection Lifecycle

### SignalR Connection States

```javascript
// Connection building
const connection = new signalR.HubConnectionBuilder()
    .withUrl("/chatHub")                              // Hub URL
    .withAutomaticReconnect([...])                   // Reconnection strategy
    .withHubProtocol(new signalR.JsonHubProtocol()) // Message protocol
    .build();

// State: DISCONNECTED ? CONNECTING ? CONNECTED

// Server-to-Client messages
connection.on("ReceiveMessage", (user, message, timestamp) => {
    // Handle message
});

// Connection lifecycle events
connection.onreconnecting((error) => {
    // CONNECTED ? RECONNECTING
    // Disable UI, show "Reconnecting..." message
});

connection.onreconnected((connectionId) => {
    // RECONNECTING ? CONNECTED
    // Enable UI, show "Connected" message
});

connection.onclose((error) => {
    // CONNECTED ? DISCONNECTED
    // Disable UI, show "Disconnected" message
    // Attempt manual reconnection if needed
});

// Start connection
connection.start()
    .then(() => {
        // Now CONNECTED
        sendButton.disabled = false;
    })
    .catch((err) => {
        // Connection failed
        console.error(err);
    });
```

### Reconnection Strategy Explained

```javascript
.withAutomaticReconnect([
    0,      // Attempt 1: immediately
    0,      // Attempt 2: immediately
    3000,   // Attempt 3: after 3 seconds
    5000,   // Attempt 4: after 5 seconds
    10000,  // Attempt 5: after 10 seconds
    15000,  // Attempt 6: after 15 seconds
    30000   // Attempt 7: after 30 seconds
])
```

**Why this pattern?**
- First 2 attempts are immediate (network hiccup)
- Then exponential backoff (prevents server overload)
- Max 7 attempts over ~75 seconds
- If all fail, connection stays disconnected

---

## Security Patterns

### XSS Prevention

### ? VULNERABLE (Using innerHTML)
```javascript
connection.on("ReceiveMessage", function (user, message) {
    // DANGEROUS: If message contains "<img src=x onerror='alert(1)'>"
    // It will execute the JavaScript!
    var encodedMsg = user + " says " + message;
    document.getElementById("messagesList").innerHTML += 
        "<li>" + encodedMsg + "</li>";
});
```

### ? SAFE (Using textContent)
```javascript
connection.on("ReceiveMessage", function (user, message, timestamp) {
    // Sanitize using textContent ? innerHTML pattern
    const sanitizedUser = sanitizeHtml(user);
    const sanitizedMessage = sanitizeHtml(message);
    
    const li = document.createElement("li");
    li.textContent = `${sanitizedUser}: ${sanitizedMessage}`;
    messagesList.appendChild(li);
});

function sanitizeHtml(text) {
    const div = document.createElement("div");
    div.textContent = text;  // Browser escapes the text
    return div.innerHTML;    // Now it's safe HTML
}
```

**How it works:**
1. Create a temporary div
2. Set `textContent` (browser escapes HTML entities)
3. Read back as `innerHTML` (now contains escaped HTML)
4. Result: `<script>` becomes `&lt;script&gt;`

### Input Length Validation

### ? WITHOUT LENGTH LIMITS
```csharp
public async Task SendMessage(string user, string message)
{
    // Attacker could send 1MB message, DoS the server
    await Clients.All.SendAsync("ReceiveMessage", user, message);
}
```

### ? WITH LENGTH LIMITS
```csharp
public async Task SendMessage(string user, string message)
{
    if (user.Length > 50)
        throw new HubException("User name is too long");
    
    if (message.Length > 1000)
        throw new HubException("Message is too long");
    
    await Clients.All.SendAsync("ReceiveMessage", user, message, DateTime.UtcNow);
}
```

**Protection layers:**
1. Frontend validation (UX)
2. Backend validation (Security)
3. Configuration limit (Defense-in-depth)

---

## Logging Best Practices

### ? BEFORE (No Logging)
```csharp
public async Task SendMessage(string user, string message)
{
    await Clients.All.SendAsync("ReceiveMessage", user, message);
    // How do you debug issues? You can't!
}
```

### ? AFTER (Structured Logging)
```csharp
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

public async Task SendMessage(string user, string message)
{
    if (string.IsNullOrWhiteSpace(user))
    {
        _logger.LogWarning("Empty user name attempted");
        throw new HubException("User name cannot be empty");
    }
    
    _logger.LogInformation("Message from {User}: {Message}", user, message);
    await Clients.All.SendAsync("ReceiveMessage", user, message, DateTime.UtcNow);
}

public override async Task OnDisconnectedAsync(Exception? exception)
{
    if (exception != null)
        _logger.LogError(exception, "Client {ClientId} disconnected with error", Context.ConnectionId);
    else
        _logger.LogInformation("Client {ClientId} disconnected", Context.ConnectionId);
    
    await base.OnDisconnectedAsync(exception);
}
```

**Benefits:**
- ? Structured logging (searchable by user, message, etc.)
- ? Log levels (Information, Warning, Error)
- ? Connection tracking
- ? Error diagnostics

---

## Configuration Best Practices

```csharp
builder.Services.AddSignalR(options =>
{
    // Message size limit - prevents DoS attacks
    options.MaximumReceiveMessageSize = 32 * 1024; // 32 KB
    
    // How often client sends a keep-alive ping
    // Keeps connection alive through proxies/firewalls
    options.KeepAliveInterval = TimeSpan.FromSeconds(15);
    
    // How long server waits for client before timing out
    // Prevents "zombie" connections
    options.ClientTimeoutInterval = TimeSpan.FromSeconds(30);
});
```

**Recommended Settings:**
- **Dev**: Relaxed (large messages, short timeouts)
- **Prod**: Strict (small messages, long timeouts, rate limiting)

---

## Summary Checklist

- ? Validate input on **both** client and server
- ? Use `HubException` for meaningful errors
- ? Implement automatic reconnection with backoff
- ? Show connection status to user
- ? Sanitize user input to prevent XSS
- ? Log important events for debugging
- ? Set message size limits
- ? Use structured logging
- ? Handle all connection lifecycle events
- ? Test with slow/unreliable networks

