import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createServer, type Server as HttpServer } from 'node:http';
import { createApp, createWSServer, type WSServer } from '@agentorg/server';
import { WebSocket } from 'ws';
import type { CompanyConfig } from '@agentorg/core';
import { AddressInfo } from 'node:net';

const testConfig: CompanyConfig = {
  company: {
    name: 'Test Co',
    description: 'A test company',
    timezone: 'UTC',
    businessHours: '09:00-18:00',
  },
  org: {
    ceo: {
      id: 'ceo',
      name: 'Alex',
      role: 'ceo',
      runtime: 'anthropic-api',
      personality: '',
      budget: 50,
      reportsTo: 'board',
      skills: ['email'],
      heartbeat: { schedule: '0 */4 * * *', tasks: ['review_agents'] },
    },
  },
};

/**
 * Helper to create a WebSocket client connected to the test server.
 * Returns a promise that resolves once the connection is open.
 */
function connectClient(port: number): Promise<WebSocket> {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(`ws://127.0.0.1:${port}`);
    ws.on('open', () => resolve(ws));
    ws.on('error', reject);
  });
}

/**
 * Helper to wait for the next message on a WebSocket client.
 */
function waitForMessage(ws: WebSocket): Promise<Record<string, unknown>> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('Timed out waiting for message')), 5000);
    ws.once('message', (data) => {
      clearTimeout(timeout);
      resolve(JSON.parse(data.toString()));
    });
  });
}

describe('Server — WebSocket', () => {
  let httpServer: HttpServer;
  let wsServer: WSServer;
  let port: number;
  const clients: WebSocket[] = [];

  beforeEach(async () => {
    const app = createApp(testConfig);
    httpServer = createServer(app);
    wsServer = createWSServer(httpServer);

    // Start listening on a random port
    await new Promise<void>((resolve) => {
      httpServer.listen(0, '127.0.0.1', () => {
        port = (httpServer.address() as AddressInfo).port;
        resolve();
      });
    });
  });

  afterEach(async () => {
    // Close all test clients
    for (const client of clients) {
      if (client.readyState === WebSocket.OPEN) {
        client.close();
      }
    }
    clients.length = 0;

    // Close servers
    wsServer.close();
    await new Promise<void>((resolve, reject) => {
      httpServer.close((err) => (err ? reject(err) : resolve()));
    });
  });

  // ─── Connection ─────────────────────────────────────────────────────────

  it('should accept WebSocket connections', async () => {
    const ws = await connectClient(port);
    clients.push(ws);

    expect(ws.readyState).toBe(WebSocket.OPEN);
  });

  // ─── Config change broadcast ──────────────────────────────────────────

  it('should broadcast config change events to connected clients', async () => {
    const ws = await connectClient(port);
    clients.push(ws);

    const messagePromise = waitForMessage(ws);

    wsServer.broadcast({
      type: 'config:updated',
      section: 'company',
      data: { name: 'Updated Co' },
    });

    const msg = await messagePromise;
    expect(msg.type).toBe('config:updated');
    expect(msg.section).toBe('company');
    expect(msg.data).toEqual({ name: 'Updated Co' });
  });

  // ─── Task update broadcast ───────────────────────────────────────────

  it('should broadcast task update events', async () => {
    const ws = await connectClient(port);
    clients.push(ws);

    const messagePromise = waitForMessage(ws);

    wsServer.broadcast({
      type: 'task:updated',
      taskId: 'task_001',
      status: 'completed',
      result: 'Blog post written',
    });

    const msg = await messagePromise;
    expect(msg.type).toBe('task:updated');
    expect(msg.taskId).toBe('task_001');
    expect(msg.status).toBe('completed');
    expect(msg.result).toBe('Blog post written');
  });

  // ─── Heartbeat broadcast ─────────────────────────────────────────────

  it('should broadcast heartbeat events', async () => {
    const ws = await connectClient(port);
    clients.push(ws);

    const messagePromise = waitForMessage(ws);

    wsServer.broadcast({
      type: 'heartbeat:fired',
      agentId: 'ceo',
      timestamp: '2026-03-15T10:00:00Z',
      tasksCompleted: 2,
    });

    const msg = await messagePromise;
    expect(msg.type).toBe('heartbeat:fired');
    expect(msg.agentId).toBe('ceo');
    expect(msg.tasksCompleted).toBe(2);
  });

  // ─── Client disconnect ───────────────────────────────────────────────

  it('should handle client disconnect gracefully', async () => {
    const ws = await connectClient(port);
    clients.push(ws);

    // Close the client
    ws.close();

    // Wait for the close to propagate
    await new Promise<void>((resolve) => {
      ws.on('close', () => resolve());
    });

    // Broadcasting after disconnect should not throw
    expect(() => {
      wsServer.broadcast({
        type: 'config:updated',
        section: 'company',
        data: { name: 'After disconnect' },
      });
    }).not.toThrow();
  });

  // ─── Multiple clients ────────────────────────────────────────────────

  it('should deliver the same broadcast to multiple clients', async () => {
    const ws1 = await connectClient(port);
    const ws2 = await connectClient(port);
    const ws3 = await connectClient(port);
    clients.push(ws1, ws2, ws3);

    const msg1Promise = waitForMessage(ws1);
    const msg2Promise = waitForMessage(ws2);
    const msg3Promise = waitForMessage(ws3);

    wsServer.broadcast({
      type: 'task:created',
      taskId: 'task_broadcast',
      title: 'Broadcast test',
    });

    const [msg1, msg2, msg3] = await Promise.all([msg1Promise, msg2Promise, msg3Promise]);

    expect(msg1.type).toBe('task:created');
    expect(msg2.type).toBe('task:created');
    expect(msg3.type).toBe('task:created');

    expect(msg1.taskId).toBe('task_broadcast');
    expect(msg2.taskId).toBe('task_broadcast');
    expect(msg3.taskId).toBe('task_broadcast');
  });

  // ─── Selective delivery (only open clients) ──────────────────────────

  it('should only deliver to clients that are still connected', async () => {
    const ws1 = await connectClient(port);
    const ws2 = await connectClient(port);
    clients.push(ws1, ws2);

    // Disconnect ws1
    ws1.close();
    await new Promise<void>((resolve) => {
      ws1.on('close', () => resolve());
    });

    const msg2Promise = waitForMessage(ws2);

    wsServer.broadcast({
      type: 'task:updated',
      taskId: 'task_after_disconnect',
      status: 'in_progress',
    });

    const msg2 = await msg2Promise;
    expect(msg2.type).toBe('task:updated');
    expect(msg2.taskId).toBe('task_after_disconnect');

    // ws1 should not have received the message (it's closed)
    expect(ws1.readyState).toBe(WebSocket.CLOSED);
  });
});
