import { createExpressServer } from '../src/express';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import request from 'supertest';
import express, { Response } from 'express';
import { Server } from 'http';

jest.mock('@modelcontextprotocol/sdk/server/mcp.js');
jest.mock('@modelcontextprotocol/sdk/server/sse.js', () => ({
  SSEServerTransport: jest.fn()
}));
jest.mock('../src/transports-store', () => ({
  TransportStore: jest.fn()
}));


describe('Express Server', () => {
  let mockMcpServer: jest.Mocked<McpServer>;
  let app: express.Application;
  let server: Server;
  let connections: Set<any>;
  let mockTransport: jest.Mocked<SSEServerTransport>;
  let transportResponse: Response;

  beforeEach(() => {
    connections = new Set();
    mockMcpServer = {
      connect: jest.fn().mockResolvedValue(undefined),
      close: jest.fn().mockResolvedValue(undefined)
    } as any;

    mockTransport = {
      sessionId: 'test-session-id',
      start: jest.fn().mockImplementation(() => {
        transportResponse.writeHead(200, {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache, no-transform",
          Connection: "keep-alive",
        });
        transportResponse.end()
        return Promise.resolve();
      }),
      close: jest.fn().mockResolvedValue(undefined),
      handlePostMessage: jest.fn().mockImplementation((req: any, res: Response) => {
        res.status(200);
        res.end();
        return Promise.resolve();
      }),
      onclose: jest.fn()
    } as any;

    const SSEServerTransportMock = jest.requireMock('@modelcontextprotocol/sdk/server/sse.js').SSEServerTransport;
    SSEServerTransportMock.mockImplementation((_path: string, res: Response) => {
      transportResponse = res;
      return mockTransport;
    });

    const TransportStoreMock = jest.requireMock('../src/transports-store').TransportStore;
    TransportStoreMock.mockImplementation(() => ({
      get: jest.fn().mockImplementation((sessionId) => sessionId === 'test-session-id' ? mockTransport : undefined),
      store: jest.fn(),
      remove: jest.fn(),
      clear: jest.fn()
    }));

    app = createExpressServer(mockMcpServer);
    server = app.listen(0);

    // Track all connections to ensure proper cleanup
    server.on('connection', (conn) => {
      connections.add(conn);
      conn.on('close', () => connections.delete(conn));
    });
  });

  afterEach(async () => {
    // Destroy all active connections
    for (const conn of connections) {
      conn.destroy();
    }
    connections.clear();

    // Close server and wait for it to complete
    await new Promise<void>((resolve) => {
      server.close(() => resolve());
    });

    // Final cleanup
    await app.locals.cleanup?.();
    jest.clearAllMocks();
  });

  describe('GET /mcp', () => {
    it('should establish SSE stream successfully', async () => {
      const res = await request(server)
        .get('/mcp')
        .expect(200)
        .expect('Content-Type', /text\/event-stream/);

      expect(mockMcpServer.connect).toHaveBeenCalled();
      expect(mockTransport.start).toHaveBeenCalled();

      // Ensure connection is properly closed
      if (mockTransport.onclose) {
        mockTransport.onclose();
      }
    });

    it('should handle errors during stream establishment', async () => {
      (SSEServerTransport as jest.Mock).mockImplementationOnce(() => {
        throw new Error('Connection failed');
      });

      await request(server)
        .get('/mcp')
        .expect(500)
        .expect('Error establishing SSE stream');
    });
  });

  describe('POST /messages', () => {
    it('should handle messages for valid session', async () => {
      const message = { method: 'test', params: {} };

      await request(server)
        .post('/messages?sessionId=test-session-id')
        .send(message)
        .expect(200);

      expect(mockTransport.handlePostMessage).toHaveBeenCalled();
    });

    it('should reject requests without session ID', async () => {
      await request(server)
        .post('/messages')
        .send({})
        .expect(400)
        .expect('Missing sessionId parameter');
    });

    it('should reject requests with invalid session ID', async () => {
      await request(server)
        .post('/messages?sessionId=invalid-session')
        .send({})
        .expect(404)
        .expect('Session not found');
    });

    it('should handle errors during message processing', async () => {

      mockTransport.handlePostMessage = jest.fn().mockRejectedValueOnce(new Error('Processing failed'));

      await request(server)
        .post('/messages?sessionId=test-session-id')
        .send({})
        .expect(500)
        .expect('Error handling request');
    });
  });

  describe('Server shutdown', () => {
    it('should clean up resources on shutdown', async () => {
      await app.locals.cleanup();
      expect(mockMcpServer.close).toHaveBeenCalled();
    });
  });
});