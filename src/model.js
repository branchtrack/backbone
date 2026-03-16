/**
 * Model - Modern ES6 model class for Backbone
 *
 * Represents a single data object with attributes, validation, and change tracking.
 *
 * @module Model
 */

import {
  clone,
  defaults,
  extend,
  isEqual,
  isEmpty,
  has as hasKey,
  uniqueId,
  result,
  escape as escapeHtml,
  keys,
  values,
  toPairs,
  invert,
  pick,
  omit,
  chain
} from 'lodash-es';
import { EventsMixin } from './mixins/events.js';
import { Sync } from './sync.js';

/**
 * Model class - Represents a data object with attributes and change tracking
 *
 * @class Model
 * @example
 * class Book extends Model {
 *   defaults() {
 *     return { title: '', author: '' };
 *   }
 *
 *   validate(attrs) {
 *     if (!attrs.title) return 'Title is required';
 *   }
 * }
 *
 * const book = new Book({ title: 'The Tempest', author: 'Shakespeare' });
 * book.set('title', 'Hamlet');
 * console.log(book.get('title')); // 'Hamlet'
 */
export class Model {
  /**
   * Create a new Model instance
   *
   * @param {Object} [attributes={}] - Initial attributes
   * @param {Object} [options={}] - Options
   * @param {Collection} [options.collection] - Collection this model belongs to
   * @param {boolean} [options.parse=false] - Parse attributes before setting
   */
  constructor(attributes = {}, options = {}) {
    let attrs = attributes;

    // Call preinitialize hook before any setup
    this.preinitialize(attributes, options);

    // Generate unique client ID (read from instance property which may have been set by subclass)
    this.cid = uniqueId(this.cidPrefix);

    // Initialize attributes object
    this.attributes = {};

    // Store collection reference if provided
    if (options.collection) {
      this.collection = options.collection;
    }

    // Parse attributes if requested
    if (options.parse) {
      attrs = this.parse(attrs, options) || {};
    }

    // Get defaults and merge with attributes
    const defaultAttrs = result(this, 'defaults');

    // Apply defaults (historical behavior: _.defaults(_.extend({}, defaults, attrs), defaults))
    attrs = defaults(extend({}, defaultAttrs, attrs), defaultAttrs);

    // Set initial attributes
    this.set(attrs, options);

    // Ensure id is set from idAttribute
    if (this.has(this.idAttribute)) {
      this.id = this.get(this.idAttribute);
    }

    // Initialize changed tracking
    this.changed = {};

    // Call initialize hook
    this.initialize(attributes, options);
  }

  /**
   * Preinitialize is an empty function by default. You can override it with a function
   * or object. Preinitialize will run before any instantiation logic is run in the Model.
   *
   * @param {Object} attributes - Initial attributes
   * @param {Object} options - Options
   */
  preinitialize(attributes, options) {
    // Override in subclass
  }

  /**
   * Initialize is an empty function by default. Override it with your own
   * initialization logic.
   *
   * @param {Object} attributes - Initial attributes
   * @param {Object} options - Options
   */
  initialize(attributes, options) {
    // Override in subclass
  }

  /**
   * Return a copy of the model's `attributes` object.
   *
   * @param {Object} [options] - Options (not used, for compatibility)
   * @returns {Object} Cloned attributes
   */
  toJSON(options) {
    // Use shallow clone (lodash clone) - matches original Backbone behavior
    return clone(this.attributes);
  }

  /**
   * Get the value of an attribute.
   *
   * @param {string} attr - Attribute name
   * @returns {*} Attribute value
   *
   * @example
   * model.get('title'); // Returns the title attribute
   */
  get(attr) {
    return this.attributes[attr];
  }

  /**
   * Get the HTML-escaped value of an attribute.
   *
   * @param {string} attr - Attribute name
   * @returns {string} HTML-escaped attribute value
   *
   * @example
   * model.set('content', '<script>alert("xss")</script>');
   * model.escape('content'); // '&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;'
   */
  escape(attr) {
    return escapeHtml(String(this.get(attr) ?? ''));
  }

  /**
   * Returns `true` if the attribute contains a value that is not null or undefined.
   *
   * @param {string} attr - Attribute name
   * @returns {boolean} True if attribute has a value
   *
   * @example
   * model.has('title'); // true if title is not null/undefined
   */
  has(attr) {
    return this.get(attr) != null;
  }

