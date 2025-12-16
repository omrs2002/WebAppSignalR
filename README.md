# WebAppSignalR

A modern real-time chat application built with **ASP.NET Core 8** and **SignalR**, demonstrating best practices for real-time bidirectional communication between clients and servers.

## ?? Project Overview

WebAppSignalR is a learning-focused chat application that showcases how to build robust, scalable real-time applications using Microsoft's SignalR framework. The application implements industry best practices for validation, error handling, security, and accessibility.

---

## ??? Architecture

### High-Level Architecture

```
???????????????????????????????????????????????????????????????
?                     Browser Clients                          ?
?  ????????????????  ????????????????  ????????????????      ?
?  ?   Client 1   ?  ?   Client 2   ?  ?   Client N   ?      ?
?  ?  (Chat.js)   ?  ?  (Chat.js)   ?  ?  (Chat.js)   ?      ?
?  ????????????????  ????????????????  ????????????????      ?
?????????????????????????????????????????????????????????????
           ? WebSocket     ? WebSocket     ? WebSocket
           ? Connection    ? Connection    ? Connection
           ?               ?               ?
???????????????????????????????????????????????????????????????
?                   ASP.NET Core 8 Server                      ?
?                                                              ?
?  ?????????????????????????????????????????????????????????? ?
?  ?                    SignalR Hub                         ? ?
?  ?  ???????????????????????????????????????????????????? ? ?
?  ?  ?  ChatHub                                         ? ? ?
?  ?  ?  • SendMessage()  - Receives messages           ? ? ?
?  ?  ?  • ReceiveMessage - Broadcasts to all clients   ? ? ?
?  ?  ?  • Connection Lifecycle Management              ? ? ?
?  ?  ?  • Input Validation & Error Handling            ? ? ?
?  ?  ?  • Structured Logging                           ? ? ?
?  ?  ???????????????????????????????????????????????????? ? ?
?  ?????????????????????????????????????????????????????????? ?
?                                                              ?
?  ?????????????????????????????????????????????????????????? ?
?  ?            Razor Pages UI (Index.cshtml)             ? ?
?  ?  • Real-time message display                         ? ?
?  ?  • Connection status indicator                       ? ?
?  ?  • User input form with validation                   ? ?
?  ?  • WCAG accessibility compliance                     ? ?
?  ?????????????????????????????????????????????????????????? ?
?                                                              ?
?  ?????????????????????????????????????????????????????????? ?
?  ?              Middleware Pipeline                      ? ?
?  ?  • CORS Configuration                                ? ?
?  ?  • SignalR Route Mapping (/chatHub)                  ? ?
?  ?  • Static File Serving                               ? ?
?  ?  • Logging Configuration                             ? ?
?  ?????????????????????????????????????????????????????????? ?
????????????????????????????????????????????????????????????????
```

### Connection Flow

```
1. CLIENT INITIALIZATION
   ?? Page loads ? Chat.js executes
   ?? HubConnectionBuilder creates connection
   ?? Reconnection strategy configured
   ?? Connection.start() initiates WebSocket

2. CONNECTION ESTABLISHED
   ?? Server accepts connection
   ?? OnConnectedAsync() called
   ?? ConnectionId assigned
   ?? Client notified ? UI enabled
   ?? Status shows "Connected"

3. MESSAGE EXCHANGE
   ?? User enters message & clicks Send
   ?? Client-side validation
   ?? Server-side validation
   ?? Hub processes SendMessage()
   ?? Server broadcasts ReceiveMessage
   ?? All clients receive & display
   ?? User sees confirmation

4. ERROR HANDLING
   ?? Validation fails ? HubException thrown
   ?? Client catches & displays error
   ?? User can retry
   ?? Logged for debugging

5. RECONNECTION HANDLING
   ?? Network interruption detected
   ?? Exponential backoff triggered
   ?? Automatic reconnection attempted
   ?? Status updates: "Reconnecting..."
   ?? Success ? "Connected" restored
   ?? No message loss on reconnect
```

---

## ??? Tech Stack

### Backend
| Technology | Version | Purpose |
|-----------|---------|---------|
| **ASP.NET Core** | 8.0 | Web framework with minimal hosting |
| **SignalR** | Built-in | Real-time communication |
| **C#** | 12 | Backend language |
| **Razor Pages** | Built-in | Server-side rendering |
| **.NET Logging** | Built-in | Structured logging |

