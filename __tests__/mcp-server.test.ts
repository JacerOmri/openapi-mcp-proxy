import { createMCPServer } from '../src/mcp-server';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { Operation } from 'oas/operation';
import { MediaTypeObject, OASDocument, OperationObject } from 'oas/types';

jest.mock('@modelcontextprotocol/sdk/server/mcp.js');
jest.mock('../src/proxy');

describe('MCP Server', () => {
  let mockOperation: Partial<Operation>;

  beforeEach(() => {
    // Create a minimal mock that satisfies the Operation interface
    mockOperation = {
      getOperationId: () => 'testOperation',
      getDescription: () => 'Test description',
      getSummary: () => 'Test summary',
      getContentType: () => 'application/json',
      isFormUrlEncoded: () => false,
      getParameters: () => [{
        name: 'param1',
        in: 'query',
        schema: { type: 'string' }
      }],
      getRequestBody: () => false,
      getHeaders: () => ({ request: [], response: [] }),
      path: '/test',
      method: 'get',
      api: {} as OASDocument,
      schema: {} as OperationObject
    };

    (McpServer as jest.Mock).mockClear();
  });

  describe('createMCPServer', () => {
    it('should create an MCP server with correct configuration', () => {
      createMCPServer('http://api.example.com', [mockOperation as Operation]);

      expect(McpServer).toHaveBeenCalledWith(
        {
          name: 'MCP Server',
          version: '1.0.0'
        },
        { capabilities: { logging: {} } }
      );
    });

    it('should register tools for each operation', () => {
      const mockTool = jest.fn();
      (McpServer as jest.Mock).mockImplementation(() => ({
        tool: mockTool
      }));

      createMCPServer('http://api.example.com', [mockOperation as Operation]);

      expect(mockTool).toHaveBeenCalledWith(
        'testOperation',
        'Test description',
        expect.any(Object),
        expect.any(Function)
      );
    });

    it('should handle operations with request body', () => {
      const mockBody: MediaTypeObject = {
        schema: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            status: { type: 'string' }
          }
        }
      };

      mockOperation = {
        ...mockOperation,
        method: 'post',
        getRequestBody: () => mockBody
      };

      const mockTool = jest.fn();
      (McpServer as jest.Mock).mockImplementation(() => ({
        tool: mockTool
      }));

      createMCPServer('http://api.example.com', [mockOperation as Operation]);

      expect(mockTool).toHaveBeenCalledWith(
        'testOperation',
        'Test description',
        expect.objectContaining({
          body: expect.any(Object)
        }),
        expect.any(Function)
      );
    });

    it('should handle operations with custom headers', () => {
      mockOperation = {
        ...mockOperation,
        getHeaders: () => ({
          request: ['x-custom-header'],
          response: []
        })
      };

      const mockTool = jest.fn();
      (McpServer as jest.Mock).mockImplementation(() => ({
        tool: mockTool
      }));

      createMCPServer('http://api.example.com', [mockOperation as Operation]);

      expect(mockTool).toHaveBeenCalledWith(
        'testOperation',
        'Test description',
        expect.objectContaining({
          headers: expect.any(Object)
        }),
        expect.any(Function)
      );
    });

    it('should handle operations with no parameters', () => {
      mockOperation = {
        ...mockOperation,
        getParameters: () => [],
        getRequestBody: () => false,
        getHeaders: () => ({ request: [], response: [] })
      };

      const mockTool = jest.fn();
      (McpServer as jest.Mock).mockImplementation(() => ({
        tool: mockTool
      }));

      createMCPServer('http://api.example.com', [mockOperation as Operation]);

      expect(mockTool).toHaveBeenCalledWith(
        'testOperation',
        'Test description',
        expect.objectContaining({ headers: expect.any(Object) }),
        expect.any(Function)
      );
    });
  });
});