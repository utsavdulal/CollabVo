// In-memory store for SSE clients
const sseClients = new Map();

export function registerSseClient(userId, res) {
  sseClients.set(userId, { res, connectedAt: Date.now() });
}

export function unregisterSseClient(userId) {
  sseClients.delete(userId);
}

export function broadcastNotification(userId, notification) {
  const client = sseClients.get(userId);
  if (client) {
    try {
      client.res.write(`data: ${JSON.stringify(notification)}\n\n`);
    } catch (err) {
      // Client might be disconnected, remove it
      unregisterSseClient(userId);
    }
  }
}

export function getConnectedClients() {
  return sseClients;
}
