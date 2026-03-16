/**
 * Collection - Modern ES6 collection class for Backbone
 *
 * Represents an ordered set of models.
 *
 * @module Collection
 */

import {
  isArray,
  isFunction,
  isString,
  extend,
  clone,
  result,
  // Utility methods that will be added to prototype
  forEach,
  each,
  map,
  reduce,
  reduceRight,
  find,
  filter,
  reject,
  every,
  some,
  includes,
  invokeMap,
  maxBy,
  minBy,
  toArray,
  size,
  first,
  head,
  take,
  takeRight,
  initial,
  rest,
  tail,
  drop,
  last,
  without,
  difference,
  indexOf,
  shuffle,
  lastIndexOf,
  isEmpty,
  chain,
  sample,
  partition,
  groupBy,
  countBy,
  sortBy,
  indexBy,
  findIndex,
  findLastIndex
} from 'lodash-es';
import { EventsMixin } from './mixins/events.js';
import { Model } from './model.js';

/**
 * Collection class - Ordered set of models
 *
 * @class Collection
 * @example
 * class Books extends Collection {
 *   model = Book;
 *   comparator = 'title';
 * }
 *
 * const library = new Books([
 *   { title: '1984', author: 'Orwell' },
 *   { title: 'Brave New World', author: 'Huxley' }
 * ]);
 */
class Collection {
  /**
   * Create a new Collection
   *
   * @param {Array} models - Initial models or model data
   * @param {Object} options - Options
   * @param {Function} options.model - Model class to use
   * @param {Function|string} options.comparator - Sort comparator
   */
  constructor(models = [], options = {}) {
    // Call preinitialize hook before any setup
    this.preinitialize.apply(this, arguments);

    // Set model class if provided
    if (options.model) this.model = options.model;

    // Set comparator if provided
    if (options.comparator !== undefined) this.comparator = options.comparator;

    // Initialize internal state
    this._reset();

    // Call initialize hook
    this.initialize.apply(this, arguments);

    // Add initial models if provided
    if (models) {
      this.reset(models, extend({ silent: true }, options));
    }
  }

  /**
   * Preinitialize hook - called before any initialization logic
   * Override this in subclasses to add custom pre-initialization logic
   */
  preinitialize() {
    // Empty by default
  }

  /**
   * Initialize hook - called after collection is created
   * Override this in subclasses to add custom initialization logic
   */
  initialize() {
    // Empty by default
  }

  /**
   * Get the model class for this collection
   * @returns {Function} Model class
   */
  get model() {
    return this._model || Model;
  }

  set model(ModelClass) {
    this._model = ModelClass;
  }

  /**
   * Return the collection as JSON (array of model toJSON)
   *
   * @param {Object} options - Options to pass to model toJSON
   * @returns {Array} Array of model JSON representations
   */
  toJSON(options) {
    return this.map(model => model.toJSON(options));
  }

  /**
   * Add models to the collection
   *
   * @param {Model|Object|Array} models - Models or model data to add
   * @param {Object} options - Options
   * @param {boolean} options.at - Index to insert at
   * @param {boolean} options.merge - Merge with existing models
   * @param {boolean} options.silent - Suppress events
   * @returns {Model|Array} Added model(s)
   */
  add(models, options) {
    return this.set(models, extend({ merge: false }, options, { add: true, remove: false }));
  }

  /**
   * Remove models from the collection
   *
   * @param {Model|Object|Array} models - Models to remove
   * @param {Object} options - Options
   * @param {boolean} options.silent - Suppress events
   * @returns {Model|Array} Removed model(s)
   */
  remove(models, options = {}) {
    const singular = !isArray(models);
    models = singular ? [models] : models.slice();
    const removed = this._removeModels(models, options);

    if (!options.silent && removed.length) {
      options.changes = { added: [], merged: [], removed };
      this.trigger('update', this, options);
    }

    return singular ? removed[0] : removed;
  }

