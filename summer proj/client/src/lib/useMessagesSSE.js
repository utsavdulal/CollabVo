import { useEffect, useRef, useCallback } from 'react';
import { getAccessToken } from './api.js';

export function useMessagesSSE(handlers = {}) {
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;

  useEffect(() => {
    const token = getAccessToken();
    if (!token) return;

    let es;
    let retryTimeout;

    function connect() {
      const base = import.meta.env.VITE_API_URL || '/api';
      es = new EventSource(`${base}/messages/stream?token=${encodeURIComponent(token)}`);

      es.addEventListener('new-message', (e) => {
        try {
          const data = JSON.parse(e.data);
          handlersRef.current.onNewMessage?.(data);
        } catch {}
      });

      es.addEventListener('conversation-updated', (e) => {
        try {
          const data = JSON.parse(e.data);
          handlersRef.current.onConversationUpdated?.(data);
        } catch {}
      });

      es.addEventListener('conversation-accepted', (e) => {
        try {
          const data = JSON.parse(e.data);
          handlersRef.current.onConversationAccepted?.(data);
        } catch {}
      });

      es.onerror = () => {
        es.close();
        retryTimeout = setTimeout(connect, 3000);
      };
    }

    connect();

    return () => {
      clearTimeout(retryTimeout);
      es?.close();
    };
  }, []);
}
