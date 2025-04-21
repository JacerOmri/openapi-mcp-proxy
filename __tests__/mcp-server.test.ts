import { createMCPServer } from '../src/mcp-server';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { Operation } from 'oas/operation';

jest.mock('@modelcontextprotocol/sdk/server/mcp.js');
jest.mock('../src/proxy');

describe('MCP Server', () => {
  let mockOperation: Partial<Operation>;

  beforeEach(() => {
    // Create a minimal mock that satisfies the Operation interface
    mockOperation = {
      getOperationId: () => 'testOperation',
      getDescription: () => 'Test description',
      getParameters: () => [{
        name: 'param1',
        in: 'query',
        schema: { type: 'string' }
      }],
      getSummary: () => 'Test summary',
      getContentType: () => 'application/json',
      isFormUrlEncoded: () => false,
      path: '/test',
      method: 'get',
      api: {} as any,
      schema: {} as any
    };

    (McpServer as jest.Mock).mockClear();
  });

  describe('createMCPServer', () => {
    it('should create an MCP server with correct configuration', () => {
      const server = createMCPServer('http://api.example.com', [mockOperation as Operation]);

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

    it('should handle operations with no parameters', () => {
      mockOperation = {
        ...mockOperation,
        getParameters: () => []
      };

      const mockTool = jest.fn();
      (McpServer as jest.Mock).mockImplementation(() => ({
        tool: mockTool
      }));

      createMCPServer('http://api.example.com', [mockOperation as Operation]);

      expect(mockTool).toHaveBeenCalledWith(
        'testOperation',
        'Test description',
        {},
        expect.any(Function)
      );
    });
  });
});