### Frontend
| Technology | Version | Purpose |
|-----------|---------|---------|
| **SignalR JavaScript Client** | Latest | Real-time client communication |
| **Bootstrap** | 5.x | Responsive styling |
| **jQuery** | 3.x | DOM manipulation (validation support) |
| **Vanilla JavaScript** | ES6+ | Custom logic & reconnection |
| **HTML5** | 5 | Semantic markup with ARIA |

### Infrastructure
| Technology | Purpose |
|-----------|---------|
| **WebSocket Protocol** | Primary transport mechanism |
| **HTTP/2** | Fallback transport |
| **JSON** | Message serialization |
| **.gitignore** | Git repository management |

---

## ?? SignalR Overview

### What is SignalR?

**SignalR** is a real-time communication framework that abstracts away the complexity of maintaining persistent connections between client and server. It enables bidirectional communication with automatic transport selection.

### Key Features Used

#### 1. **Real-Time Bidirectional Communication**
```
Traditional HTTP: Client ? Server (Request/Response)
SignalR: Client ? Server (Persistent Connection)
```

#### 2. **Automatic Transport Selection**
SignalR automatically selects the best transport based on server and client capabilities:
- **WebSocket** (Primary) - Full-duplex, low-latency
- **Server-Sent Events (SSE)** - Server ? Client streaming
- **Long Polling** (Fallback) - HTTP-based fallback for older browsers

#### 3. **Hub-Based Architecture**
```csharp
// Server-side Hub
public class ChatHub : Hub
{
    // Client calls server
    public async Task SendMessage(string user, string message)
    {
        // Server broadcasts to all clients
        await Clients.All.SendAsync("ReceiveMessage", user, message, timestamp);
    }
}

// Client-side JavaScript
connection.on("ReceiveMessage", (user, message, timestamp) => {
    displayMessage(user, message, timestamp);
});
```

#### 4. **Automatic Reconnection**
```javascript
.withAutomaticReconnect([
    0,      // Immediate
    0,      // Immediate  
    3000,   // 3 seconds
    5000,   // 5 seconds
    10000,  // 10 seconds
    15000,  // 15 seconds
    30000   // 30 seconds
])
```

#### 5. **Connection Lifecycle Events**
```javascript
connection.onreconnecting();  // Connection interrupted
connection.onreconnected();   // Connection restored
connection.onclose();         // Connection closed
```

### Why SignalR?

| Benefit | Why It Matters |
|---------|----------------|
| **Real-Time** | Instant message delivery, no polling delays |
| **Scalable** | Handles thousands of concurrent connections |
| **Resilient** | Automatic reconnection with exponential backoff |
| **Protocol Agnostic** | Works across different network conditions |
| **Type-Safe** | Strong-typed communication with C# |
| **Built-in** | Ships with ASP.NET Core 8 |

---

## ?? How It Works

### Step-by-Step Message Flow

#### 1. User Sends a Message

**Client-Side (Chat.js)**
```javascript
// User clicks Send button
sendButton.addEventListener("click", function (event) {
    const user = userInput.value;
    const message = messageInput.value;
    
    // Validate locally
    const errors = validateInputs(user, message);
    if (errors.length > 0) {
        alert("Validation errors:\n" + errors.join("\n"));
        return;
    }
    
    // Send to server via SignalR
    connection.invoke("SendMessage", user, message)
        .then(() => messageInput.value = "")
        .catch(err => alert("Send failed: " + err));
});
```

#### 2. Server Receives & Validates

**Server-Side (ChatHub.cs)**
```csharp
public async Task SendMessage(string user, string message)
{
    // Backend validation (defense in depth)
    if (string.IsNullOrWhiteSpace(user))
        throw new HubException("User name cannot be empty");
    
    if (message.Length > 1000)
        throw new HubException("Message is too long");
    
    // Log for debugging
    _logger.LogInformation("Message from {User}: {Message}", user, message);
    
    // Broadcast to all connected clients
    await Clients.All.SendAsync("ReceiveMessage", user, message, DateTime.UtcNow);
}
```

#### 3. Server Broadcasts to All Clients

**Broadcast Pattern**
```
SendMessage(user, message)
    ?
Server validates
    ?
Clients.All.SendAsync("ReceiveMessage", ...)
    ?
All connected clients receive
    ?
onReceiveMessage handler triggers
```

#### 4. All Clients Display Message

