#!/usr/bin/env node

import { Command } from 'commander';
import { createMCPServer } from './mcp-server';
import { version } from '../package.json';
import { extractGetOperations, loadOpenAPIFile } from './openapi';
import { createExpressServer } from './express';

const program = new Command();

program
  .name('openapi-mcp')
  .description('Start an MCP server from an OpenAPI specification')
  .version(version)
  .requiredOption('-s, --spec <path>', 'Path to OpenAPI specification file')
  .option('-t, --target <url>', 'Target URL of the API service', 'http://localhost:8080')
  .option('-p, --port <number>', 'Port to run the MCP server on', '3000')
  .action(async (options) => {
    try {
      const openAPI = await loadOpenAPIFile(options.spec);
      const server = createMCPServer(
        options.target,
        extractGetOperations(openAPI)
      );

      const app = createExpressServer(server);
      const port = parseInt(options.port, 10);

      app.listen(port, () => {
        console.log(`🚀 MCP Server running at http://localhost:${port}/mcp`);
        console.log(`📄 Using OpenAPI spec from: ${options.spec}`);
        console.log(`🎯 Proxying requests to: ${options.target}`);
        console.log('\nTo test the server:');
        console.log('1. Install MCP Inspector: npm install -g @modelcontextprotocol/inspector');
        console.log('2. In another terminal run: mcp-inspector');
        console.log('3. Open VS Code and enable Copilot Agent Mode');
        console.log('\nPress Ctrl+C to stop the server');
      });
    } catch (error) {
      console.error('Error starting MCP server:', error);
      process.exit(1);
    }
  });

program.parse();