  /**
   * Update the collection with new models (core operation)
   * Add new models, remove missing models, merge existing models
   *
   * @param {Model|Object|Array} models - Models or model data
   * @param {Object} options - Options
   * @param {boolean} options.add - Add new models
   * @param {boolean} options.remove - Remove missing models
   * @param {boolean} options.merge - Merge existing models
   * @param {number} options.at - Index to insert at
   * @param {boolean} options.silent - Suppress events
   * @returns {Model|Array} Model(s) that were set
   */
  set(models, options = {}) {
    if (models == null) return;

    options = extend({}, { add: true, remove: true, merge: true }, options);

    if (options.parse && !this._isModel(models)) {
      models = this.parse(models, options) || [];
    }

    const singular = !isArray(models);
    models = singular ? [models] : models.slice();

    let at = options.at;
    if (at != null) {
      at = +at;
      if (at > this.length) at = this.length;
      if (at < 0) at += this.length + 1;
    }

    const set = [];
    const toAdd = [];
    const toMerge = [];
    const toRemove = [];
    const modelMap = {};

    const { add, merge, remove } = options;

    let sort = false;
    const sortable = this.comparator && at == null && options.sort !== false;
    const sortAttr = isString(this.comparator) ? this.comparator : null;

    // Process each model
    for (let i = 0; i < models.length; i++) {
      let model = models[i];

      // Check if model already exists
      const existing = this.get(model);
      if (existing) {
        // Merge if requested
        if (merge && model !== existing) {
          let attrs = this._isModel(model) ? model.attributes : model;
          if (options.parse) attrs = existing.parse(attrs, options);
          existing.set(attrs, options);
          toMerge.push(existing);
          if (sortable && !sort) sort = existing.hasChanged(sortAttr);
        }
        if (!modelMap[existing.cid]) {
          modelMap[existing.cid] = true;
          set.push(existing);
        }
        models[i] = existing;
      } else if (add) {
        // Add new model
        model = models[i] = this._prepareModel(model, options);
        if (model) {
          toAdd.push(model);
          this._addReference(model, options);
          modelMap[model.cid] = true;
          set.push(model);
        }
      }
    }

    // Remove models no longer in the set
    if (remove) {
      for (let i = 0; i < this.length; i++) {
        const model = this.models[i];
        if (!modelMap[model.cid]) toRemove.push(model);
      }
      if (toRemove.length) this._removeModels(toRemove, options);
    }

    // Handle ordering and splicing
    let orderChanged = false;
    const replace = !sortable && add && remove;

    if (set.length && replace) {
      orderChanged = this.length !== set.length || this.models.some((m, index) => m !== set[index]);
      this.models.length = 0;
      this._splice(this.models, set, 0);
      this.length = this.models.length;
    } else if (toAdd.length) {
      if (sortable) sort = true;
      this._splice(this.models, toAdd, at == null ? this.length : at);
      this.length = this.models.length;
    }

    // Sort if needed
    if (sort) this.sort({ silent: true });

    // Fire events
    if (!options.silent) {
      for (let i = 0; i < toAdd.length; i++) {
        if (at != null) options.index = at + i;
        const model = toAdd[i];
        model.trigger('add', model, this, options);
      }
      if (sort || orderChanged) this.trigger('sort', this, options);
      if (toAdd.length || toRemove.length || toMerge.length) {
        options.changes = {
          added: toAdd,
          removed: toRemove,
          merged: toMerge
        };
        this.trigger('update', this, options);
      }
    }

    return singular ? models[0] : models;
  }

  /**
   * Reset the collection with new models
   *
   * @param {Array} models - New models
   * @param {Object} options - Options
   * @param {boolean} options.silent - Suppress events
   * @returns {Array} Models
   */
  reset(models, options = {}) {
    options = clone(options);

    for (let i = 0; i < this.models.length; i++) {
      this._removeReference(this.models[i], options);
    }

    options.previousModels = this.models;
    this._reset();
    models = this.add(models, extend({ silent: true }, options));

    if (!options.silent) this.trigger('reset', this, options);

    return models;
  }