**Client-Side (Chat.js)**
```javascript
connection.on("ReceiveMessage", function (user, message, timestamp) {
    // Sanitize to prevent XSS
    const sanitizedUser = sanitizeHtml(user);
    const sanitizedMessage = sanitizeHtml(message);
    
    // Create DOM element
    const li = document.createElement("li");
    li.textContent = `${sanitizedUser}: ${sanitizedMessage} (${timestamp})`;
    
    // Add to message list
    messagesList.appendChild(li);
    messagesList.scrollTop = messagesList.scrollHeight;
});
```

---

## ?? Security Considerations

### Input Validation (Defense in Depth)

**Client-Side Validation** (UX)
```javascript
// Prevent empty messages, length limits
function validateInputs(user, message) {
    const errors = [];
    if (!user || user.trim().length === 0)
        errors.push("User name is required");
    if (user.length > 50)
        errors.push("User name must be 50 characters or less");
    if (!message || message.trim().length === 0)
        errors.push("Message cannot be empty");
    if (message.length > 1000)
        errors.push("Message must be 1000 characters or less");
    return errors;
}
```

**Server-Side Validation** (Security)
```csharp
// Same checks enforced on server
if (string.IsNullOrWhiteSpace(user))
    throw new HubException("User name cannot be empty");
if (user.Length > 50)
    throw new HubException("User name is too long");
if (message.Length > 1000)
    throw new HubException("Message is too long");
```

### XSS Prevention

**Sanitization Pattern**
```javascript
function sanitizeHtml(text) {
    const div = document.createElement("div");
    div.textContent = text;        // Escapes dangerous characters
    return div.innerHTML;          // Safe HTML entities
}
// Result: "<script>" becomes "&lt;script&gt;"
```

### Message Size Limits

```csharp
// Prevent DoS attacks via large messages
builder.Services.AddSignalR(options =>
{
    options.MaximumReceiveMessageSize = 32 * 1024; // 32 KB limit
});
```

---

## ?? Configuration

### SignalR Options (Program.cs)

```csharp
builder.Services.AddSignalR(options =>
{
    // Maximum message size (prevents DoS)
    options.MaximumReceiveMessageSize = 32 * 1024;
    
    // Keep-alive interval (maintains connection through proxies)
    options.KeepAliveInterval = TimeSpan.FromSeconds(15);
    
    // Client timeout (prevents zombie connections)
    options.ClientTimeoutInterval = TimeSpan.FromSeconds(30);
});

// Hub route mapping
app.MapHub<ChatHub>("/chatHub");
```

### CORS Configuration

```csharp
// Enable cross-origin requests
builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(builder =>
    {
        builder.AllowAnyOrigin()
               .AllowAnyMethod()
               .AllowAnyHeader();
    });
});
```

---

## ?? Project Structure

```
WebAppSignalR/
??? Hubs/
?   ??? ChatHub.cs                  # SignalR Hub - handles real-time communication
??? Pages/
?   ??? Index.cshtml                # Chat UI - accessible, WCAG compliant
?   ??? Index.cshtml.cs             # Page model
?   ??? Shared/
?       ??? _Layout.cshtml          # Master layout
??? wwwroot/
?   ??? js/
?   ?   ??? Chat.js                 # Client-side SignalR logic
?   ??? css/
?   ?   ??? site.css                # Styling
?   ??? lib/
?       ??? signalr/                # SignalR JavaScript client
?       ??? bootstrap/              # Bootstrap CSS framework
?       ??? jquery/                 # jQuery library
??? Program.cs                      # Application configuration & startup
??? WebAppSignalR.csproj           # Project file (.NET 8)
??? appsettings.json               # Configuration settings
??? .gitignore                     # Git ignore rules
```

---

## ?? Getting Started

### Prerequisites
- **.NET 8 SDK** or later
- **Visual Studio 2022** or **VS Code**
- **Modern web browser** (Chrome, Firefox, Edge, Safari)

### Running the Application

```bash
# Navigate to project directory
cd WebAppSignalR

# Restore NuGet packages
dotnet restore

# Run the application
dotnet run

# Application runs on https://localhost:5001
```

### Testing the Chat

1. Open browser to `https://localhost:5001`
2. Open multiple browser tabs/windows
3. Enter a username and message
4. Click "Send Message"
5. See message appear in all windows in real-time

---

## ?? Key Features

### ? Real-Time Communication
- Instant message delivery using WebSockets
- No page refresh required
- Multiple concurrent connections supported

### ? Error Handling & Validation
- Client-side validation for UX
- Server-side validation for security
- Clear error messages to users
- Structured logging for debugging

### ? Resilience & Reliability
- Automatic reconnection with exponential backoff
- Connection status indicator
- Handles network interruptions gracefully

