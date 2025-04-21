import { loadOpenAPIFile, extractGetOperations } from '../src/openapi';
import path from 'path';
import Oas from 'oas';
import OASNormalize from 'oas-normalize';

jest.mock('oas-normalize');
jest.mock('oas');

describe('OpenAPI Functions', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  describe('loadOpenAPIFile', () => {
    it('should throw error for unsupported file formats', async () => {
      await expect(loadOpenAPIFile('test.txt')).rejects.toThrow('Unsupported file format');
    });

    it('should load YAML files', async () => {
      const mockOasDoc = {
        openapi: '3.0.0',
        info: { title: 'Test API', version: '1.0.0' },
        paths: {}
      };

      // Mock OASNormalize
      (OASNormalize as unknown as jest.Mock).mockImplementation(() => ({
        dereference: jest.fn().mockResolvedValue(mockOasDoc)
      }));

      // Mock Oas constructor
      (Oas as unknown as jest.Mock).mockImplementation(() => ({
        dereference: jest.fn().mockResolvedValue(mockOasDoc)
      }));

      const result = await loadOpenAPIFile('test.yaml');
      expect(result).toBeDefined();
      expect(OASNormalize).toHaveBeenCalledWith('test.yaml', { enablePaths: true });
    });
  });

  describe('extractGetOperations', () => {
    it('should extract only GET operations', () => {
      const mockOperation = {
        getOperationId: () => 'getPet',
        path: '/pet',
        method: 'get'
      };

      const mockOpenAPI = {
        getPaths: jest.fn().mockReturnValue({
          '/pet': { get: mockOperation },
          '/user': { post: { getOperationId: () => 'createUser' } }
        })
      };

      const operations = extractGetOperations(mockOpenAPI as any);
      expect(operations).toHaveLength(1);
      expect(operations[0].getOperationId()).toBe('getPet');
    });

    it('should handle empty paths', () => {
      const mockOpenAPI = {
        getPaths: jest.fn().mockReturnValue({})
      };

      const operations = extractGetOperations(mockOpenAPI as any);
      expect(operations).toHaveLength(0);
    });
  });
});