  /**
   * Add model to end of collection
   *
   * @param {Model|Object} model - Model to add
   * @param {Object} options - Options
   * @returns {Model} Added model
   */
  push(model, options) {
    return this.add(model, extend({ at: this.length }, options));
  }

  /**
   * Remove and return last model
   *
   * @param {Object} options - Options
   * @returns {Model} Removed model
   */
  pop(options) {
    const model = this.at(this.length - 1);
    return this.remove(model, options);
  }

  /**
   * Add model to beginning of collection
   *
   * @param {Model|Object} model - Model to add
   * @param {Object} options - Options
   * @returns {Model} Added model
   */
  unshift(model, options) {
    return this.add(model, extend({ at: 0 }, options));
  }

  /**
   * Remove and return first model
   *
   * @param {Object} options - Options
   * @returns {Model} Removed model
   */
  shift(options) {
    const model = this.at(0);
    return this.remove(model, options);
  }

  /**
   * Slice out a sub-array of models
   *
   * @param {number} begin - Start index
   * @param {number} end - End index
   * @returns {Array} Sliced models
   */
  slice(...args) {
    return this.models.slice(...args);
  }

  /**
   * Get a model by id, cid, or index
   *
   * @param {string|number|Model} obj - ID, cid, model, or attributes
   * @returns {Model|undefined} Model if found
   */
  get(obj) {
    if (obj == null) return undefined;

    return this._byId[obj] ||
      this._byId[this.modelId(this._isModel(obj) ? obj.attributes : obj, obj.idAttribute)] ||
      (obj.cid && this._byId[obj.cid]);
  }

  /**
   * Check if collection has a model
   *
   * @param {Model|Object} obj - Model or id
   * @returns {boolean} True if collection has the model
   */
  has(obj) {
    return this.get(obj) != null;
  }

  /**
   * Get model at index (supports negative indices)
   *
   * @param {number} index - Index
   * @returns {Model} Model at index
   */
  at(index) {
    if (index < 0) index += this.length;
    return this.models[index];
  }

  /**
   * Find models matching attributes
   *
   * @param {Object} attrs - Attributes to match
   * @param {boolean} first - Return first match only
   * @returns {Model|Array} Matching model(s)
   */
  where(attrs, first) {
    return this[first ? 'find' : 'filter'](attrs);
  }

  /**
   * Find first model matching attributes
   *
   * @param {Object} attrs - Attributes to match
   * @returns {Model} First matching model
   */
  findWhere(attrs) {
    return this.where(attrs, true);
  }

  /**
   * Sort the collection
   *
   * @param {Object} options - Options
   * @param {boolean} options.silent - Suppress events
   * @returns {Collection} this
   */
  sort(options = {}) {
    let comparator = this.comparator;
    if (!comparator) {
      throw new Error('Cannot sort a set without a comparator');
    }

    const length = comparator.length;
    if (isFunction(comparator)) comparator = comparator.bind(this);

    // Sort based on comparator type
    if (length === 1 || isString(this.comparator)) {
      this.models = this.sortBy(this.comparator);
    } else {
      this.models.sort(comparator);
    }

    if (!options.silent) this.trigger('sort', this, options);
    return this;
  }

  /**
   * Pluck an attribute from each model
   *
   * @param {string} attr - Attribute name
   * @returns {Array} Array of attribute values
   */
  pluck(attr) {
    return this.map(attr);
  }

  /**
   * Parse response data (override point)
   *
   * @param {*} resp - Response data
   * @param {Object} options - Options
   * @returns {Array} Parsed models array
   */
  parse(resp, options) {
    return resp;
  }

  /**
   * Clone the collection
   *
   * @returns {Collection} Cloned collection
   */
  clone() {
    return new this.constructor(this.models, {
      model: this.model,
      comparator: this.comparator
    });
  }