### ? Security
- Input validation (both client & server)
- XSS prevention via HTML sanitization
- Message size limits (DoS prevention)
- CORS configuration

### ? Accessibility
- WCAG 2.1 compliance
- Semantic HTML with ARIA labels
- Screen reader friendly
- Keyboard accessible

### ? Performance
- Efficient WebSocket protocol
- Exponential backoff prevents server overload
- Message size limits

---

## ?? Best Practices Demonstrated

| Practice | Implementation | Location |
|----------|----------------|----------|
| **Input Validation** | Both client & server | Chat.js, ChatHub.cs |
| **Error Handling** | HubException with meaningful messages | ChatHub.cs |
| **Logging** | Structured logging with ILogger | ChatHub.cs |
| **Dependency Injection** | ILogger injected | ChatHub.cs |
| **Async/Await** | All Hub methods async | ChatHub.cs |
| **Connection Lifecycle** | Proper handler setup | Chat.js |
| **XSS Prevention** | HTML sanitization | Chat.js |
| **Accessibility** | WCAG compliance | Index.cshtml |
| **Responsive Design** | Bootstrap grid system | Index.cshtml |
| **Configuration** | SignalR options | Program.cs |

---

## ?? Understanding SignalR Communication Flow

### Message Lifecycle

```
???????????????????????
?  User Types Message ?
???????????????????????
           ?
           ?
????????????????????????????
?  Client-Side Validation  ?
?  • Check non-empty       ?
?  • Check length limits   ?
????????????????????????????
           ?
           ?
????????????????????????????
?  Send via SignalR        ?
?  connection.invoke()     ?
????????????????????????????
           ?
           ? (WebSocket)
????????????????????????????
?  Server Receives Request ?
?  • ChatHub.SendMessage() ?
????????????????????????????
           ?
           ?
????????????????????????????
?  Server-Side Validation  ?
?  • Check non-empty       ?
?  • Check length limits   ?
?  • Throw HubException    ?
????????????????????????????
           ?
           ?
????????????????????????????
?  Broadcast to All        ?
?  Clients.All.SendAsync() ?
????????????????????????????
           ?
           ? (WebSocket to all)
????????????????????????????
?  Client Receives Message ?
?  • onReceiveMessage()    ?
????????????????????????????
           ?
           ?
????????????????????????????
?  Sanitize HTML           ?
?  • Prevent XSS           ?
????????????????????????????
           ?
           ?
????????????????????????????
?  Display in Browser      ?
?  • Add to DOM            ?
?  • Auto-scroll           ?
?  • Show timestamp        ?
????????????????????????????
```

---

## ?? What You'll Learn

### Backend Concepts
- SignalR Hub architecture
- Server-to-client broadcasting
- Connection lifecycle management
- Error handling with HubException
- Structured logging patterns

### Frontend Concepts
- SignalR JavaScript client
- Connection state management
- Automatic reconnection strategies
- Event-driven programming
- DOM manipulation & sanitization

### Cross-Cutting Concerns
- Input validation patterns
- Security best practices
- CORS configuration
- Logging & diagnostics
- Accessibility compliance

---

## ?? References

### Official Documentation
- [ASP.NET Core SignalR Docs](https://docs.microsoft.com/aspnet/core/signalr)
- [SignalR Security Best Practices](https://docs.microsoft.com/aspnet/core/signalr/security)
- [SignalR Configuration Reference](https://docs.microsoft.com/aspnet/core/signalr/configuration)
- [SignalR JavaScript Client API](https://docs.microsoft.com/javascript/api/@microsoft/signalr)

### Security Resources
- [OWASP XSS Prevention](https://owasp.org/www-community/attacks/xss/)
- [OWASP Input Validation](https://owasp.org/www-community/controls/Input_Validation)
- [MDN Web Security](https://developer.mozilla.org/docs/Web/Security)

### Accessibility
- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [Web Accessibility Initiative](https://www.w3.org/WAI/)

---

## ?? License

This project is provided as a learning resource.

---

## ? Summary

**WebAppSignalR** demonstrates how to build a modern real-time chat application using ASP.NET Core 8 and SignalR. The application showcases:

- ? Real-time bidirectional communication via WebSockets
- ? Robust validation, error handling, and logging
- ? Security best practices (XSS prevention, input validation)
- ? Resilient connection management with automatic reconnection
- ? WCAG accessibility compliance
- ? Clean architecture and best practices

Perfect for learning how to build scalable, secure real-time applications! ??