  /**
   * Special-cased proxy to check if attributes match a pattern.
   *
   * @param {Object} attrs - Attributes to match
   * @returns {boolean} True if attributes match
   *
   * @example
   * model.matches({ author: 'Shakespeare' }); // true if author matches
   */
  matches(attrs) {
    // Simple implementation: check if all provided attrs match
    for (const key in attrs) {
      if (attrs[key] !== this.get(key)) {
        return false;
      }
    }
    return true;
  }

  /**
   * Set a hash of model attributes on the object, firing `"change"`.
   * This is the core primitive operation of a model, updating the data and notifying
   * anyone who needs to know about the change in state.
   *
   * @param {string|Object} key - Attribute name or hash of attributes
   * @param {*} [val] - Attribute value (if key is a string)
   * @param {Object} [options] - Options
   * @param {boolean} [options.silent=false] - Suppress change events
   * @param {boolean} [options.unset=false] - Delete attribute instead of setting
   * @param {boolean} [options.validate=false] - Run validation
   * @returns {Model|false} Returns this for chaining, or false if validation fails
   *
   * @example
   * model.set('title', 'Hamlet');
   * model.set({ title: 'Hamlet', author: 'Shakespeare' });
   * model.set('obsolete', null, { unset: true }); // Removes attribute
   */
  set(key, val, options) {
    if (key == null) return this;

    // Handle both `"key", value` and `{key: value}` -style arguments
    let attrs;
    if (typeof key === 'object') {
      attrs = key;
      options = val;
    } else {
      attrs = {};
      attrs[key] = val;
    }

    options = options || {};

    // Run validation
    if (!this._validate(attrs, options)) return false;

    // Extract attributes and options
    const unset = options.unset;
    const silent = options.silent;
    const changes = [];
    const changing = this._changing;
    this._changing = true;

    if (!changing) {
      this._previousAttributes = clone(this.attributes);
      this.changed = {};
    }

    const current = this.attributes;
    const changed = this.changed;
    const prev = this._previousAttributes;

    // For each `set` attribute, update or delete the current value
    for (const attr in attrs) {
      val = attrs[attr];
      if (!isEqual(current[attr], val)) changes.push(attr);
      if (!isEqual(prev[attr], val)) {
        changed[attr] = val;
      } else {
        delete changed[attr];
      }
      unset ? delete current[attr] : current[attr] = val;
    }

    // Update the `id` (use instance idAttribute which may be customized)
    if (this.idAttribute in attrs) {
      const prevId = this.id;
      this.id = this.get(this.idAttribute);
      if (this.id !== prevId) {
        this.trigger('changeId', this, prevId, options);
      }
    }

    // Trigger all relevant attribute changes
    if (!silent) {
      if (changes.length) this._pending = options;
      for (let i = 0; i < changes.length; i++) {
        this.trigger('change:' + changes[i], this, current[changes[i]], options);
      }
    }

    // You might be wondering why there's a `while` loop here. Changes can
    // be recursively nested within `"change"` events.
    if (changing) return this;
    if (!silent) {
      while (this._pending) {
        options = this._pending;
        this._pending = false;
        this.trigger('change', this, options);
      }
    }
    this._pending = false;
    this._changing = false;
    return this;
  }

  /**
   * Remove an attribute from the model, firing `"change"`.
   * `unset` is a noop if the attribute doesn't exist.
   *
   * @param {string} attr - Attribute name
   * @param {Object} [options] - Options
   * @returns {Model|false} Returns this for chaining, or false if validation fails
   *
   * @example
   * model.unset('obsolete'); // Removes the 'obsolete' attribute
   */
  unset(attr, options) {
    return this.set(attr, void 0, extend({}, options, { unset: true }));
  }

  /**
   * Clear all attributes on the model, firing `"change"`.
   *
   * @param {Object} [options] - Options
   * @returns {Model|false} Returns this for chaining, or false if validation fails
   *
   * @example
   * model.clear(); // Removes all attributes
   */
  clear(options) {
    const attrs = {};
    for (const key in this.attributes) {
      attrs[key] = void 0;
    }
    return this.set(attrs, extend({}, options, { unset: true }));
  }