  /**
   * Get the model ID from attributes
   *
   * @param {Object} attrs - Attributes
   * @param {string} idAttribute - ID attribute name
   * @returns {*} Model ID
   */
  modelId(attrs, idAttribute) {
    return attrs[idAttribute || this.model.prototype.idAttribute || 'id'];
  }

  /**
   * JavaScript Iterator protocol - values
   * Allows for...of loops
   *
   * @returns {Iterator} Values iterator
   */
  values() {
    return new CollectionIterator(this, ITERATOR_VALUES);
  }

  /**
   * JavaScript Iterator protocol - keys
   *
   * @returns {Iterator} Keys iterator
   */
  keys() {
    return new CollectionIterator(this, ITERATOR_KEYS);
  }

  /**
   * JavaScript Iterator protocol - entries
   *
   * @returns {Iterator} Entries iterator
   */
  entries() {
    return new CollectionIterator(this, ITERATOR_KEYSVALUES);
  }

  /**
   * Default iterator (values)
   */
  [Symbol.iterator]() {
    return this.values();
  }

  // Sync/fetch methods - not implemented in modern version

  /**
   * Sync - NOT IMPLEMENTED
   * @throws {Error} Always throws
   */
  sync() {
    throw new Error(
      'Collection.sync() is not implemented in the modern Backbone library. ' +
      'Use external data fetching libraries (fetch API, axios, etc.).'
    );
  }

  /**
   * Fetch - NOT IMPLEMENTED
   * @throws {Error} Always throws
   */
  fetch() {
    throw new Error(
      'Collection.fetch() is not implemented in the modern Backbone library. ' +
      'Use external data fetching libraries to retrieve data. ' +
      'Example: const data = await fetch(url).then(r => r.json()); collection.set(data);'
    );
  }

  /**
   * Create - NOT IMPLEMENTED
   * @throws {Error} Always throws
   */
  create() {
    throw new Error(
      'Collection.create() is not implemented in the modern Backbone library. ' +
      'Create models manually and add them to the collection.'
    );
  }

  // Internal methods

  /**
   * Reset internal state
   * @private
   */
  _reset() {
    this.length = 0;
    this.models = [];
    this._byId = {};
  }

  /**
   * Prepare a model for addition to collection
   * @private
   */
  _prepareModel(attrs, options) {
    if (this._isModel(attrs)) {
      if (!attrs.collection) attrs.collection = this;
      return attrs;
    }

    options = options ? clone(options) : {};
    options.collection = this;

    const ModelClass = this.model;
    const model = new ModelClass(attrs, options);

    if (!model.validationError) return model;

    this.trigger('invalid', this, model.validationError, options);
    return false;
  }

  /**
   * Check if object is a model
   * @private
   */
  _isModel(model) {
    return model instanceof Model;
  }

  /**
   * Add internal references for a model
   * @private
   */
  _addReference(model, options) {
    this._byId[model.cid] = model;
    const id = this.modelId(model.attributes, model.idAttribute);
    if (id != null) this._byId[id] = model;
    model.on('all', this._onModelEvent, this);
  }

  /**
   * Remove internal references for a model
   * @private
   */
  _removeReference(model, options) {
    delete this._byId[model.cid];
    const id = this.modelId(model.attributes, model.idAttribute);
    if (id != null) delete this._byId[id];
    if (this === model.collection) delete model.collection;
    model.off('all', this._onModelEvent, this);
  }

  /**
   * Handle events from models in collection
   * @private
   */
  _onModelEvent(event, model, collection, options) {
    if (model) {
      if ((event === 'add' || event === 'remove') && collection !== this) return;
      if (event === 'destroy') this.remove(model, options);
      if (event === 'changeId') {
        const prevId = this.modelId(model.previousAttributes(), model.idAttribute);
        const id = this.modelId(model.attributes, model.idAttribute);
        if (prevId != null) delete this._byId[prevId];
        if (id != null) this._byId[id] = model;
      }
    }
    this.trigger.apply(this, arguments);
  }

