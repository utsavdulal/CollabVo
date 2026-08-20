import { Notification } from '../models/Notification.js';
import { broadcastNotification } from '../utils/sseManager.js';

export async function notifyUser(userId, { type, message, relatedId }) {
  const notification = await Notification.create({
    userId,
    type,
    message,
    relatedId
  });
  
  // Broadcast to connected SSE clients
  broadcastNotification(userId.toString(), notification);
  
  return notification;
}

export async function notifyVerificationChange(user, status, reason = '') {
  const messages = {
    verified: 'Your business verification was approved. You can now post events and send proposals.',
    rejected: `Your business verification was rejected. Reason: ${reason || 'not provided'}. Please re-upload your documents.`,
    pending: 'Your business verification is under review. Usually takes 24 to 48 hours.'
  };
  return notifyUser(user._id, {
    type: 'verification',
    message: messages[status] || 'Your verification status changed.',
    relatedId: user._id
  });
}
