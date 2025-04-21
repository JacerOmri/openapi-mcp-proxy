#!/usr/bin/env node
import { Command } from 'commander';
import { createMCPServer } from './mcp-server';
import { createExpressServer } from './express';
import { loadOpenAPIFile, extractGetOperations } from './openapi';
import { createLogger } from './logger';

const logger = createLogger('cli');
const program = new Command();

program
  .description('Start an MCP server for an OpenAPI service')
  .requiredOption('-s, --spec <path>', 'Path to OpenAPI specification file')
  .option('-t, --target <url>', 'Target URL of the API service', 'http://localhost:8080')
  .option('-p, --port <number>', 'Port to run the MCP server on', '3000')
  .action(async (options) => {
    try {

      // Load and parse OpenAPI spec
      const openAPI = await loadOpenAPIFile(options.spec);

      const server = createMCPServer(
        options.target,
        extractGetOperations(openAPI)
      );

      const app = createExpressServer(server);
      const port = parseInt(options.port, 10);

      app.listen(port, () => {
        logger.info(`🚀 MCP Server running at http://localhost:${port}/mcp`);
        logger.info(`📄 Using OpenAPI spec from: ${options.spec}`);
        logger.info(`🎯 Proxying requests to: ${options.target}`);

        logger.info('\nTo test the server:');
        logger.info('1. Install MCP Inspector: npm install -g @modelcontextprotocol/inspector');
        logger.info('2. In another terminal run: mcp-inspector');
        logger.info('3. Open VS Code and enable Copilot Agent Mode');
        logger.info('\nPress Ctrl+C to stop the server');
      });
    } catch (error) {
      logger.error({ error }, 'Error starting MCP server');
      process.exit(1);
    }
  });

program.parse();