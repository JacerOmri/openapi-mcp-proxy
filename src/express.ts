import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import express, { Request, Response } from 'express';
import { TransportStore } from './transports-store';
import { createLogger } from './logger';

const logger = createLogger('express');

export function createExpressServer(mcpServer: McpServer): express.Application {
  const app = express();
  app.use(express.json());
  const transports = new TransportStore();

  // Store transports by session ID

  // SSE endpoint for establishing the stream
  app.get('/mcp', async (req: Request, res: Response) => {
    logger.info('Received GET request to /sse (establishing SSE stream)');

    try {
      // Create a new SSE transport for the client
      // The endpoint for POST messages is '/messages'
      const transport = new SSEServerTransport('/messages', res);

      // Store the transport by session ID
      const sessionId = transport.sessionId;
      transports.store(sessionId, transport);

      // Set up onclose handler to clean up transport when closed
      transport.onclose = () => {
        logger.info(`SSE transport closed for session ${sessionId}`);
        transports.remove(sessionId);
      };

      // Connect the transport to the MCP server
      await mcpServer.connect(transport);

      // Start the SSE transport to begin streaming
      // This sends an initial 'endpoint' event with the session ID in the URL
      await transport.start();

      logger.info(`Established SSE stream with session ID: ${sessionId}`);
    } catch (error) {
      logger.error('Error establishing SSE stream:', error);
      if (!res.headersSent) {
        res.status(500).send('Error establishing SSE stream');
      }
    }
  });

  // Messages endpoint for receiving client JSON-RPC requests
  app.post('/messages', async (req: Request, res: Response) => {
    logger.debug('Received POST request to /messages');

    // Extract session ID from URL query parameter
    // In the SSE protocol, this is added by the client based on the endpoint event
    const sessionId = req.query.sessionId as string | undefined;

    if (!sessionId) {
      logger.error('No session ID provided in request URL');
      res.status(400).send('Missing sessionId parameter');
      return;
    }

    const transport = transports.get(sessionId);
    if (!transport) {
      logger.error(`No active transport found for session ID: ${sessionId}`);
      res.status(404).send('Session not found');
      return;
    }

    try {
      logger.debug({ body: req.body }, 'Processing message');
      await transport.handlePostMessage(req, res, req.body);
    } catch (error) {
      logger.error('Error handling request:', error);
      if (!res.headersSent) {
        res.status(500).send('Error handling request');
      }
    }
  });

  // Handle server shutdown
  const cleanup = async () => {
    logger.info('Shutting down server...');

    // Close all active transports to properly clean up resources
    transports.clear();
    await mcpServer.close();
    logger.info('Server shutdown complete');
  };

  process.on('SIGINT', async () => {
    await cleanup();
    // Only exit in non-test environment
    if (process.env.NODE_ENV !== 'test') {
      process.exit(0);
    }
  });

  // Expose cleanup for testing
  app.locals.cleanup = cleanup;

  return app;
}
