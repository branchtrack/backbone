import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Sync, sync } from '../src/sync.js';
import { Model } from '../src/model.js';
import { Collection } from '../src/collection.js';

// ─── Helpers ────────────────────────────────────────────────────────────────

function mockFetch(data, { status = 200, statusText = 'OK' } = {}) {
  const body = status === 204 ? null : JSON.stringify(data);
  const response = new Response(body, {
    status,
    statusText,
    headers: { 'Content-Type': 'application/json' },
  });
  return vi.spyOn(global, 'fetch').mockResolvedValueOnce(response);
}

function mockFetchError(error) {
  return vi.spyOn(global, 'fetch').mockRejectedValueOnce(error);
}

class BookModel extends Model {
  get urlRoot() { return '/books'; }
}

class BookCollection extends Collection {
  get model() { return BookModel; }
  get url() { return '/books'; }
}

// ─── sync() ─────────────────────────────────────────────────────────────────

describe('sync', () => {
  let model;

  beforeEach(() => {
    model = new BookModel({ id: 1, title: 'Dune' });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should send GET for read', async () => {
    const spy = mockFetch({ id: 1, title: 'Dune' });
    await sync('read', model);
    expect(spy).toHaveBeenCalledWith('/books/1', expect.objectContaining({ method: 'GET' }));
  });

  it('should send POST for create', async () => {
    class NewBookModel extends Model {
      get urlRoot() { return '/books'; }
    }
    const newModel = new NewBookModel({ title: 'Foundation' });
    const spy = mockFetch({ id: 2, title: 'Foundation' });
    await sync('create', newModel);
    expect(spy).toHaveBeenCalledWith(
      '/books',
      expect.objectContaining({ method: 'POST', body: JSON.stringify({ title: 'Foundation' }) })
    );
  });

  it('should send PUT for update', async () => {
    const spy = mockFetch({ id: 1, title: 'Dune Messiah' });
    await sync('update', model);
    expect(spy).toHaveBeenCalledWith('/books/1', expect.objectContaining({ method: 'PUT' }));
  });

  it('should send PATCH for patch', async () => {
    const spy = mockFetch({ id: 1, title: 'Dune Messiah' });
    await sync('patch', model, { attrs: { title: 'Dune Messiah' } });
    expect(spy).toHaveBeenCalledWith('/books/1', expect.objectContaining({ method: 'PATCH' }));
  });

  it('should send DELETE for delete', async () => {
    const spy = mockFetch(null, { status: 204 });
    await sync('delete', model);
    expect(spy).toHaveBeenCalledWith('/books/1', expect.objectContaining({ method: 'DELETE' }));
  });

  it('should use options.url if provided', async () => {
    const spy = mockFetch({ id: 1 });
    await sync('read', model, { url: '/api/v2/books/1' });
    expect(spy).toHaveBeenCalledWith('/api/v2/books/1', expect.anything());
  });

  it('should resolve with parsed JSON', async () => {
    mockFetch({ id: 1, title: 'Dune' });
    const data = await sync('read', model);
    expect(data).toEqual({ id: 1, title: 'Dune' });
  });

  it('should return null for 204 No Content', async () => {
    mockFetch(null, { status: 204 });
    const data = await sync('delete', model);
    expect(data).toBeNull();
  });

  it('should call options.success with data', async () => {
    mockFetch({ id: 1, title: 'Dune' });
    const success = vi.fn();
    await sync('read', model, { success });
    expect(success).toHaveBeenCalledWith({ id: 1, title: 'Dune' }, expect.any(Response), expect.anything());
  });

  it('should call options.error on HTTP error', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValueOnce(new Response('Not Found', { status: 404, statusText: 'Not Found' }));
    const error = vi.fn();
    await expect(sync('read', model, { error })).rejects.toThrow('HTTP 404');
    expect(error).toHaveBeenCalled();
  });

  it('should call options.error on network error', async () => {
    mockFetchError(new TypeError('Failed to fetch'));
    const error = vi.fn();
    await expect(sync('read', model, { error })).rejects.toThrow('Failed to fetch');
    expect(error).toHaveBeenCalled();
  });

  it('should trigger "request" event before fetch', async () => {
    mockFetch({ id: 1 });
    const spy = vi.fn();
    model.on('request', spy);
    await sync('read', model);
    expect(spy).toHaveBeenCalled();
  });

  it('should trigger "sync" event on success', async () => {
    mockFetch({ id: 1, title: 'Dune' });
    const spy = vi.fn();
    model.on('sync', spy);
    await sync('read', model);
    expect(spy).toHaveBeenCalledWith(model, { id: 1, title: 'Dune' }, expect.anything());
  });

  it('should trigger "error" event on failure', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValueOnce(new Response('', { status: 500, statusText: 'Server Error' }));
    const spy = vi.fn();
    model.on('error', spy);
    await expect(sync('read', model)).rejects.toThrow();
    expect(spy).toHaveBeenCalled();
  });

  it('should send Content-Type header for write operations', async () => {
    const spy = mockFetch({ id: 1 });
    await sync('update', model);
    const [, init] = spy.mock.calls[0];
    expect(init.headers['Content-Type']).toBe('application/json');
  });

  it('should not send Content-Type for GET/DELETE', async () => {
    const spy = mockFetch({ id: 1 });
    await sync('read', model);
    const [, init] = spy.mock.calls[0];
    expect(init.headers).toBeUndefined();
  });

  it('should merge custom headers', async () => {
    const spy = mockFetch({ id: 1 });
    await sync('update', model, { headers: { 'X-Auth': 'token123' } });
    const [, init] = spy.mock.calls[0];
    expect(init.headers['X-Auth']).toBe('token123');
    expect(init.headers['Content-Type']).toBe('application/json');
  });

  it('should allow fetchOptions overrides', async () => {
    const spy = mockFetch({ id: 1 });
    await sync('read', model, { fetchOptions: { credentials: 'include' } });
    const [, init] = spy.mock.calls[0];
    expect(init.credentials).toBe('include');
  });

  it('should use options.attrs as body instead of toJSON', async () => {
    const spy = mockFetch({ id: 1 });
    await sync('patch', model, { attrs: { title: 'Changed' } });
    const [, init] = spy.mock.calls[0];
    expect(JSON.parse(init.body)).toEqual({ title: 'Changed' });
  });

  it('should throw if no URL can be resolved', async () => {
    const bare = new Model({ id: 1 });
    await expect(sync('read', bare)).rejects.toThrow('url');
  });

  it('should allow sync override per subclass', async () => {
    const customSync = vi.fn().mockResolvedValue({ id: 99 });
    class CustomModel extends BookModel {
      sync(...args) { return customSync(...args); }
    }
    const m = new CustomModel({ id: 99 });
    await m.fetch();
    expect(customSync).toHaveBeenCalledWith('read', m, expect.anything());
  });
});

