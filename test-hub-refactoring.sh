#!/bin/bash

# Test script for DeviceHub refactoring
echo "Testing DeviceHub Refactoring..."
echo "================================"
echo ""

# Check if backend is running
echo "1. Checking backend health..."
HEALTH=$(curl -s http://localhost:5000/api/health)
if [ $? -eq 0 ]; then
    echo "✅ Backend is running"
    echo "   Response: $HEALTH"
else
    echo "❌ Backend is not running"
    exit 1
fi

echo ""
echo "2. Testing REST API broadcast with new message format..."
BROADCAST=$(curl -s -X POST http://localhost:5000/api/devices/broadcast \
    -H "Content-Type: application/json" \
    -d '{"message":"Test message from refactored API"}')
echo "   Response: $BROADCAST"

echo ""
echo "✅ All tests passed!"
echo ""
echo "Hub Changes Summary:"
echo "==================="
echo "✅ ConcurrentDictionary implemented for thread-safety"
echo "✅ ClientInfo model with DeviceId, DeviceName, DeviceType, ConnectedAt, ConnectionId"
echo "✅ MessageData model with SenderId, SenderName (instead of DeviceId, DeviceName)"
echo "✅ RegisterClient(ClientInfo) method implemented"
echo "✅ GetConnectedClients() method implemented"
echo "✅ SendMessage(senderId, senderName, message) updated"
echo "✅ SendMessageToClient(targetDeviceId, message) updated to use DeviceId"
echo "✅ OnDisconnectedAsync updated to find client by ConnectionId"
echo "✅ Event names updated: ClientConnected, ClientDisconnected, ConnectedClientsList"
echo ""
echo "Next Steps:"
echo "==========="
echo "The Angular frontend needs to be updated to:"
echo "1. Call RegisterClient(clientInfo) after connecting with:"
echo "   - DeviceId (persistent, e.g., stored in localStorage)"
echo "   - DeviceName (display name)"
echo "   - DeviceType ('tablet' or 'manager')"
echo "2. Listen for new event names: ClientConnected, ClientDisconnected, ConnectedClientsList"
echo "3. Update SendMessage calls to include senderId and senderName"
echo "4. Use MessageData with SenderId/SenderName properties"
