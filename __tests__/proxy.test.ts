import { mapOperationToProxy } from '../src/proxy';
import { Operation } from 'oas/operation';

// Mock global fetch
global.fetch = jest.fn();

describe('Proxy Functions', () => {
  let mockOperation: Operation;

  beforeEach(() => {
    mockOperation = {
      path: '/pets/{petId}',
      getParameters: jest.fn().mockReturnValue([
        { name: 'petId', in: 'path', schema: { type: 'string' } },
        { name: 'status', in: 'query', schema: { type: 'string' } }
      ])
    } as any;

    (global.fetch as jest.Mock).mockClear();
  });

  describe('mapOperationToProxy', () => {
    const apiUrl = 'http://api.example.com';

    it('should correctly handle path parameters', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ id: 1, name: 'Test Pet' })
      });

      const proxyFn = mapOperationToProxy(apiUrl, mockOperation);
      await proxyFn({ petId: '123', status: 'available' });

      expect(global.fetch).toHaveBeenCalledWith(
        'http://api.example.com/pets/123?status=available',
        expect.any(Object)
      );
    });

    it('should throw error for missing path parameters', async () => {
      const proxyFn = mapOperationToProxy(apiUrl, mockOperation);

      await expect(proxyFn({ status: 'available' }))
        .rejects
        .toThrow('Missing path parameter: petId');
    });

    it('should throw error for missing query parameters', async () => {
      const proxyFn = mapOperationToProxy(apiUrl, mockOperation);

      await expect(proxyFn({ petId: '123' }))
        .rejects
        .toThrow('Missing query parameter: status');
    });

    it('should handle API errors gracefully', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        statusText: 'Not Found'
      });

      const proxyFn = mapOperationToProxy(apiUrl, mockOperation);

      await expect(proxyFn({ petId: '123', status: 'available' }))
        .rejects
        .toThrow('Failed to fetch from API server: Not Found');
    });

    it('should set correct headers', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({})
      });

      const proxyFn = mapOperationToProxy(apiUrl, mockOperation);
      await proxyFn({ petId: '123', status: 'available' });

      expect(global.fetch).toHaveBeenCalledWith(
        expect.any(String),
        {
          headers: new Headers({
            'content-type': 'application/json',
            'accept': 'application/json'
          })
        }
      );
    });
  });
});