// ─── Sync class ──────────────────────────────────────────────────────────────

describe('Sync class', () => {
  afterEach(() => { vi.restoreAllMocks(); });

  it('should instantiate and expose execute, url, init, parse', () => {
    const s = new Sync();
    expect(typeof s.execute).toBe('function');
    expect(typeof s.url).toBe('function');
    expect(typeof s.init).toBe('function');
    expect(typeof s.parse).toBe('function');
  });

  it('url should return options.url when set', () => {
    const s = new Sync();
    const model = new BookModel({ id: 1 });
    expect(s.url('read', model, { url: '/override' })).toBe('/override');
  });

  it('url should fall back to model.url()', () => {
    const s = new Sync();
    const model = new BookModel({ id: 1 });
    expect(s.url('read', model, {})).toBe('/books/1');
  });

  it('url should throw if no URL', () => {
    const s = new Sync();
    const bare = new Model({ id: 1 });
    expect(() => s.url('read', bare, {})).toThrow('url');
  });

  it('init should set correct HTTP method', () => {
    const s = new Sync();
    const model = new BookModel({ id: 1 });
    expect(s.init('read', model, {}).method).toBe('GET');
    expect(s.init('create', model, {}).method).toBe('POST');
    expect(s.init('update', model, {}).method).toBe('PUT');
    expect(s.init('patch', model, {}).method).toBe('PATCH');
    expect(s.init('delete', model, {}).method).toBe('DELETE');
  });

  it('init should include body and Content-Type for write operations', () => {
    const s = new Sync();
    const model = new BookModel({ id: 1, title: 'Dune' });
    const init = s.init('update', model, {});
    expect(init.headers['Content-Type']).toBe('application/json');
    expect(JSON.parse(init.body)).toMatchObject({ title: 'Dune' });
  });

  it('init should not include body for GET', () => {
    const s = new Sync();
    const model = new BookModel({ id: 1 });
    const init = s.init('read', model, {});
    expect(init.body).toBeUndefined();
  });

  it('should allow extending Sync to add auth headers via static Sync', async () => {
    class AuthSync extends Sync {
      init(method, model, options) {
        const init = super.init(method, model, options);
        init.headers = { ...init.headers, 'Authorization': 'Bearer token' };
        return init;
      }
    }
    class SecureModel extends BookModel {}
    SecureModel.Sync = AuthSync;

    const spy = vi.spyOn(global, 'fetch').mockResolvedValueOnce(
      new Response(JSON.stringify({ id: 1 }), { status: 200 })
    );
    await new SecureModel({ id: 1 }).fetch();
    const [, init] = spy.mock.calls[0];
    expect(init.headers['Authorization']).toBe('Bearer token');
  });

  it('Model.Sync should default to Sync', () => {
    expect(BookModel.Sync).toBe(Sync);
  });

  it('Collection.Sync should default to Sync', () => {
    expect(BookCollection.Sync).toBe(Sync);
  });

  it('custom Sync on collection should be used for fetch', async () => {
    class CustomSync extends Sync {
      url() { return '/custom/books'; }
    }
    class CustomCollection extends BookCollection {}
    CustomCollection.Sync = CustomSync;

    const spy = vi.spyOn(global, 'fetch').mockResolvedValueOnce(
      new Response(JSON.stringify([]), { status: 200 })
    );
    await new CustomCollection().fetch();
    expect(spy).toHaveBeenCalledWith('/custom/books', expect.anything());
  });

  it('parse should return null for 204', async () => {
    const s = new Sync();
    const resp = new Response(null, { status: 204 });
    expect(await s.parse(resp)).toBeNull();
  });

  it('parse should return parsed JSON', async () => {
    const s = new Sync();
    const resp = new Response(JSON.stringify({ ok: true }), { status: 200 });
    expect(await s.parse(resp)).toEqual({ ok: true });
  });
});

