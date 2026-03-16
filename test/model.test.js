/**
 * Model tests - Modern vitest implementation
 * Ported and adapted from original Backbone.Model QUnit tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Model } from '../src/model.js';

describe('Model', () => {
  let doc;

  beforeEach(() => {
    doc = new Model({
      id: '1-the-tempest',
      title: 'The Tempest',
      author: 'Bill Shakespeare',
      length: 123
    });
  });

  describe('constructor and initialization', () => {
    it('should initialize with attributes', () => {
      expect(doc.get('title')).toBe('The Tempest');
      expect(doc.get('author')).toBe('Bill Shakespeare');
      expect(doc.get('length')).toBe(123);
    });

    it('should call initialize hook', () => {
      const initSpy = vi.fn();
      class TestModel extends Model {
        initialize() {
          initSpy();
          this.one = 1;
        }
      }

      const model = new TestModel();
      expect(initSpy).toHaveBeenCalledOnce();
      expect(model.one).toBe(1);
    });

    it('should pass options to initialize', () => {
      class TestModel extends Model {
        initialize(attributes, options) {
          this.one = options?.one;
        }
      }

      const model = new TestModel({}, { one: 1 });
      expect(model.one).toBe(1);
    });

    it('should call preinitialize before setup', () => {
      const calls = [];

      class TestModel extends Model {
        preinitialize() {
          calls.push('preinitialize');
          expect(this.cid).toBeUndefined();
          expect(this.id).toBeUndefined();
        }

        initialize() {
          calls.push('initialize');
          expect(this.cid).toBeDefined();
        }
      }

      const model = new TestModel({ id: 'foo' });
      expect(calls).toEqual(['preinitialize', 'initialize']);
      expect(model.id).toBe('foo');
      expect(model.cid).toBeDefined();
    });

    it('should parse attributes when parse option is true', () => {
      class TestModel extends Model {
        parse(attrs) {
          return { ...attrs, value: attrs.value + 1 };
        }
      }

      const model = new TestModel({ value: 1 }, { parse: true });
      expect(model.get('value')).toBe(2);
    });

    it('should handle parse returning null', () => {
      class TestModel extends Model {
        parse(attrs) {
          return null;
        }
      }

      const model = new TestModel({ value: 1 }, { parse: true });
      expect(JSON.stringify(model.toJSON())).toBe('{}');
    });

    it('should apply defaults', () => {
      class TestModel extends Model {
        defaults() {
          return { title: 'Untitled', published: false };
        }
      }

      const model = new TestModel({ title: 'My Title' });
      expect(model.get('title')).toBe('My Title');
      expect(model.get('published')).toBe(false);
    });

    it('should handle Object.prototype properties as attributes', () => {
      const model = new Model({ hasOwnProperty: true });
      expect(model.get('hasOwnProperty')).toBe(true);
    });
  });

  describe('get, set, and attributes', () => {
    it('should get attributes', () => {
      expect(doc.get('title')).toBe('The Tempest');
      expect(doc.get('author')).toBe('Bill Shakespeare');
    });

    it('should set single attribute', () => {
      doc.set('title', 'Hamlet');
      expect(doc.get('title')).toBe('Hamlet');
    });

    it('should set multiple attributes with object', () => {
      doc.set({ title: 'Othello', author: 'William Shakespeare' });
      expect(doc.get('title')).toBe('Othello');
      expect(doc.get('author')).toBe('William Shakespeare');
    });

    it('should trigger change events on set', () => {
      const changeSpy = vi.fn();
      const changeAttrSpy = vi.fn();

      doc.on('change', changeSpy);
      doc.on('change:title', changeAttrSpy);

      doc.set('title', 'Hamlet');

      expect(changeSpy).toHaveBeenCalledOnce();
      expect(changeAttrSpy).toHaveBeenCalledOnce();
      expect(changeAttrSpy).toHaveBeenCalledWith(doc, 'Hamlet', {});
    });

    it('should not trigger change events with silent option', () => {
      const changeSpy = vi.fn();

      doc.on('change', changeSpy);
      doc.set('title', 'Hamlet', { silent: true });

      expect(changeSpy).not.toHaveBeenCalled();
      expect(doc.get('title')).toBe('Hamlet');
    });

    it('should handle nested change events', () => {
      let callCount = 0;

      doc.on('change', () => {
        callCount++;
        if (callCount === 1) {
          doc.set('author', 'New Author');
        }
      });

      doc.set('title', 'New Title');
      expect(callCount).toBe(2);
    });
  });

  describe('has', () => {
    it('should return true for existing attributes', () => {
      expect(doc.has('title')).toBe(true);
      expect(doc.has('author')).toBe(true);
    });

    it('should return false for null/undefined attributes', () => {
      doc.set('empty', null);
      expect(doc.has('empty')).toBe(false);
      expect(doc.has('nonexistent')).toBe(false);
    });

    it('should return true for falsy but defined values', () => {
      doc.set('zero', 0);
      doc.set('false', false);
      doc.set('emptyString', '');

      expect(doc.has('zero')).toBe(true);
      expect(doc.has('false')).toBe(true);
      expect(doc.has('emptyString')).toBe(true);
    });
  });

  describe('unset and clear', () => {
    it('should unset attributes', () => {
      doc.unset('title');
      expect(doc.has('title')).toBe(false);
      expect(doc.get('title')).toBeUndefined();
    });

    it('should trigger change on unset', () => {
      const changeSpy = vi.fn();
      doc.on('change:title', changeSpy);

      doc.unset('title');
      expect(changeSpy).toHaveBeenCalledOnce();
    });

    it('should clear all attributes', () => {
      doc.clear();
      expect(doc.has('title')).toBe(false);
      expect(doc.has('author')).toBe(false);
      expect(doc.has('length')).toBe(false);
    });

    it('should trigger change on clear', () => {
      const changeSpy = vi.fn();
      doc.on('change', changeSpy);

      doc.clear();
      expect(changeSpy).toHaveBeenCalledOnce();
    });
  });

  describe('escape', () => {
    it('should escape HTML in attributes', () => {
      doc.set('content', '<script>alert("xss")</script>');
      expect(doc.escape('content')).toBe('&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;');
    });

    it('should handle special HTML characters', () => {
      doc.set('text', '< > & " \'');
      const escaped = doc.escape('text');
      expect(escaped).toContain('&lt;');
      expect(escaped).toContain('&gt;');
      expect(escaped).toContain('&amp;');
    });
  });

  describe('matches', () => {
    it('should match when attributes equal', () => {
      expect(doc.matches({ author: 'Bill Shakespeare' })).toBe(true);
    });

    it('should not match when attributes differ', () => {
      expect(doc.matches({ author: 'Charles Dickens' })).toBe(false);
    });

    it('should match multiple attributes', () => {
      expect(doc.matches({
        author: 'Bill Shakespeare',
        title: 'The Tempest'
      })).toBe(true);
    });
  });

  describe('change tracking', () => {
    it('should track changed attributes', () => {
      doc.set('title', 'Hamlet');
      expect(doc.hasChanged('title')).toBe(true);
      expect(doc.hasChanged('author')).toBe(false);
    });

    it('should return changed attributes', () => {
      doc.set({ title: 'Hamlet', author: 'William Shakespeare' });
      const changed = doc.changedAttributes();

      expect(changed).toEqual({
        title: 'Hamlet',
        author: 'William Shakespeare'
      });
    });

    it('should return false when nothing changed', () => {
      doc.trigger('change');
      const changed = doc.changedAttributes();
      expect(changed).toBe(false);
    });

    it('should diff against provided attributes', () => {
      const diff = doc.changedAttributes({
        title: 'Hamlet',
        author: 'Bill Shakespeare'
      });

      expect(diff).toEqual({ title: 'Hamlet' });
    });

    it('should track previous values', () => {
      const oldTitle = doc.get('title');
      doc.set('title', 'Hamlet');

      expect(doc.previous('title')).toBe(oldTitle);
      expect(doc.previous('author')).toBe('Bill Shakespeare');
    });

    it('should return previous attributes', () => {
      const prev = doc.toJSON();
      doc.set({ title: 'Hamlet', author: 'William Shakespeare' });

      const previousAttrs = doc.previousAttributes();
      expect(previousAttrs.title).toBe(prev.title);
      expect(previousAttrs.author).toBe(prev.author);
    });

    it('should track changes between change events', () => {
      doc.set('title', 'Hamlet');
      expect(doc.hasChanged('title')).toBe(true);

      // After triggering change, the changed tracking persists until next set
      doc.trigger('change');
      expect(doc.hasChanged('title')).toBe(true);

      // But setting again resets the tracking
      doc.set('author', 'William Shakespeare');
      expect(doc.hasChanged('author')).toBe(true);
    });
  });

  describe('validation', () => {
    it('should validate on set with validate option', () => {
      class ValidatedModel extends Model {
        validate(attrs) {
          if (!attrs.title) return 'Title is required';
        }
      }

      const model = new ValidatedModel({ title: 'Test' });
      const result = model.set('title', '', { validate: true });

      expect(result).toBe(false);
      expect(model.validationError).toBe('Title is required');
    });

    it('should trigger invalid event on validation failure', () => {
      class ValidatedModel extends Model {
        validate(attrs) {
          if (!attrs.title) return 'Title is required';
        }
      }

      const model = new ValidatedModel({ title: 'Test' });
      const invalidSpy = vi.fn();
      model.on('invalid', invalidSpy);

      model.set('title', '', { validate: true });

      expect(invalidSpy).toHaveBeenCalledOnce();
      expect(invalidSpy).toHaveBeenCalledWith(
        model,
        'Title is required',
        expect.objectContaining({ validationError: 'Title is required' })
      );
    });

    it('should check validity with isValid', () => {
      class ValidatedModel extends Model {
        validate(attrs) {
          if (!attrs.title) return 'Title is required';
        }
      }

      const model = new ValidatedModel({ title: 'Test' });
      expect(model.isValid()).toBe(true);

      model.set('title', '');
      expect(model.isValid()).toBe(false);
    });

    it('should allow set without validation by default', () => {
      class ValidatedModel extends Model {
        validate(attrs) {
          if (!attrs.title) return 'Title is required';
        }
      }

      const model = new ValidatedModel({ title: 'Test' });
      model.set('title', '');

      expect(model.get('title')).toBe('');
    });
  });

  describe('toJSON and clone', () => {
    it('should return copy of attributes with toJSON', () => {
      const json = doc.toJSON();
      expect(json).toEqual({
        id: '1-the-tempest',
        title: 'The Tempest',
        author: 'Bill Shakespeare',
        length: 123
      });

      // Verify it's a copy
      json.title = 'Changed';
      expect(doc.get('title')).toBe('The Tempest');
    });

    it('should clone model', () => {
      const clone = doc.clone();

      expect(clone).toBeInstanceOf(Model);
      expect(clone.get('title')).toBe(doc.get('title'));
      expect(clone.get('author')).toBe(doc.get('author'));
      expect(clone).not.toBe(doc);

      // Verify independence
      clone.set('title', 'Changed');
      expect(doc.get('title')).toBe('The Tempest');
    });
  });

  describe('id and isNew', () => {
    it('should track id from idAttribute', () => {
      expect(doc.id).toBe('1-the-tempest');
    });

    it('should update id when idAttribute changes', () => {
      doc.set('id', '2-hamlet');
      expect(doc.id).toBe('2-hamlet');
    });

    it('should trigger changeId event when id changes', () => {
      const changeIdSpy = vi.fn();
      doc.on('changeId', changeIdSpy);

      const oldId = doc.id;
      doc.set('id', '2-hamlet');

      expect(changeIdSpy).toHaveBeenCalledWith(doc, oldId, {});
    });

    it('should recognize model as new when no id', () => {
      const model = new Model({ title: 'Test' });
      expect(model.isNew()).toBe(true);
    });

    it('should recognize model as not new when id exists', () => {
      expect(doc.isNew()).toBe(false);

      const model = new Model({ id: 0 });
      expect(model.isNew()).toBe(false);

      const negativeId = new Model({ id: -5 });
      expect(negativeId.isNew()).toBe(false);
    });

    it('should support custom idAttribute', () => {
      class CustomModel extends Model {}
      CustomModel.prototype.idAttribute = '_id';

      const model = new CustomModel({ _id: 'abc123' });
      expect(model.id).toBe('abc123');
      expect(model.isNew()).toBe(false);
    });
  });

  describe('cid (client id)', () => {
    it('should generate unique cid', () => {
      const model1 = new Model();
      const model2 = new Model();

      expect(model1.cid).toBeDefined();
      expect(model2.cid).toBeDefined();
      expect(model1.cid).not.toBe(model2.cid);
    });

    it('should use cidPrefix', () => {
      const model = new Model();
      expect(model.cid).toMatch(/^c\d+$/);
    });

    it('should support custom cidPrefix', () => {
      class CustomModel extends Model {}
      CustomModel.prototype.cidPrefix = 'custom';

      const model = new CustomModel();
      expect(model.cid).toMatch(/^custom\d+$/);
    });
  });

  describe('url generation', () => {
    it('should generate url with urlRoot', () => {
      class BookModel extends Model {
        urlRoot = '/books';
      }

      const model = new BookModel();
      expect(model.url()).toBe('/books');

      model.set({ id: 1 });
      expect(model.url()).toBe('/books/1');
    });

    it('should encode id in url', () => {
      class BookModel extends Model {
        urlRoot = '/books';
      }

      const model = new BookModel({ id: '+1+' });
      expect(model.url()).toBe('/books/%2B1%2B');
    });

    it('should support urlRoot as function', () => {
      class NestedModel extends Model {
        urlRoot() {
          return `/nested/${this.get('parentId')}/items`;
        }
      }

      const model = new NestedModel({ parentId: 5 });
      expect(model.url()).toBe('/nested/5/items');

      model.set({ id: 10 });
      expect(model.url()).toBe('/nested/5/items/10');
    });

    it('should throw error if no url defined', () => {
      const model = new Model();
      expect(() => model.url()).toThrow('A "url" property or function must be specified');
    });
  });

  describe('event integration', () => {
    it('should have EventsMixin methods', () => {
      expect(typeof doc.on).toBe('function');
      expect(typeof doc.off).toBe('function');
      expect(typeof doc.trigger).toBe('function');
      expect(typeof doc.listenTo).toBe('function');
      expect(typeof doc.stopListening).toBe('function');
    });

    it('should trigger and listen to events', () => {
      const spy = vi.fn();
      doc.on('custom', spy);
      doc.trigger('custom', 'data');

      expect(spy).toHaveBeenCalledWith('data');
    });

    it('should support cross-object listening', () => {
      const other = new Model();
      const spy = vi.fn();

      doc.listenTo(other, 'change', spy);
      other.set('test', 'value');

      expect(spy).toHaveBeenCalledOnce();
    });
  });

  describe('server sync methods', () => {
    it('should have a sync method', () => {
      expect(typeof doc.sync).toBe('function');
    });

    it('should have a save method', () => {
      expect(typeof doc.save).toBe('function');
    });

    it('should have a fetch method', () => {
      expect(typeof doc.fetch).toBe('function');
    });

    it('should have a destroy method', () => {
      expect(typeof doc.destroy).toBe('function');
    });
  });

  describe('edge cases', () => {
    it('should handle setting null key', () => {
      const result = doc.set(null);
      expect(result).toBe(doc);
    });

    it('should handle multiple rapid changes', () => {
      let changeCount = 0;
      doc.on('change', () => changeCount++);

      doc.set('title', 'A');
      doc.set('title', 'B');
      doc.set('title', 'C');

      expect(changeCount).toBe(3);
      expect(doc.get('title')).toBe('C');
    });

    it('should handle setting same value', () => {
      const spy = vi.fn();
      doc.on('change:title', spy);

      doc.set('title', 'The Tempest');
      expect(spy).not.toHaveBeenCalled();
    });

    it('should shallow clone objects in toJSON', () => {
      const nested = { a: 1, b: 2 };
      const model = new Model({ nested });

      const json = model.toJSON();

      // toJSON does shallow clone (matches original Backbone behavior)
      expect(json.nested).toBe(nested); // Same reference

      // But modifying top-level doesn't affect model
      json.title = 'new';
      expect(model.has('title')).toBe(false);
    });

    it('should handle empty attributes', () => {
      const model = new Model();
      expect(model.toJSON()).toEqual({});
      expect(model.isNew()).toBe(true);
    });
  });

  describe('underscore/lodash utility methods', () => {
    it('should return keys of attributes', () => {
      const model = new Model({ name: 'Jane', age: 28, city: 'SF' });
      const result = model.keys();

      expect(result).toEqual(expect.arrayContaining(['name', 'age', 'city']));
      expect(result.length).toBe(3);
    });

    it('should return values of attributes', () => {
      const model = new Model({ name: 'Jane', age: 28, city: 'SF' });
      const result = model.values();

      expect(result).toEqual(expect.arrayContaining(['Jane', 28, 'SF']));
      expect(result.length).toBe(3);
    });

    it('should return pairs of attributes', () => {
      const model = new Model({ name: 'Jane', age: 28 });
      const result = model.pairs();

      expect(result).toEqual(expect.arrayContaining([
        ['name', 'Jane'],
        ['age', 28]
      ]));
      expect(result.length).toBe(2);
    });

    it('should invert attributes', () => {
      const model = new Model({ first: 'Jane', last: 'Doe' });
      const result = model.invert();

      expect(result).toEqual({ Jane: 'first', Doe: 'last' });
    });

    it('should pick specific attributes', () => {
      const model = new Model({ name: 'Jane', age: 28, city: 'SF', country: 'USA' });
      const result = model.pick('name', 'age');

      expect(result).toEqual({ name: 'Jane', age: 28 });
    });

    it('should pick with array of keys', () => {
      const model = new Model({ name: 'Jane', age: 28, city: 'SF' });
      const result = model.pick(['name', 'city']);

      expect(result).toEqual({ name: 'Jane', city: 'SF' });
    });

    it('should omit specific attributes', () => {
      const model = new Model({ name: 'Jane', age: 28, city: 'SF' });
      const result = model.omit('age');

      expect(result).toEqual({ name: 'Jane', city: 'SF' });
    });

    it('should omit multiple attributes', () => {
      const model = new Model({ name: 'Jane', age: 28, city: 'SF', country: 'USA' });
      const result = model.omit('age', 'country');

      expect(result).toEqual({ name: 'Jane', city: 'SF' });
    });

    it('should support chaining operations', () => {
      const model = new Model({ a: 1, b: 2, c: 3, d: 4 });
      const result = model.chain()
        .pick('a', 'b', 'c')
        .invert()
        .value();

      expect(result).toEqual({ '1': 'a', '2': 'b', '3': 'c' });
    });

    it('should check if attributes are empty', () => {
      const model1 = new Model();
      const model2 = new Model({ name: 'Jane' });

      expect(model1.isEmpty()).toBe(true);
      expect(model2.isEmpty()).toBe(false);

      model2.clear();
      expect(model2.isEmpty()).toBe(true);
    });

    it('should return empty arrays for empty model', () => {
      const model = new Model();

      expect(model.keys()).toEqual([]);
      expect(model.values()).toEqual([]);
      expect(model.pairs()).toEqual([]);
    });
  });
});
