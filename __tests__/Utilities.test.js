const fs = require('fs');
const vm = require('vm');

describe('consultarIPConCache', () => {
  beforeAll(() => {
    const configCode = fs.readFileSync(require.resolve('../Config.js'), 'utf8');
    vm.runInNewContext(configCode, global);
    const utilCode = fs.readFileSync(require.resolve('../Utilities.js'), 'utf8');
    vm.runInNewContext(utilCode, global);
  });

  test('returns cached value if present', () => {
    const cachedValue = { status: 'success', city: 'Madrid' };
    const mockCache = {
      get: jest.fn().mockReturnValue(JSON.stringify(cachedValue)),
      put: jest.fn()
    };
    global.CacheService = {
      getScriptCache: jest.fn(() => mockCache)
    };

    const result = consultarIPConCache('1.1.1.1');
    expect(result).toEqual(cachedValue);
    expect(mockCache.get).toHaveBeenCalledWith('ip_1.1.1.1');
    expect(mockCache.put).not.toHaveBeenCalled();
  });

  test('fetches from API and caches result when not cached', () => {
    const fetchValue = { status: 'success', city: 'Barcelona' };
    const mockCache = {
      get: jest.fn().mockReturnValue(null),
      put: jest.fn()
    };
    global.CacheService = {
      getScriptCache: jest.fn(() => mockCache)
    };

    global.UrlFetchApp = {
      fetch: jest.fn(() => ({
        getContentText: () => JSON.stringify(fetchValue)
      }))
    };

    const result = consultarIPConCache('2.2.2.2');
    expect(global.UrlFetchApp.fetch).toHaveBeenCalled();
    expect(mockCache.put).toHaveBeenCalledWith(
      'ip_2.2.2.2',
      JSON.stringify(fetchValue),
      expect.any(Number)
    );
    expect(result).toEqual(fetchValue);
  });
});
