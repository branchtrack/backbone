/**
 * Tests for Collection class
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Collection } from '../src/collection.js';
import { Model } from '../src/model.js';

describe('Collection', () => {
  let collection;

  beforeEach(() => {
    collection = new Collection();
  });

  describe('constructor and initialization', () => {
    it('should create empty collection', () => {
      const col = new Collection();
      expect(col.length).toBe(0);
      expect(col.models).toEqual([]);
    });

    it('should accept initial models', () => {
      const col = new Collection([{ id: 1, name: 'a' }, { id: 2, name: 'b' }]);
      expect(col.length).toBe(2);
      expect(col.at(0).get('name')).toBe('a');
    });

    it('should call preinitialize before initialization', () => {
      const calls = [];
      class TestCollection extends Collection {
        preinitialize() {
          calls.push('pre');
          expect(this.models).toBeUndefined();
        }
        initialize() {
          calls.push('init');
          expect(this.models).toBeDefined();
        }
      }
      new TestCollection();
      expect(calls).toEqual(['pre', 'init']);
    });

    it('should call initialize with arguments', () => {
      const spy = vi.fn();
      class TestCollection extends Collection {
        initialize(models, options) {
          spy(models, options);
        }
      }
      const models = [{ id: 1 }];
      const options = { test: true };
      new TestCollection(models, options);
      expect(spy).toHaveBeenCalledWith(models, options);
    });

    it('should accept custom model class', () => {
      class CustomModel extends Model {}
      CustomModel.prototype.customMethod = () => 'custom';

      const col = new Collection(null, { model: CustomModel });
      col.add({ id: 1 });
      expect(col.at(0).customMethod()).toBe('custom');
    });

    it('should accept comparator', () => {
      const col = new Collection(
        [{ id: 3 }, { id: 1 }, { id: 2 }],
        { comparator: 'id' }
      );
      expect(col.at(0).id).toBe(1);
      expect(col.at(2).id).toBe(3);
    });
  });

  describe('add', () => {
    it('should add single model', () => {
      const model = collection.add({ id: 1, name: 'test' });
      expect(collection.length).toBe(1);
      expect(model.get('name')).toBe('test');
    });

    it('should add multiple models', () => {
      collection.add([{ id: 1 }, { id: 2 }, { id: 3 }]);
      expect(collection.length).toBe(3);
    });

    it('should trigger add event', () => {
      const spy = vi.fn();
      collection.on('add', spy);
      const model = collection.add({ id: 1 });
      expect(spy).toHaveBeenCalledWith(model, collection, expect.any(Object));
    });

    it('should not add duplicate models', () => {
      collection.add({ id: 1, name: 'first' });
      collection.add({ id: 1, name: 'second' });
      expect(collection.length).toBe(1);
      expect(collection.at(0).get('name')).toBe('first');
    });

    it('should add at specific index', () => {
      collection.add([{ id: 1 }, { id: 3 }]);
      collection.add({ id: 2 }, { at: 1 });
      expect(collection.at(1).id).toBe(2);
    });

    it('should trigger update event', () => {
      const spy = vi.fn();
      collection.on('update', spy);
      collection.add({ id: 1 });
      expect(spy).toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    beforeEach(() => {
      collection.add([{ id: 1 }, { id: 2 }, { id: 3 }]);
    });

    it('should remove model', () => {
      const model = collection.at(1);
      collection.remove(model);
      expect(collection.length).toBe(2);
      expect(collection.get(2)).toBeUndefined();
    });

    it('should remove by id', () => {
      collection.remove(2);
      expect(collection.length).toBe(2);
      expect(collection.get(2)).toBeUndefined();
    });

    it('should remove multiple models', () => {
      collection.remove([1, 3]);
      expect(collection.length).toBe(1);
      expect(collection.at(0).id).toBe(2);
    });

    it('should trigger remove event', () => {
      const spy = vi.fn();
      collection.on('remove', spy);
      const model = collection.at(0);
      collection.remove(model);
      expect(spy).toHaveBeenCalledWith(model, collection, expect.any(Object));
    });

    it('should return removed model', () => {
      const model = collection.at(0);
      const removed = collection.remove(model);
      expect(removed).toBe(model);
    });
  });

  describe('set', () => {
    it('should add new models', () => {
      collection.set([{ id: 1 }, { id: 2 }]);
      expect(collection.length).toBe(2);
    });

    it('should remove missing models', () => {
      collection.set([{ id: 1 }, { id: 2 }, { id: 3 }]);
      collection.set([{ id: 1 }, { id: 3 }]);
      expect(collection.length).toBe(2);
      expect(collection.get(2)).toBeUndefined();
    });

    it('should merge existing models', () => {
      collection.set([{ id: 1, name: 'first' }]);
      collection.set([{ id: 1, name: 'updated' }]);
      expect(collection.length).toBe(1);
      expect(collection.at(0).get('name')).toBe('updated');
    });

    it('should respect add/remove/merge options', () => {
      collection.set([{ id: 1 }, { id: 2 }]);
      collection.set([{ id: 2 }, { id: 3 }], { remove: false });
      expect(collection.length).toBe(3);
    });
  });

  describe('reset', () => {
    it('should reset with new models', () => {
      collection.add([{ id: 1 }, { id: 2 }]);
      collection.reset([{ id: 3 }, { id: 4 }]);
      expect(collection.length).toBe(2);
      expect(collection.at(0).id).toBe(3);
    });

    it('should trigger reset event', () => {
      const spy = vi.fn();
      collection.on('reset', spy);
      collection.reset([{ id: 1 }]);
      expect(spy).toHaveBeenCalled();
    });

    it('should provide previousModels in options', () => {
      collection.add([{ id: 1 }, { id: 2 }]);
      collection.on('reset', (col, options) => {
        expect(options.previousModels.length).toBe(2);
      });
      collection.reset([{ id: 3 }]);
    });
  });

  describe('push, pop, shift, unshift', () => {
    it('should push model to end', () => {
      collection.add([{ id: 1 }, { id: 2 }]);
      collection.push({ id: 3 });
      expect(collection.at(2).id).toBe(3);
    });

    it('should pop model from end', () => {
      collection.add([{ id: 1 }, { id: 2 }, { id: 3 }]);
      const model = collection.pop();
      expect(model.id).toBe(3);
      expect(collection.length).toBe(2);
    });

    it('should unshift model to beginning', () => {
      collection.add([{ id: 2 }, { id: 3 }]);
      collection.unshift({ id: 1 });
      expect(collection.at(0).id).toBe(1);
    });

    it('should shift model from beginning', () => {
      collection.add([{ id: 1 }, { id: 2 }, { id: 3 }]);
      const model = collection.shift();
      expect(model.id).toBe(1);
      expect(collection.length).toBe(2);
    });
  });

  describe('get, has, at', () => {
    beforeEach(() => {
      collection.add([
        { id: 1, name: 'a' },
        { id: 2, name: 'b' },
        { id: 3, name: 'c' }
      ]);
    });

    it('should get model by id', () => {
      const model = collection.get(2);
      expect(model.get('name')).toBe('b');
    });

    it('should get model by cid', () => {
      const model = collection.at(0);
      expect(collection.get(model.cid)).toBe(model);
    });

    it('should return undefined for missing model', () => {
      expect(collection.get(999)).toBeUndefined();
    });

    it('should check if has model', () => {
      expect(collection.has(2)).toBe(true);
      expect(collection.has(999)).toBe(false);
    });

    it('should get model at index', () => {
      expect(collection.at(1).id).toBe(2);
    });

    it('should support negative indices', () => {
      expect(collection.at(-1).id).toBe(3);
      expect(collection.at(-2).id).toBe(2);
    });
  });

  describe('slice', () => {
    beforeEach(() => {
      collection.add([{ id: 1 }, { id: 2 }, { id: 3 }, { id: 4 }]);
    });

    it('should slice models', () => {
      const slice = collection.slice(1, 3);
      expect(slice.length).toBe(2);
      expect(slice[0].id).toBe(2);
      expect(slice[1].id).toBe(3);
    });

    it('should slice without end', () => {
      const slice = collection.slice(2);
      expect(slice.length).toBe(2);
      expect(slice[0].id).toBe(3);
    });
  });

  describe('where and findWhere', () => {
    beforeEach(() => {
      collection.add([
        { id: 1, name: 'Alice', age: 25 },
        { id: 2, name: 'Bob', age: 30 },
        { id: 3, name: 'Charlie', age: 25 }
      ]);
    });

    it('should find all matching models', () => {
      const results = collection.where({ age: 25 });
      expect(results.length).toBe(2);
      expect(results[0].get('name')).toBe('Alice');
    });

    it('should find first matching model', () => {
      const result = collection.findWhere({ age: 25 });
      expect(result.get('name')).toBe('Alice');
    });

    it('should return empty array if no matches', () => {
      const results = collection.where({ age: 999 });
      expect(results).toEqual([]);
    });
  });

  describe('sort', () => {
    it('should sort by attribute name', () => {
      const col = new Collection(
        [{ id: 3, name: 'c' }, { id: 1, name: 'a' }, { id: 2, name: 'b' }],
        { comparator: 'name' }
      );
      expect(col.at(0).get('name')).toBe('a');
      expect(col.at(2).get('name')).toBe('c');
    });

    it('should sort by comparator function', () => {
      const col = new Collection(
        [{ value: 3 }, { value: 1 }, { value: 2 }],
        { comparator: (a, b) => a.get('value') - b.get('value') }
      );
      expect(col.at(0).get('value')).toBe(1);
    });

    it('should trigger sort event', () => {
      const spy = vi.fn();
      const col = new Collection([{ id: 2 }, { id: 1 }], { comparator: 'id' });
      col.on('sort', spy);
      col.sort();
      expect(spy).toHaveBeenCalled();
    });

    it('should throw if no comparator', () => {
      expect(() => collection.sort()).toThrow('Cannot sort a set without a comparator');
    });
  });

  describe('pluck', () => {
    it('should pluck attribute values', () => {
      collection.add([
        { id: 1, name: 'Alice' },
        { id: 2, name: 'Bob' },
        { id: 3, name: 'Charlie' }
      ]);
      const names = collection.pluck('name');
      expect(names).toEqual(['Alice', 'Bob', 'Charlie']);
    });
  });

  describe('toJSON', () => {
    it('should return array of model JSON', () => {
      collection.add([
        { id: 1, name: 'Alice' },
        { id: 2, name: 'Bob' }
      ]);
      const json = collection.toJSON();
      expect(json).toEqual([
        { id: 1, name: 'Alice' },
        { id: 2, name: 'Bob' }
      ]);
    });
  });

  describe('clone', () => {
    it('should clone collection', () => {
      collection.add([{ id: 1 }, { id: 2 }]);
      const cloned = collection.clone();
      expect(cloned.length).toBe(2);
      expect(cloned).not.toBe(collection);
      expect(cloned.at(0)).toBe(collection.at(0)); // Same model instances
    });
  });

  describe('parse', () => {
    it('should parse response if parse option is true', () => {
      class TestCollection extends Collection {
        parse(resp) {
          return resp.data;
        }
      }
      const col = new TestCollection({ data: [{ id: 1 }, { id: 2 }] }, { parse: true });
      expect(col.length).toBe(2);
    });
  });

  describe('event integration', () => {
    it('should have EventsMixin methods', () => {
      expect(typeof collection.on).toBe('function');
      expect(typeof collection.off).toBe('function');
      expect(typeof collection.trigger).toBe('function');
      expect(typeof collection.listenTo).toBe('function');
    });

    it('should proxy model events', () => {
      const spy = vi.fn();
      collection.add({ id: 1, name: 'test' });
      collection.on('change:name', spy);
      collection.at(0).set('name', 'updated');
      expect(spy).toHaveBeenCalled();
    });

    it('should handle model destroy event', () => {
      const model = new Model({ id: 1 });
      collection.add(model);
      expect(collection.length).toBe(1);
      model.trigger('destroy', model);
      expect(collection.length).toBe(0);
    });
  });

  describe('server sync methods (should throw errors)', () => {
    it('should throw error on sync', () => {
      expect(() => collection.sync()).toThrow('not implemented');
    });

    it('should throw error on fetch', () => {
      expect(() => collection.fetch()).toThrow('not implemented');
    });

    it('should throw error on create', () => {
      expect(() => collection.create()).toThrow('not implemented');
    });
  });

  describe('lodash utility methods', () => {
    beforeEach(() => {
      collection.add([
        { id: 1, name: 'Alice', age: 25 },
        { id: 2, name: 'Bob', age: 30 },
        { id: 3, name: 'Charlie', age: 25 },
        { id: 4, name: 'David', age: 35 }
      ]);
    });

    it('should forEach/each', () => {
      const names = [];
      collection.forEach(model => names.push(model.get('name')));
      expect(names).toEqual(['Alice', 'Bob', 'Charlie', 'David']);
    });

    it('should map', () => {
      const ids = collection.map(model => model.id);
      expect(ids).toEqual([1, 2, 3, 4]);
    });

    it('should map with attribute name', () => {
      const names = collection.map('name');
      expect(names).toEqual(['Alice', 'Bob', 'Charlie', 'David']);
    });

    it('should filter', () => {
      const young = collection.filter(model => model.get('age') < 30);
      expect(young.length).toBe(2);
    });

    it('should filter with attributes', () => {
      const results = collection.filter({ age: 25 });
      expect(results.length).toBe(2);
    });

    it('should find', () => {
      const result = collection.find(model => model.get('age') === 30);
      expect(result.get('name')).toBe('Bob');
    });

    it('should reduce', () => {
      const sum = collection.reduce((memo, model) => memo + model.get('age'), 0);
      expect(sum).toBe(115);
    });

    it('should reject', () => {
      const old = collection.reject(model => model.get('age') < 30);
      expect(old.length).toBe(2);
    });

    it('should every', () => {
      expect(collection.every(model => model.get('age') > 20)).toBe(true);
      expect(collection.every(model => model.get('age') > 30)).toBe(false);
    });

    it('should some', () => {
      expect(collection.some(model => model.get('age') > 30)).toBe(true);
      expect(collection.some(model => model.get('age') > 40)).toBe(false);
    });

    it('should includes', () => {
      const model = collection.at(0);
      expect(collection.includes(model)).toBe(true);
    });

    it('should invoke', () => {
      const results = collection.invoke('get', 'name');
      expect(results).toEqual(['Alice', 'Bob', 'Charlie', 'David']);
    });

    it('should max', () => {
      const oldest = collection.max(model => model.get('age'));
      expect(oldest.get('name')).toBe('David');
    });

    it('should min', () => {
      const youngest = collection.min(model => model.get('age'));
      expect(youngest.get('name')).toBe('Alice');
    });

    it('should sortBy', () => {
      const sorted = collection.sortBy('name');
      expect(sorted[0].get('name')).toBe('Alice');
      expect(sorted[3].get('name')).toBe('David');
    });

    it('should groupBy', () => {
      const grouped = collection.groupBy('age');
      expect(grouped[25].length).toBe(2);
      expect(grouped[30].length).toBe(1);
    });

    it('should countBy', () => {
      const counts = collection.countBy('age');
      expect(counts[25]).toBe(2);
      expect(counts[30]).toBe(1);
      expect(counts[35]).toBe(1);
    });

    it('should partition', () => {
      const [young, old] = collection.partition(model => model.get('age') < 30);
      expect(young.length).toBe(2);
      expect(old.length).toBe(2);
    });

    it('should first', () => {
      expect(collection.first().get('name')).toBe('Alice');
      expect(collection.first(2).length).toBe(2);
    });

    it('should last', () => {
      expect(collection.last().get('name')).toBe('David');
      expect(collection.last(2).length).toBe(2);
    });

    it('should without', () => {
      const model = collection.at(1);
      const result = collection.without(model);
      expect(result.length).toBe(3);
    });

    it('should shuffle', () => {
      const shuffled = collection.shuffle();
      expect(shuffled.length).toBe(4);
      // Can't test randomness reliably, just check length
    });

    it('should isEmpty', () => {
      expect(collection.isEmpty()).toBe(false);
      const empty = new Collection();
      expect(empty.isEmpty()).toBe(true);
    });

    it('should size', () => {
      expect(collection.size()).toBe(4);
    });

    it('should indexOf', () => {
      const model = collection.at(2);
      expect(collection.indexOf(model)).toBe(2);
    });

    it('should sample', () => {
      const sample = collection.sample();
      expect(collection.includes(sample)).toBe(true);
    });

    it('should chain', () => {
      const result = collection.chain()
        .filter(model => model.get('age') >= 25)
        .map(model => model.get('name'))
        .value();
      expect(result).toEqual(['Alice', 'Bob', 'Charlie', 'David']);
    });
  });

  describe('Iterator protocol', () => {
    beforeEach(() => {
      collection.add([{ id: 1 }, { id: 2 }, { id: 3 }]);
    });

    it('should iterate with for...of', () => {
      const ids = [];
      for (const model of collection) {
        ids.push(model.id);
      }
      expect(ids).toEqual([1, 2, 3]);
    });

    it('should have values iterator', () => {
      const values = [...collection.values()];
      expect(values.length).toBe(3);
      expect(values[0].id).toBe(1);
    });

    it('should have keys iterator', () => {
      const keys = [...collection.keys()];
      expect(keys).toEqual([1, 2, 3]);
    });

    it('should have entries iterator', () => {
      const entries = [...collection.entries()];
      expect(entries.length).toBe(3);
      expect(entries[0]).toEqual([1, collection.at(0)]);
    });
  });

  describe('edge cases', () => {
    it('should handle empty add', () => {
      collection.add([]);
      expect(collection.length).toBe(0);
    });

    it('should handle null in set', () => {
      collection.set(null);
      expect(collection.length).toBe(0);
    });

    it('should handle changing model id', () => {
      const model = new Model({ id: 1, name: 'test' });
      collection.add(model);
      expect(collection.get(1)).toBe(model);

      model.set({ id: 2 });
      expect(collection.get(1)).toBeUndefined();
      expect(collection.get(2)).toBe(model);
    });

    it('should maintain collection reference on models', () => {
      const model = collection.add({ id: 1 });
      expect(model.collection).toBe(collection);
    });

    it('should clean up collection reference on remove', () => {
      const model = collection.add({ id: 1 });
      collection.remove(model);
      expect(model.collection).toBeUndefined();
    });
  });
});
