// In-memory store for SSE clients (notifications)
const sseClients = new Map();
// Separate store for message SSE clients (supports multiple per user)
const messageSseClients = new Map();

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
      unregisterSseClient(userId);
    }
  }
}

export function registerMessageSseClient(userId, res) {
  if (!messageSseClients.has(userId)) {
    messageSseClients.set(userId, new Set());
  }
  messageSseClients.get(userId).add(res);
}

export function unregisterMessageSseClient(userId, res) {
  const clients = messageSseClients.get(userId);
  if (clients) {
    clients.delete(res);
    if (clients.size === 0) messageSseClients.delete(userId);
  }
}

export function broadcastMessage(userId, event, data) {
  const clients = messageSseClients.get(userId);
  if (!clients) return;
  for (const res of clients) {
    try {
      res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
    } catch (err) {
      unregisterMessageSseClient(userId, res);
    }
  }
}

export function getConnectedClients() {
  return sseClients;
}
