import { loadOpenAPIFile, extractReadOperations, extractWriteOperations } from '../src/openapi';
import Oas from 'oas';
import OASNormalize from 'oas-normalize';
import { Operation } from 'oas/operation';
import { OASDocument } from 'oas/types';

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

  describe('extractReadOperations', () => {
    it('should extract only GET operations', () => {
      const mockOperation = {
        responses: {
          '200': {
            description: 'Success'
          }
        },
        operationId: 'getPet',
        getOperationId: () => 'getPet',
        path: '/pet',
        method: 'get'
      };

      const paths = {
        '/pet': {
          get: mockOperation
        },
        '/user': {
          get: {
            responses: {
              '200': {
                description: 'Success'
              }
            },
            operationId: 'getUser',
            getOperationId: () => 'getUser',
            method: 'get'
          },
          post: {
            responses: {
              '200': {
                description: 'Success'
              }
            },
            operationId: 'createUser',
            getOperationId: () => 'createUser',
            method: 'post'
          }
        }
      };

      const mockOpenAPI = {
        getPaths: jest.fn().mockReturnValue(paths)
      };

      const operations = extractReadOperations(mockOpenAPI as unknown as Oas);
      expect(operations).toHaveLength(2);
      expect(operations[0].getOperationId()).toBe('getPet');
      expect(operations[1].getOperationId()).toBe('getUser');
    });

    it('should handle empty paths', () => {
      const mockOpenAPI = {
        getPaths: jest.fn().mockReturnValue({})
      };

      const operations = extractReadOperations(mockOpenAPI as unknown as Oas);
      expect(operations).toHaveLength(0);
    });
  });

  describe('extractWriteOperations', () => {
    it('should extract POST, PUT, PATCH and DELETE operations', () => {
      const paths = {
        '/pet': {
          post: {
            responses: {
              '200': {
                description: 'Success'
              }
            },
            operationId: 'createPet',
            getOperationId: () => 'createPet',
            method: 'post'
          },
          get: {
            responses: {
              '200': {
                description: 'Success'
              }
            },
            operationId: 'getPet',
            getOperationId: () => 'getPet',
            method: 'get'
          }
        },
        '/user': {
          put: {
            responses: {
              '200': {
                description: 'Success'
              }
            },
            operationId: 'updateUser',
            getOperationId: () => 'updateUser',
            method: 'put'
          },
          delete: {
            responses: {
              '200': {
                description: 'Success'
              }
            },
            operationId: 'deleteUser',
            getOperationId: () => 'deleteUser',
            method: 'delete'
          },
          patch: {
            responses: {
              '200': {
                description: 'Success'
              }
            },
            operationId: 'patchUser',
            getOperationId: () => 'patchUser',
            method: 'patch'
          }
        }
      };

      const mockOpenAPI = {
        getPaths: jest.fn().mockReturnValue(paths)
      };

      const operations = extractWriteOperations(mockOpenAPI as unknown as Oas);
      expect(operations).toHaveLength(4);
      const operationIds = operations.map(op => op.getOperationId());
      expect(operationIds).toContain('createPet');
      expect(operationIds).toContain('updateUser');
      expect(operationIds).toContain('deleteUser');
      expect(operationIds).toContain('patchUser');
      expect(operationIds).not.toContain('getPet');
    });

    it('should handle paths with no write operations', () => {
      const paths = {
        '/pet': {
          get: {
            responses: {
              '200': {
                description: 'Success'
              }
            },
            operationId: 'getPet',
            getOperationId: () => 'getPet',
            method: 'get'
          }
        },
        '/user': {
          get: {
            responses: {
              '200': {
                description: 'Success'
              }
            },
            operationId: 'getUser',
            getOperationId: () => 'getUser',
            method: 'get'
          }
        }
      };

      const mockOpenAPI = {
        getPaths: jest.fn().mockReturnValue(paths)
      };

      const operations = extractWriteOperations(mockOpenAPI as unknown as Oas);
      expect(operations).toHaveLength(0);
    });

    it('should handle empty paths', () => {
      const mockOpenAPI = {
        getPaths: jest.fn().mockReturnValue({})
      };

      const operations = extractWriteOperations(mockOpenAPI as unknown as Oas);
      expect(operations).toHaveLength(0);
    });
  });
});