  /**
   * Determine if the model has changed since the last `"change"` event.
   * If you specify an attribute name, determine if that attribute has changed.
   *
   * @param {string} [attr] - Attribute name
   * @returns {boolean} True if model or attribute has changed
   *
   * @example
   * model.hasChanged(); // true if any attribute changed
   * model.hasChanged('title'); // true if title changed
   */
  hasChanged(attr) {
    if (attr == null) return !isEmpty(this.changed);
    return hasKey(this.changed, attr);
  }

  /**
   * Return an object containing all the attributes that have changed, or
   * false if there are no changed attributes. Useful for determining what
   * parts of a view need to be updated and/or what attributes need to be
   * persisted to the server. Unset attributes will be set to undefined.
   * You can also pass an attributes object to diff against the model,
   * determining if there *would be* a change.
   *
   * @param {Object} [diff] - Attributes to diff against
   * @returns {Object|false} Changed attributes or false
   *
   * @example
   * const changes = model.changedAttributes();
   * if (changes) console.log('Changed:', Object.keys(changes));
   */
  changedAttributes(diff) {
    if (!diff) return this.hasChanged() ? clone(this.changed) : false;
    const old = this._changing ? this._previousAttributes : this.attributes;
    const changed = {};
    let hasChanged = false;

    for (const attr in diff) {
      const val = diff[attr];
      if (isEqual(old[attr], val)) continue;
      changed[attr] = val;
      hasChanged = true;
    }
    return hasChanged ? changed : false;
  }

  /**
   * Get the previous value of an attribute, recorded at the time the last
   * `"change"` event was fired.
   *
   * @param {string} attr - Attribute name
   * @returns {*} Previous attribute value
   *
   * @example
   * model.previous('title'); // Returns previous title value
   */
  previous(attr) {
    if (attr == null || !this._previousAttributes) return null;
    return this._previousAttributes[attr];
  }

  /**
   * Get all of the attributes of the model at the time of the previous
   * `"change"` event.
   *
   * @returns {Object} Previous attributes
   *
   * @example
   * const prev = model.previousAttributes();
   */
  previousAttributes() {
    return clone(this._previousAttributes);
  }

  /**
   * Create a new model with identical attributes to this one.
   *
   * @returns {Model} Cloned model
   *
   * @example
   * const copy = model.clone();
   */
  clone() {
    return new this.constructor(this.attributes);
  }

  /**
   * A model is new if it has never been saved to the server, and lacks an id.
   *
   * @returns {boolean} True if model is new
   *
   * @example
   * model.isNew(); // true if no id attribute set
   */
  isNew() {
    return !this.has(this.idAttribute);
  }

  /**
   * Check if the model is currently in a valid state.
   *
   * @param {Object} [options] - Options
   * @returns {boolean} True if valid
   *
   * @example
   * if (model.isValid()) {
   *   // proceed with save
   * }
   */
  isValid(options) {
    return this._validate({}, extend({}, options, { validate: true }));
  }

  /**
   * Run validation against the next complete set of model attributes,
   * returning `true` if all is well. Otherwise, fire an `"invalid"` event.
   *
   * @private
   * @param {Object} attrs - Attributes to validate
   * @param {Object} options - Options
   * @returns {boolean} True if valid
   */
  _validate(attrs, options) {
    if (!options.validate || !this.validate) return true;
    attrs = extend({}, this.attributes, attrs);
    const error = this.validationError = this.validate(attrs, options) || null;
    if (!error) return true;
    this.trigger('invalid', this, error, extend(options, { validationError: error }));
    return false;
  }

  /**
   * Default validation method. Override this to provide custom validation.
   * Return an error message if validation fails, or nothing if valid.
   *
   * @param {Object} attrs - Attributes to validate
   * @param {Object} options - Options
   * @returns {*} Error message if invalid, undefined if valid
   *
   * @example
   * validate(attrs) {
   *   if (!attrs.title) return 'Title is required';
   * }
   */
  validate(attrs, options) {
    // Override in subclass
  }

  /**
   * Default URL for the model's representation.
   * Override `urlRoot` or this method in your subclass.
   *
   * @returns {string} Model URL
   * @throws {Error} If no url/urlRoot is defined
   *
   * @example
   * class Book extends Model {
   *   urlRoot = '/books';
   * }
   * const book = new Book({ id: 1 });
   * book.url(); // '/books/1'
   */
  url() {
    const base = result(this, 'urlRoot') ||
                 result(this.collection, 'url') ||
                 this._urlError();
    if (this.isNew()) return base;
    const id = this.get(this.idAttribute);
    return base.replace(/[^\/]$/, '$&/') + encodeURIComponent(id);
  }

