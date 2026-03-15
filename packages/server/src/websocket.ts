import { WebSocketServer, WebSocket } from 'ws';
import type { Server as HttpServer } from 'node:http';

/**
 * Public interface for the AgentOrg WebSocket server.
 */
export interface WSServer {
  /** Broadcast a JSON event to all connected clients. */
  broadcast(event: Record<string, unknown>): void;
  /** Close the WebSocket server and all connections. */
  close(): void;
}

/**
 * Creates a WebSocket server attached to an existing HTTP server.
 * Provides a `broadcast` method to push real-time events to all connected clients.
 *
 * @param server - The HTTP server to attach the WebSocket server to
 * @returns A WSServer with broadcast and close capabilities
 */
export function createWSServer(server: HttpServer): WSServer {
  const wss = new WebSocketServer({ server });

  return {
    /**
     * Send a JSON event to every connected client.
     * Clients that are not in the OPEN state are silently skipped.
     */
    broadcast(event: Record<string, unknown>): void {
      const data = JSON.stringify(event);
      for (const client of wss.clients) {
        if (client.readyState === WebSocket.OPEN) {
          client.send(data);
        }
      }
    },

    /**
     * Close the WebSocket server and terminate all connections.
     */
    close(): void {
      wss.close();
    },
  };
}