  /**
   * Remove models from collection
   * @private
   */
  _removeModels(models, options) {
    const removed = [];
    for (let i = 0; i < models.length; i++) {
      const model = this.get(models[i]);
      if (!model) continue;

      const index = this.models.indexOf(model);
      this.models.splice(index, 1);
      this.length--;

      // Remove references
      delete this._byId[model.cid];
      const id = this.modelId(model.attributes, model.idAttribute);
      if (id != null) delete this._byId[id];

      if (!options || !options.silent) {
        options = options || {};
        options.index = index;
        model.trigger('remove', model, this, options);
      }

      removed.push(model);
      this._removeReference(model, options);
    }
    return removed;
  }

  /**
   * Splice helper for arrays
   * @private
   */
  _splice(array, insert, at) {
    at = Math.min(Math.max(at, 0), array.length);
    const tail = Array(array.length - at);
    const length = insert.length;

    for (let i = 0; i < tail.length; i++) tail[i] = array[i + at];
    for (let i = 0; i < length; i++) array[i + at] = insert[i];
    for (let i = 0; i < tail.length; i++) array[i + length + at] = tail[i];
  }
}

// Mix in EventsMixin
Object.assign(Collection.prototype, EventsMixin);

// Iterator constants
const ITERATOR_VALUES = 1;
const ITERATOR_KEYS = 2;
const ITERATOR_KEYSVALUES = 3;

/**
 * Collection Iterator for JavaScript iteration protocol
 * @private
 */
class CollectionIterator {
  constructor(collection, kind) {
    this._collection = collection;
    this._kind = kind;
    this._index = 0;
  }

  [Symbol.iterator]() {
    return this;
  }

  next() {
    if (this._collection) {
      if (this._index < this._collection.length) {
        const model = this._collection.at(this._index);
        this._index++;

        let value;
        if (this._kind === ITERATOR_VALUES) {
          value = model;
        } else {
          const id = this._collection.modelId(model.attributes, model.idAttribute);
          if (this._kind === ITERATOR_KEYS) {
            value = id;
          } else {
            value = [id, model];
          }
        }
        return { value, done: false };
      }

      this._collection = undefined;
    }

    return { value: undefined, done: true };
  }
}

// Add lodash utility methods to Collection prototype
// These operate on the models array and accept attr-based iteratees

const cb = function(iteratee, instance) {
  if (isFunction(iteratee)) return iteratee;
  if (typeof iteratee === 'object' && !instance._isModel(iteratee)) {
    return model => {
      for (const key in iteratee) {
        if (model.get(key) !== iteratee[key]) return false;
      }
      return true;
    };
  }
  if (isString(iteratee)) return model => model.get(iteratee);
  return iteratee;
};

// forEach/each
Collection.prototype.forEach = Collection.prototype.each = function(iteratee, context) {
  iteratee = cb(iteratee, this);
  return forEach(this.models, iteratee, context);
};

// map/collect
Collection.prototype.map = Collection.prototype.collect = function(iteratee, context) {
  iteratee = cb(iteratee, this);
  return map(this.models, iteratee, context);
};

// reduce methods
Collection.prototype.reduce = Collection.prototype.foldl = Collection.prototype.inject = function(...args) {
  const iteratee = args[0];
  args[0] = cb(iteratee, this);
  return reduce(this.models, ...args);
};

Collection.prototype.reduceRight = Collection.prototype.foldr = function(...args) {
  const iteratee = args[0];
  args[0] = cb(iteratee, this);
  return reduceRight(this.models, ...args);
};

// find/detect
Collection.prototype.find = Collection.prototype.detect = function(iteratee, context) {
  iteratee = cb(iteratee, this);
  return find(this.models, iteratee, context);
};

// filter/select
Collection.prototype.filter = Collection.prototype.select = function(iteratee, context) {
  iteratee = cb(iteratee, this);
  return filter(this.models, iteratee, context);
};