// ─── Model server methods ────────────────────────────────────────────────────

describe('Model server methods', () => {
  let model;

  beforeEach(() => {
    model = new BookModel({ id: 1, title: 'Dune' });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('fetch', () => {
    it('should set attributes from server response', async () => {
      mockFetch({ id: 1, title: 'Dune Messiah', year: 1969 });
      await model.fetch();
      expect(model.get('title')).toBe('Dune Messiah');
      expect(model.get('year')).toBe(1969);
    });

    it('should call parse on response', async () => {
      mockFetch({ data: { id: 1, title: 'Wrapped' } });
      class ParsedModel extends BookModel {
        parse(resp) { return resp.data; }
      }
      const m = new ParsedModel({ id: 1 });
      await m.fetch();
      expect(m.get('title')).toBe('Wrapped');
    });

    it('should call success callback', async () => {
      mockFetch({ id: 1, title: 'Dune' });
      const success = vi.fn();
      await model.fetch({ success });
      expect(success).toHaveBeenCalledWith(model, expect.anything(), expect.anything());
    });

    it('should trigger change event when attributes change', async () => {
      mockFetch({ id: 1, title: 'Updated Title' });
      const spy = vi.fn();
      model.on('change', spy);
      await model.fetch();
      expect(spy).toHaveBeenCalled();
    });
  });

  describe('save', () => {
    it('should POST for new model', async () => {
      const spy = mockFetch({ id: 2, title: 'Foundation' });
      const m = new BookModel({ title: 'Foundation' });
      await m.save();
      expect(spy).toHaveBeenCalledWith('/books', expect.objectContaining({ method: 'POST' }));
    });

    it('should PUT for existing model', async () => {
      const spy = mockFetch({ id: 1, title: 'Dune' });
      await model.save();
      expect(spy).toHaveBeenCalledWith('/books/1', expect.objectContaining({ method: 'PUT' }));
    });

    it('should PATCH when patch option is true', async () => {
      const spy = mockFetch({ id: 1, title: 'Dune' });
      await model.save({ title: 'Dune' }, { patch: true });
      expect(spy).toHaveBeenCalledWith('/books/1', expect.objectContaining({ method: 'PATCH' }));
    });

    it('should set key/value before saving', async () => {
      mockFetch({ id: 1, title: 'New Title' });
      await model.save('title', 'New Title');
      expect(model.get('title')).toBe('New Title');
    });

    it('should update attributes from server response after save', async () => {
      mockFetch({ id: 1, title: 'Server Title', slug: 'server-title' });
      await model.save();
      expect(model.get('slug')).toBe('server-title');
    });

    it('should return false if validation fails', () => {
      class ValidatedModel extends BookModel {
        validate(attrs) { if (!attrs.title) return 'title required'; }
      }
      const m = new ValidatedModel({ id: 1, title: '' });
      expect(m.save(null, { validate: true })).toBe(false);
    });

    it('should wait for server before setting attrs when wait:true', async () => {
      mockFetch({ id: 1, title: 'Server' });
      const m = new BookModel({ id: 1, title: 'Local' });
      const promise = m.save({ title: 'Server' }, { wait: true });
      // Before resolving, original attrs should be present
      expect(m.get('title')).toBe('Local');
      await promise;
      expect(m.get('title')).toBe('Server');
    });

    it('should call success callback', async () => {
      mockFetch({ id: 1 });
      const success = vi.fn();
      await model.save(null, { success });
      expect(success).toHaveBeenCalledWith(model, expect.anything(), expect.anything());
    });
  });

  describe('destroy', () => {
    it('should send DELETE request', async () => {
      const spy = mockFetch(null, { status: 204 });
      await model.destroy();
      expect(spy).toHaveBeenCalledWith('/books/1', expect.objectContaining({ method: 'DELETE' }));
    });

    it('should trigger destroy event immediately (no wait)', async () => {
      mockFetch(null, { status: 204 });
      const spy = vi.fn();
      model.on('destroy', spy);
      await model.destroy();
      expect(spy).toHaveBeenCalled();
    });

    it('should wait for server before triggering destroy when wait:true', async () => {
      mockFetch(null, { status: 204, statusText: 'No Content' });
      const spy = vi.fn();
      model.on('destroy', spy);
      const promise = model.destroy({ wait: true });
      expect(spy).not.toHaveBeenCalled();
      await promise;
      expect(spy).toHaveBeenCalled();
    });

    it('should resolve immediately for new (unsaved) model', async () => {
      const m = new BookModel({ title: 'Unsaved' });
      const spy = vi.fn();
      m.on('destroy', spy);
      await m.destroy();
      expect(spy).toHaveBeenCalled();
    });

    it('should call success callback', async () => {
      mockFetch(null, { status: 204 });
      const success = vi.fn();
      await model.destroy({ success });
      expect(success).toHaveBeenCalled();
    });

    it('should remove model from collection on destroy', async () => {
      mockFetch(null, { status: 204 });
      const col = new BookCollection([model]);
      expect(col.length).toBe(1);
      model.collection = col;
      col.on('remove', () => col.remove(model));
      model.on('destroy', (m, collection) => { if (collection) collection.remove(m); });
      await model.destroy();
      expect(col.length).toBe(0);
    });
  });
});

// ─── Collection server methods ───────────────────────────────────────────────

describe('Collection server methods', () => {
  let col;

  afterEach(() => {
    vi.restoreAllMocks();
  });

  beforeEach(() => {
    col = new BookCollection();
  });

  describe('fetch', () => {
    it('should populate collection from server', async () => {
      mockFetch([{ id: 1, title: 'Dune' }, { id: 2, title: 'Foundation' }]);
      await col.fetch();
      expect(col.length).toBe(2);
      expect(col.get(1).get('title')).toBe('Dune');
    });

    it('should reset collection when reset:true', async () => {
      col.add([{ id: 1, title: 'Old' }]);
      mockFetch([{ id: 2, title: 'New' }]);
      await col.fetch({ reset: true });
      expect(col.length).toBe(1);
      expect(col.get(2).get('title')).toBe('New');
    });

    it('should trigger sync event', async () => {
      mockFetch([]);
      const spy = vi.fn();
      col.on('sync', spy);
      await col.fetch();
      expect(spy).toHaveBeenCalled();
    });

    it('should call success callback', async () => {
      mockFetch([{ id: 1 }]);
      const success = vi.fn();
      await col.fetch({ success });
      expect(success).toHaveBeenCalledWith(col, expect.anything(), expect.anything());
    });
  });

  describe('create', () => {
    it('should add and save a new model', async () => {
      mockFetch({ id: 3, title: 'Hyperion' });
      const model = col.create({ title: 'Hyperion' });
      expect(model).toBeInstanceOf(BookModel);
      expect(col.length).toBe(1);
      await new Promise(r => model.once('sync', r));
    });

    it('should not add until server responds when wait:true', async () => {
      mockFetch({ id: 3, title: 'Hyperion' });
      let resolveWait;
      vi.spyOn(global, 'fetch').mockReturnValueOnce(
        new Promise(resolve => { resolveWait = resolve; })
          .then(() => new Response(JSON.stringify({ id: 3, title: 'Hyperion' }), { status: 200 }))
      );
      expect(col.length).toBe(0);
      const promise = Promise.resolve(col.create({ title: 'Hyperion' }, { wait: true }));
      expect(col.length).toBe(0);
      resolveWait();
      await promise;
    });

    it('should return false for invalid model', () => {
      class StrictCollection extends BookCollection {
        _prepareModel() { return false; }
      }
      const strictCol = new StrictCollection();
      expect(strictCol.create({ title: 'Invalid' })).toBe(false);
    });
  });
});
