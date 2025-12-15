"use strict";

const connection = new signalR.HubConnectionBuilder()
    .withUrl("/chatHub")
    .withAutomaticReconnect([0, 0, 3000, 5000, 10000, 15000, 30000]) // Retry strategy with exponential backoff
    .withHubProtocol(new signalR.JsonHubProtocol())
    .build();

// Disable send button until connection is established
const sendButton = document.getElementById("sendButton");
const userInput = document.getElementById("userInput");
const messageInput = document.getElementById("messageInput");
const messagesList = document.getElementById("messagesList");
const connectionStatus = document.getElementById("connectionStatus");

sendButton.disabled = true;

// Display connection status
function updateConnectionStatus(message, isConnected) {
    if (connectionStatus) {
        connectionStatus.textContent = message;
        connectionStatus.className = isConnected ? "text-success" : "text-danger";
    }
    console.log("Connection Status: " + message);
}

// Handle incoming messages
connection.on("ReceiveMessage", function (user, message, timestamp) {
    // Sanitize user input to prevent XSS
    const sanitizedUser = sanitizeHtml(user);
    const sanitizedMessage = sanitizeHtml(message);
    
    const formattedTime = new Date(timestamp).toLocaleTimeString();
    const encodedMsg = `${sanitizedUser} [${formattedTime}]: ${sanitizedMessage}`;
    
    const li = document.createElement("li");
    li.textContent = encodedMsg;
    li.className = "message-item";
    messagesList.appendChild(li);
    
    // Auto-scroll to latest message
    messagesList.scrollTop = messagesList.scrollHeight;
});

// Handle connection errors
connection.on("ReceiveError", function (error) {
    const li = document.createElement("li");
    li.textContent = `Error: ${error}`;
    li.className = "error-message";
    messagesList.appendChild(li);
});

// Connection state changed
connection.onreconnecting((error) => {
    updateConnectionStatus("Reconnecting...", false);
    sendButton.disabled = true;
});

connection.onreconnected((connectionId) => {
    updateConnectionStatus("Connected", true);
    sendButton.disabled = false;
    console.log("Reconnected with connection ID: " + connectionId);
});

connection.onclose((error) => {
    updateConnectionStatus("Disconnected", false);
    sendButton.disabled = true;
    if (error) {
        console.error("Connection closed with error: " + error);
    }
});

// Helper function to sanitize HTML
function sanitizeHtml(text) {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
}

// Start connection
connection.start()
    .then(function () {
        updateConnectionStatus("Connected", true);
        sendButton.disabled = false;
    })
    .catch(function (err) {
        console.error("Connection failed: " + err.toString());
        updateConnectionStatus("Connection failed", false);
    });

// Validate inputs before sending
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

// Send message handler
sendButton.addEventListener("click", function (event) {
    const user = userInput.value;
    const message = messageInput.value;
    
    // Validate inputs
    const errors = validateInputs(user, message);
    if (errors.length > 0) {
        alert("Validation errors:\n" + errors.join("\n"));
        return;
    }
    
    // Send message
    connection.invoke("SendMessage", user, message)
        .then(function () {
            // Clear input on successful send
            messageInput.value = "";
        })
        .catch(function (err) {
            console.error("Error sending message: " + err.toString());
            alert("Failed to send message: " + err.toString());
        });
    
    event.preventDefault();
});

// Allow sending message with Enter key
messageInput.addEventListener("keypress", function (event) {
    if (event.key === "Enter" && !sendButton.disabled) {
        sendButton.click();
    }
});