  /**
   * Throw error for missing URL
   * @private
   */
  _urlError() {
    throw new Error('A "url" property or function must be specified');
  }

  /**
   * Parse converts a response into the hash of attributes to be `set` on
   * the model. The default implementation is just to pass the response along.
   *
   * @param {Object} resp - Response data
   * @param {Object} options - Options
   * @returns {Object} Parsed attributes
   *
   * @example
   * parse(resp) {
   *   return resp.data; // Extract nested data
   * }
   */
  parse(resp, options) {
    return resp;
  }

  /**
   * Returns the defaults hash for this model.
   * Override this method to provide default attributes.
   *
   * @returns {Object} Default attributes
   *
   * @example
   * defaults() {
   *   return { title: 'Untitled', published: false };
   * }
   */
  defaults() {
    return {};
  }

  // ============================================================================
  // Server Persistence Methods
  // ============================================================================

  /**
   * Proxy to the model's Sync class. Override per class to use a
   * different transport:
   *
   *   class MyModel extends Model {}
   *   MyModel.Sync = class extends Sync {
   *     init(method, model, options) {
   *       const init = super.init(method, model, options);
   *       init.headers['Authorization'] = 'Bearer token';
   *       return init;
   *     }
   *   };
   */
  sync(method, model, options) {
    return new this.constructor.Sync().execute(method, model, options);
  }

  /**
   * Fetch the model from the server, merging the response with local attributes.
   * Triggers a "change" event if the attributes change.
   *
   * @param {Object} [options={}]
   * @param {boolean} [options.parse=true] - Run response through parse()
   * @returns {Promise}
   */
  fetch(options = {}) {
    options = extend({ parse: true }, options);
    const success = options.success;
    options.success = (resp) => {
      const attrs = options.parse ? this.parse(resp, options) : resp;
      if (attrs) this.set(attrs, options);
      if (success) success.call(options.context, this, resp, options);
    };
    return this.sync('read', this, options);
  }

  /**
   * Save the model to the server. Uses POST for new models, PUT for existing,
   * PATCH when `options.patch` is true.
   *
   * @param {string|Object} [key] - Attribute name or hash
   * @param {*} [val] - Attribute value
   * @param {Object} [options={}]
   * @param {boolean} [options.wait=false] - Wait for server before updating
   * @param {boolean} [options.patch=false] - Use PATCH instead of PUT
   * @returns {Promise|false} Returns false if validation fails
   */
  save(key, val, options) {
    let attrs;
    if (key == null || typeof key === 'object') {
      attrs = key;
      options = val || {};
    } else {
      (attrs = {})[key] = val;
      options = options || {};
    }

    options = extend({ validate: true, parse: true }, options);
    const wait = options.wait;

    if (attrs && !wait) {
      if (!this.set(attrs, options)) return false;
    } else if (!this._validate(attrs, options)) {
      return false;
    }

    const savedAttrs = extend({}, this.attributes);
    if (attrs && wait) extend(this.attributes, attrs);

    const success = options.success;
    options.success = (resp) => {
      // Restore original attributes during parse
      extend(this.attributes, savedAttrs);
      let serverAttrs = options.parse ? this.parse(resp, options) : resp;
      if (wait && attrs) serverAttrs = extend({}, attrs, serverAttrs);
      if (serverAttrs) this.set(serverAttrs, options);
      if (success) success.call(options.context, this, resp, options);
    };

    const method = this.isNew() ? 'create' : options.patch ? 'patch' : 'update';
    if (method === 'patch' && !options.attrs) options.attrs = attrs;

    const xhr = this.sync(method, this, options);
    // Restore attributes if wait
    if (attrs && wait) extend(this.attributes, savedAttrs);
    return xhr;
  }

  /**
   * Destroy this model on the server. Removes it from its collection.
   * If `wait: true`, waits for the server before removing.
   *
   * @param {Object} [options={}]
   * @param {boolean} [options.wait=false] - Wait for server before triggering destroy
   * @returns {Promise|false}
   */
  destroy(options = {}) {
    const wait = options.wait;

    const destroyModel = () => {
      this.stopListening();
      this.trigger('destroy', this, this.collection, options);
    };

    if (this.isNew()) {
      destroyModel();
      return Promise.resolve(false);
    }

    const success = options.success;
    options.success = (resp) => {
      if (wait) destroyModel();
      if (success) success.call(options.context, this, resp, options);
    };

    if (!wait) destroyModel();
    return this.sync('delete', this, options);
  }
}