// reject
Collection.prototype.reject = function(iteratee, context) {
  iteratee = cb(iteratee, this);
  return reject(this.models, iteratee, context);
};

// every/all
Collection.prototype.every = Collection.prototype.all = function(iteratee, context) {
  iteratee = cb(iteratee, this);
  return every(this.models, iteratee, context);
};

// some/any
Collection.prototype.some = Collection.prototype.any = function(iteratee, context) {
  iteratee = cb(iteratee, this);
  return some(this.models, iteratee, context);
};

// includes/contains/include
Collection.prototype.includes = Collection.prototype.include = Collection.prototype.contains = function(value, fromIndex) {
  return includes(this.models, value, fromIndex);
};

// invoke
Collection.prototype.invoke = function(path, ...args) {
  return invokeMap(this.models, path, ...args);
};

// max
Collection.prototype.max = function(iteratee, context) {
  if (!iteratee) return maxBy(this.models);
  iteratee = cb(iteratee, this);
  return maxBy(this.models, iteratee);
};

// min
Collection.prototype.min = function(iteratee, context) {
  if (!iteratee) return minBy(this.models);
  iteratee = cb(iteratee, this);
  return minBy(this.models, iteratee);
};

// toArray
Collection.prototype.toArray = function() {
  return toArray(this.models);
};

// size
Collection.prototype.size = function() {
  return size(this.models);
};

// first/head/take
Collection.prototype.first = Collection.prototype.head = Collection.prototype.take = function(n) {
  if (n == null) return first(this.models);
  return take(this.models, n);
};

// initial
Collection.prototype.initial = function(n) {
  return initial(this.models, n);
};

// rest/tail/drop
Collection.prototype.rest = Collection.prototype.tail = Collection.prototype.drop = function(n) {
  return drop(this.models, n);
};

// last
Collection.prototype.last = function(n) {
  if (n == null) return last(this.models);
  return takeRight(this.models, n);
};

// without
Collection.prototype.without = function(...values) {
  return without(this.models, ...values);
};

// difference
Collection.prototype.difference = function(...arrays) {
  return difference(this.models, ...arrays);
};

// indexOf
Collection.prototype.indexOf = function(value, fromIndex) {
  return indexOf(this.models, value, fromIndex);
};

// shuffle
Collection.prototype.shuffle = function() {
  return shuffle(this.models);
};

// lastIndexOf
Collection.prototype.lastIndexOf = function(value, fromIndex) {
  return lastIndexOf(this.models, value, fromIndex);
};

// isEmpty
Collection.prototype.isEmpty = function() {
  return isEmpty(this.models);
};

// chain
Collection.prototype.chain = function() {
  return chain(this.models);
};

// sample
Collection.prototype.sample = function(n) {
  return sample(this.models, n);
};

// partition
Collection.prototype.partition = function(iteratee, context) {
  iteratee = cb(iteratee, this);
  return partition(this.models, iteratee, context);
};

// groupBy
Collection.prototype.groupBy = function(iteratee, context) {
  iteratee = cb(iteratee, this);
  return groupBy(this.models, iteratee);
};

// countBy
Collection.prototype.countBy = function(iteratee, context) {
  iteratee = cb(iteratee, this);
  return countBy(this.models, iteratee);
};

// sortBy
Collection.prototype.sortBy = function(iteratee, context) {
  iteratee = cb(iteratee, this);
  return sortBy(this.models, iteratee);
};

// indexBy
Collection.prototype.indexBy = function(iteratee, context) {
  iteratee = cb(iteratee, this);
  return indexBy(this.models, iteratee);
};

// findIndex
Collection.prototype.findIndex = function(iteratee, context) {
  iteratee = cb(iteratee, this);
  return findIndex(this.models, iteratee,context);
};

// findLastIndex
Collection.prototype.findLastIndex = function(iteratee, context) {
  iteratee = cb(iteratee, this);
  return findLastIndex(this.models, iteratee, context);
};

export { Collection };
export default Collection;
