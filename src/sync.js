import { result } from 'lodash-es';

// Map from CRUD method names to HTTP methods
const methodMap = {
  create: 'POST',
  update: 'PUT',
  patch:  'PATCH',
  delete: 'DELETE',
  read:   'GET',
};

/**
 * Sync class — handles RESTful persistence via the native fetch API.
 *
 * Extend this class to customize transport behaviour per model/collection:
 *
 *   class AuthSync extends Sync {
 *     init(method, model, options) {
 *       const init = super.init(method, model, options);
 *       init.headers['Authorization'] = `Bearer ${getToken()}`;
 *       return init;
 *     }
 *   }
 *
 *   class MyModel extends Model {}
 *   MyModel.Sync = AuthSync;
 *
 * The three override points:
 *   - url(method, model, options)  → string
 *   - init(method, model, options) → RequestInit
 *   - parse(response)           → Promise<any>
 */
export class Sync {
  /**
   * Resolve the request URL.
   * Override to add query params, versioning, etc.
   */
  url(method, model, options) {
    const url = options.url || result(model, 'url');
    if (!url) throw new Error('A "url" property or function must be specified');
    return url;
  }

  /**
   * Build the fetch RequestInit object.
   * Override to add auth headers, change serialisation, etc.
   */
  init(method, model, options) {
    const type = methodMap[method];
    const init = { method: type };

    if (method !== 'read' && method !== 'delete') {
      const data = options.attrs !== undefined ? options.attrs : model.toJSON(options);
      init.body = JSON.stringify(data);
      init.headers = { 'Content-Type': 'application/json', ...options.headers };
    } else if (options.headers) {
      init.headers = options.headers;
    }

    return { ...init, ...options.fetchOptions };
  }

  /**
   * Parse a successful Response.
   * Override to handle non-JSON formats.
   */
  async parse(response) {
    if (response.status === 204) return null;
    try {
      return await response.json();
    } catch (_) {
      return null;
    }
  }

  /**
   * Execute the request.
   *
   * @param {string} method - CRUD method: 'create', 'read', 'update', 'patch', 'delete'
   * @param {Model|Collection} model - The model or collection being synced
   * @param {Object} [options={}]
   * @param {string}   [options.url]          - Override URL
   * @param {Object}   [options.attrs]        - Attributes to send (overrides model.toJSON)
   * @param {Object}   [options.headers]      - Extra request headers
   * @param {Object}   [options.fetchOptions] - Extra options passed to fetch()
   * @param {Function} [options.success]      - success(data, response, options)
   * @param {Function} [options.error]        - error(model, err, options)
   * @returns {Promise<any>} Resolves with parsed response data
   */
  async execute(method, model, options = {}) {
    const url  = this.url(method, model, options);
    const init = this.init(method, model, options);

    model.trigger('request', model, null, options);

    let response;
    try {
      response = await fetch(url, init);
    } catch (networkError) {
      if (options.error) options.error(model, networkError, options);
      model.trigger('error', model, networkError, options);
      throw networkError;
    }

    if (!response.ok) {
      const httpError = new Error(`HTTP ${response.status}: ${response.statusText}`);
      httpError.response = response;
      if (options.error) options.error(model, httpError, options);
      model.trigger('error', model, httpError, options);
      throw httpError;
    }

    const data = await this.parse(response);
    if (options.success) options.success(data, response, options);
    model.trigger('sync', model, data, options);
    return data;
  }
}

/**
 * Convenience function — equivalent to `new Sync().execute(...)`.
 * Kept for backward compatibility.
 */
export function sync(method, model, options) {
  return new Sync().execute(method, model, options);
}