// Mix in EventsMixin to Model prototype
Object.assign(Model.prototype, EventsMixin);

// Default Sync class — swap via MyModel.Sync = CustomSync
Model.Sync = Sync;

// Underscore/Lodash methods that operate on model attributes
// These provide convenient access to common operations on the attributes object

/**
 * Get the names of all attributes.
 *
 * @returns {Array<string>} Array of attribute names
 *
 * @example
 * const model = new Model({ name: 'Jane', age: 28 });
 * model.keys(); // ['name', 'age']
 */
Model.prototype.keys = function() {
  return keys(this.attributes);
};

/**
 * Get the values of all attributes.
 *
 * @returns {Array<*>} Array of attribute values
 *
 * @example
 * const model = new Model({ name: 'Jane', age: 28 });
 * model.values(); // ['Jane', 28]
 */
Model.prototype.values = function() {
  return values(this.attributes);
};

/**
 * Get an array of [key, value] pairs of all attributes.
 *
 * @returns {Array<Array>} Array of [key, value] pairs
 *
 * @example
 * const model = new Model({ name: 'Jane', age: 28 });
 * model.pairs(); // [['name', 'Jane'], ['age', 28]]
 */
Model.prototype.pairs = function() {
  return toPairs(this.attributes);
};

/**
 * Returns a copy of the model's attributes where the keys have become the values
 * and the values the keys.
 *
 * @returns {Object} Inverted attributes object
 *
 * @example
 * const model = new Model({ first: 'Jane', last: 'Doe' });
 * model.invert(); // { Jane: 'first', Doe: 'last' }
 */
Model.prototype.invert = function() {
  return invert(this.attributes);
};

/**
 * Return a copy of the model's attributes with only the specified keys.
 *
 * @param {...string} keys - Keys to pick from attributes
 * @returns {Object} Object with picked attributes
 *
 * @example
 * const model = new Model({ name: 'Jane', age: 28, city: 'SF' });
 * model.pick('name', 'age'); // { name: 'Jane', age: 28 }
 */
Model.prototype.pick = function(...keys) {
  return pick(this.attributes, ...keys);
};

/**
 * Return a copy of the model's attributes without the specified keys.
 *
 * @param {...string} keys - Keys to omit from attributes
 * @returns {Object} Object without omitted attributes
 *
 * @example
 * const model = new Model({ name: 'Jane', age: 28, city: 'SF' });
 * model.omit('age'); // { name: 'Jane', city: 'SF' }
 */
Model.prototype.omit = function(...keys) {
  return omit(this.attributes, ...keys);
};

/**
 * Returns a wrapped object that enables chaining of lodash methods.
 * Call .value() at the end to retrieve the result.
 *
 * @returns {Object} Wrapped lodash chain object
 *
 * @example
 * const model = new Model({ a: 1, b: 2, c: 3 });
 * const result = model.chain()
 *   .pick('a', 'b')
 *   .invert()
 *   .value(); // { '1': 'a', '2': 'b' }
 */
Model.prototype.chain = function() {
  return chain(this.attributes);
};

/**
 * Returns true if the model has no attributes.
 *
 * @returns {boolean} True if no attributes
 *
 * @example
 * const model = new Model();
 * model.isEmpty(); // true
 * model.set('name', 'Jane');
 * model.isEmpty(); // false
 */
Model.prototype.isEmpty = function() {
  return isEmpty(this.attributes);
};

// Set default prototype properties
// These can be overridden in subclasses and will be properly inherited

/**
 * The default name for the JSON `id` attribute.
 * MongoDB and CouchDB users may want to set this to `"_id"`.
 *
 * @type {string}
 */
Model.prototype.idAttribute = 'id';

/**
 * The prefix used to create the client id which is used to identify models locally.
 * You may want to override this if you're experiencing name clashes with model ids.
 *
 * @type {string}
 */
Model.prototype.cidPrefix = 'c';

/**
 * A hash of attributes whose current and previous value differ.
 *
 * @type {Object|null}
 */
Model.prototype.changed = null;

/**
 * The value returned during the last failed validation.
 *
 * @type {*}
 */
Model.prototype.validationError = null;

export default Model;
