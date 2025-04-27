#!/usr/bin/env node
import { Command, Option } from 'commander';
import { createMCPServer } from './mcp-server';
import { createExpressServer } from './express';
import { loadOpenAPIFile, extractReadOperations, extractWriteOperations } from './openapi';
import { createLogger } from './logger';

const logger = createLogger('cli');
const program = new Command();

program
  .description('Start an MCP server for an OpenAPI service')
  .addOption(
    new Option('-s, --spec <path>', 'Path to OpenAPI specification file')
      .makeOptionMandatory(true)
      .env('OMP_OPENAPI_SPEC_FILE')
  )
  .addOption(
    new Option('-t, --target <url>', 'Target URL of the API service')
      .default('http://localhost:8080')
      .env('OMP_TARGET_BASE_URL')
  )
  .addOption(
    new Option('-p, --port <number>', 'Port to run the MCP server on')
      .default('3000')
      .env('PORT')
  )
  .action(async (options) => {
    try {

      // Load and parse OpenAPI spec
      const openAPI = await loadOpenAPIFile(options.spec);

      const server = createMCPServer(
        options.target,
        [
          ...extractReadOperations(openAPI),
          ...extractWriteOperations(openAPI)
        ]
      );

      const app = createExpressServer(server);
      const port = parseInt(options.port, 10);

      app.listen(port, () => {
        logger.info(`🚀 MCP Server running at http://localhost:${port}/mcp`);
        logger.info(`📄 Using OpenAPI spec from: ${options.spec}`);
        logger.info(`🎯 Proxying requests to: ${options.target}`);

        logger.info('To test the server:');
        logger.info('1. Install MCP Inspector: npm install -g @modelcontextprotocol/inspector');
        logger.info('2. In another terminal run: mcp-inspector');
        logger.info('3. Open VS Code and enable Copilot Agent Mode');
        logger.info('Press Ctrl+C to stop the server');
      });
    } catch (error) {
      logger.error({ error }, 'Error starting MCP server');
      process.exit(1);
    }
  });

program.parse();