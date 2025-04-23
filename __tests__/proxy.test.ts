import { mapOperationToProxy } from '../src/proxy';
import { Operation } from 'oas/operation';
import { OASDocument, OperationObject } from 'oas/types';
import { text } from 'stream/consumers';

// Mock global fetch
global.fetch = jest.fn();

describe('Proxy Functions', () => {
  let mockOperation: Partial<Operation>;

  beforeEach(() => {
    mockOperation = {
      path: '/pets/{petId}',
      method: 'get',
      getOperationId: () => 'getPet',
      getDescription: () => 'Get a pet by ID',
      getSummary: () => 'Get pet',
      getContentType: () => 'application/json',
      isFormUrlEncoded: () => false,
      getParameters: jest.fn().mockReturnValue([
        { name: 'petId', in: 'path', schema: { type: 'string' } },
        { name: 'status', in: 'query', schema: { type: 'string' } },
        { name: 'api_key', in: 'header', schema: { type: 'string' } }
      ]),
      getRequestBody: jest.fn().mockReturnValue(false),
      getHeaders: jest.fn().mockReturnValue({ request: ['x-custom-header'], response: [] }),
      api: {} as OASDocument,
      schema: {} as OperationObject
    } as Operation;

    (global.fetch as jest.Mock).mockClear();
  });

  describe('mapOperationToProxy', () => {
    const apiUrl = 'http://api.example.com';

    it('should correctly handle path parameters', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ id: 1, name: 'Test Pet' })
      });

      const proxyFn = mapOperationToProxy(apiUrl, mockOperation as Operation);
      await proxyFn({ petId: '123', status: 'available', api_key: 'test-key' });

      expect(global.fetch).toHaveBeenCalledWith(
        'http://api.example.com/pets/123?status=available',
        expect.objectContaining({
          method: 'get',
          headers: new Headers({
            'content-type': 'application/json',
            'accept': 'application/json',
            'api_key': 'test-key'
          })
        })
      );
    });

    it('should handle POST requests with body', async () => {
      const postOperation = {
        ...mockOperation,
        method: 'post',
        getParameters: jest.fn().mockReturnValue([
          { name: 'petId', in: 'path', schema: { type: 'string' } },
          { name: 'api_key', in: 'header', schema: { type: 'string' } }
        ]),
        getRequestBody: jest.fn().mockReturnValue({
          schema: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              status: { type: 'string' }
            }
          }
        })
      } as Operation;

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ id: 1 })
      });

      const proxyFn = mapOperationToProxy(apiUrl, postOperation);
      const params = {
        petId: '123',
        api_key: 'test-key',
        body: JSON.stringify({ name: 'New Pet', status: 'available' })
      };
      await proxyFn(params);

      expect(global.fetch).toHaveBeenCalledWith(
        'http://api.example.com/pets/123',
        expect.objectContaining({
          method: 'post',
          body: params.body,
          headers: expect.any(Headers)
        })
      );
    });

    it('should handle custom headers', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({})
      });

      const proxyFn = mapOperationToProxy(apiUrl, mockOperation as Operation);
      await proxyFn({
        petId: '123',
        status: 'available',
        api_key: 'test-key',
        'x-custom-header': 'custom-value'
      });

      expect(global.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: new Headers({
            'content-type': 'application/json',
            'accept': 'application/json',
            'api_key': 'test-key',
            'x-custom-header': 'custom-value'
          })
        })
      );
    });

    it('should throw error for missing path parameters', async () => {
      const proxyFn = mapOperationToProxy(apiUrl, mockOperation as Operation);

      await expect(proxyFn({ status: 'available', api_key: 'test-key' }))
        .rejects
        .toThrow('Missing path parameter: petId');
    });

    it('should throw error for missing query parameters', async () => {
      const proxyFn = mapOperationToProxy(apiUrl, mockOperation as Operation);

      await expect(proxyFn({ petId: '123', api_key: 'test-key' }))
        .rejects
        .toThrow('Missing query parameter: status');
    });

    it('should throw error for missing header parameters', async () => {
      const proxyFn = mapOperationToProxy(apiUrl, mockOperation as Operation);

      await expect(proxyFn({ petId: '123', status: 'available' }))
        .rejects
        .toThrow('Missing query parameter: api_key');
    });

    it('should handle API errors gracefully', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        text: () => Promise.resolve('Not Found'),
        statusText: 'Not Found'
      });

      const proxyFn = mapOperationToProxy(apiUrl, mockOperation as Operation);

      await expect(proxyFn({ petId: '123', status: 'available', api_key: 'test-key' }))
        .rejects
        .toThrow('Failed to fetch from API server: Not Found');
    });
  });
});