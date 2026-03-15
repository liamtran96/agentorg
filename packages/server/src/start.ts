import http from 'node:http';
import type { Express } from 'express';
import { ConfigManager, OrgChart, TaskQueue, Orchestrator } from '@agentorg/core';
import { createApp } from './app.js';
import { createWSServer, type WSServer } from './websocket.js';

/** Default port the AgentOrg server listens on. */
const DEFAULT_PORT = 3100;

/** Default config file path. */
const DEFAULT_CONFIG_PATH = 'agentorg.config.yaml';

/**
 * Options accepted by startServer.
 */
export interface StartServerOptions {
  /** Path to the YAML config file. Defaults to "agentorg.config.yaml". */
  configPath?: string;
  /** Port to listen on. Defaults to 3100. */
  port?: number;
}

/**
 * Handle returned by startServer — gives callers access to
 * the underlying server objects and a clean shutdown method.
 */
export interface ServerHandle {
  /** The underlying Node.js HTTP server. */
  server: http.Server;
  /** The configured Express application. */
  app: Express;
  /** The WebSocket server attached to the HTTP server. */
  wsServer: WSServer;
  /** Gracefully shuts down the HTTP and WebSocket servers. */
  stop: () => Promise<void>;
}

/**
 * Boots the full AgentOrg server stack:
 * 1. Loads config via ConfigManager
 * 2. Creates OrgChart, TaskQueue, Orchestrator from config
 * 3. Creates the Express app with injected services
 * 4. Creates an HTTP server and attaches WebSocket
 * 5. Listens on the requested port
 *
 * @param options - Server start options
 * @returns A ServerHandle with access to server objects and a stop() method
 */
export async function startServer(options: StartServerOptions = {}): Promise<ServerHandle> {
  const configPath = options.configPath ?? DEFAULT_CONFIG_PATH;
  const port = options.port ?? DEFAULT_PORT;

  // 1. Load configuration
  const configManager = new ConfigManager(configPath);
  const config = configManager.load();

  // 2. Build runtime objects from config
  const orgChart = new OrgChart(config.org);
  const taskQueue = new TaskQueue();
  const orchestrator = new Orchestrator(config);

  // 3. Create Express app with injected services
  const app = createApp({ configManager, orgChart, taskQueue, orchestrator });

  // 4. Create HTTP server + WebSocket
  const httpServer = http.createServer(app);
  const wsServer = createWSServer(httpServer);

  // 5. Listen — wrapped in a promise so callers can await it
  await new Promise<void>((resolve, reject) => {
    const onError = (err: Error) => reject(err);
    httpServer.on('error', onError);
    httpServer.listen(port, () => {
      httpServer.removeListener('error', onError);
      resolve();
    });
  });

  // 6. Return handle
  return {
    server: httpServer,
    app,
    wsServer,
    stop: () =>
      new Promise<void>((resolve, reject) => {
        wsServer.close();
        httpServer.close((err) => {
          if (err) reject(err);
          else resolve();
        });
      }),
  };
}
