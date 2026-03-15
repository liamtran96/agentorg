/**
 * Dev entry point — run with: npx tsx packages/server/src/dev.ts
 */
import http from 'node:http';
import path from 'node:path';
import { ConfigManager, OrgChart, TaskQueue, Orchestrator } from '@agentorg/core';
import { createApp } from './app.js';
import { createWSServer } from './websocket.js';

async function main() {
  const configPath = process.argv[2] || path.resolve(process.cwd(), 'agentorg.config.yaml');
  const port = Number(process.env.PORT) || 3100;

  const configManager = new ConfigManager(configPath);
  const config = configManager.load();
  const orgChart = new OrgChart(config.org);
  const taskQueue = new TaskQueue();
  const orchestrator = new Orchestrator(config);

  const app = createApp({ configManager, orgChart, taskQueue, orchestrator });
  const httpServer = http.createServer(app);
  const wsServer = createWSServer(httpServer);

  httpServer.listen(port, () => {
    const agents = Object.keys(config.org);
    console.log('');
    console.log('  AgentOrg Server Running');
    console.log('  ──────────────────────────────────');
    console.log(`  API:        http://localhost:${port}`);
    console.log(`  Dashboard:  http://localhost:3200`);
    console.log(`  Company:    ${config.company.name}`);
    console.log(`  Agents:     ${agents.length} (${agents.join(', ')})`);
    console.log('  ──────────────────────────────────');
    console.log('  Press Ctrl+C to stop');
    console.log('');
  });

  process.on('SIGINT', () => {
    console.log('\n  Shutting down...');
    wsServer.close();
    httpServer.close(() => {
      console.log('  Server stopped.');
      process.exit(0);
    });
  });
}

main().catch((err) => {
  console.error('Failed to start:', err);
  process.exit(1);
});
