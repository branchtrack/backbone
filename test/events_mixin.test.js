/**
 * EventsMixin tests - Modern vitest implementation
 * Ported from original Backbone.Events QUnit tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { EventsMixin } from '../src/mixins/events.js';
import { size } from 'lodash-es';

/**
 * Helper to create an object with EventsMixin
 */
function createEvented(props = {}) {
  return { ...props, ...EventsMixin };
}

describe('EventsMixin', () => {
  describe('on and trigger', () => {
    it('should bind and trigger events', () => {
      const obj = createEvented({ counter: 0 });
      obj.on('event', function() { this.counter += 1; });
      obj.trigger('event');
      expect(obj.counter).toBe(1);

      obj.trigger('event');
      obj.trigger('event');
      obj.trigger('event');
      obj.trigger('event');
      expect(obj.counter).toBe(5);
    });

    it('should bind and trigger multiple events', () => {
      const obj = createEvented({ counter: 0 });
      obj.on('a b c', function() { this.counter += 1; });

      obj.trigger('a');
      expect(obj.counter).toBe(1);

      obj.trigger('a b');
      expect(obj.counter).toBe(3);

      obj.trigger('c');
      expect(obj.counter).toBe(4);

      obj.off('a c');
      obj.trigger('a b c');
      expect(obj.counter).toBe(5);
    });

    it('should bind and trigger with event maps', () => {
      const obj = createEvented({ counter: 0 });
      const increment = function() {
        this.counter += 1;
      };

      obj.on({
        a: increment,
        b: increment,
        c: increment
      }, obj);

      obj.trigger('a');
      expect(obj.counter).toBe(1);

      obj.trigger('a b');
      expect(obj.counter).toBe(3);

      obj.trigger('c');
      expect(obj.counter).toBe(4);

      obj.off({
        a: increment,
        c: increment
      }, obj);
      obj.trigger('a b c');
      expect(obj.counter).toBe(5);
    });

    it('should bind and trigger multiple event names with event maps', () => {
      const obj = createEvented({ counter: 0 });
      const increment = function() {
        this.counter += 1;
      };

      obj.on({
        'a b c': increment
      });

      obj.trigger('a');
      expect(obj.counter).toBe(1);

      obj.trigger('a b');
      expect(obj.counter).toBe(3);

      obj.trigger('c');
      expect(obj.counter).toBe(4);

      obj.off({
        'a c': increment
      });
      obj.trigger('a b c');
      expect(obj.counter).toBe(5);
    });

    it('should handle context with event maps', () => {
      const obj = createEvented({ counter: 0 });
      const context = {};
      let callCount = 0;

      obj.on({
        a: function() {
          expect(this).toBe(context);
          callCount++;
        }
      }, context).trigger('a');

      expect(callCount).toBe(1);

      obj.off().on({
        a: function() {
          expect(this).toBe(context);
          callCount++;
        }
      }, obj, context).trigger('a');

      expect(callCount).toBe(2);
    });
  });

  describe('listenTo and stopListening', () => {
    it('should listen to and stop listening', () => {
      const a = createEvented();
      const b = createEvented();
      let count = 0;

      a.listenTo(b, 'all', function() { count++; });
      b.trigger('anything');
      expect(count).toBe(1);

      a.listenTo(b, 'all', function() { count += 100; }); // shouldn't fire
      a.stopListening();
      b.trigger('anything');
      expect(count).toBe(1);
    });

    it('should listen to and stop listening with event maps', () => {
      const a = createEvented();
      const b = createEvented();
      let count = 0;
      const cb = function() { count++; };

      a.listenTo(b, { event: cb });
      b.trigger('event');
      expect(count).toBe(1);

      a.listenTo(b, { event2: cb });
      b.on('event2', cb);
      a.stopListening(b, { event2: cb });
      b.trigger('event event2');
      expect(count).toBe(3); // event fires once, event2 fires once (from direct b.on())

      a.stopListening();
      b.trigger('event event2');
      expect(count).toBe(4); // only event2 via b.on()
    });

    it('should handle stopListening with omitted args', () => {
      const a = createEvented();
      const b = createEvented();
      let count = 0;
      const cb = function() { count++; };

      a.listenTo(b, 'event', cb);
      b.on('event', cb);
      a.listenTo(b, 'event2', cb);
      a.stopListening(null, { event: cb });
      b.trigger('event event2');
      expect(count).toBe(2); // both fire: event (via b.on) and event2 (via listenTo - stopListening with object doesn't stop it)

      b.off();
      count = 0;
      a.listenTo(b, 'event event2', cb);
      a.stopListening(null, 'event');
      a.stopListening();
      b.trigger('event2');
      expect(count).toBe(0);
    });

    it('should listen to itself', () => {
      const e = createEvented();
      let count = 0;
      e.listenTo(e, 'foo', function() { count++; });
      e.trigger('foo');
      expect(count).toBe(1);
    });

    it('should clean up when listening to itself with stopListening', () => {
      const e = createEvented();
      let count = 0;
      e.listenTo(e, 'foo', function() { count++; });
      e.trigger('foo');
      expect(count).toBe(1);
      e.stopListening();
      e.trigger('foo');
      expect(count).toBe(1);
    });

    it('should not throw with empty callback', () => {
      const e = createEvented();
      expect(() => {
        e.listenTo(e, 'foo', null);
        e.trigger('foo');
      }).not.toThrow();
    });
  });

  describe('listenToOnce', () => {
    it('should fire only once', () => {
      const obj = createEvented({ counterA: 0, counterB: 0 });
      const incrA = function() { this.counterA += 1; this.trigger('event'); };
      const incrB = function() { this.counterB += 1; };

      obj.listenToOnce(obj, 'event', incrA);
      obj.listenToOnce(obj, 'event', incrB);
      obj.trigger('event');

      expect(obj.counterA).toBe(1);
      expect(obj.counterB).toBe(1);
    });

    it('should work with stopListening', () => {
      const a = createEvented();
      const b = createEvented();
      let count = 0;

      a.listenToOnce(b, 'all', function() { count++; });
      b.trigger('anything');
      expect(count).toBe(1);

      b.trigger('anything');
      expect(count).toBe(1);

      a.listenToOnce(b, 'all', function() { count += 100; });
      a.stopListening();
      b.trigger('anything');
      expect(count).toBe(1);
    });

    it('should work combined with listenTo and stopListening', () => {
      const a = createEvented();
      const b = createEvented();
      let count = 0;

      a.listenToOnce(b, 'all', function() { count++; });
      b.trigger('anything');
      expect(count).toBe(1);

      b.trigger('anything');
      expect(count).toBe(1);

      a.listenTo(b, 'all', function() { count += 100; });
      a.stopListening();
      b.trigger('anything');
      expect(count).toBe(1);
    });

    it('should work with event maps and clean up references', () => {
      const a = createEvented();
      const b = createEvented();
      let count = 0;

      a.listenToOnce(b, { change: function() { count++; } });
      b.trigger('change');
      expect(count).toBe(1);

      a.listenToOnce(b, { change: function() { count += 100; } });
      a.stopListening();
      b.trigger('change');
      expect(count).toBe(1);
    });

    it('should bind correct context with event maps', () => {
      const a = createEvented();
      const b = createEvented();
      let correctContext = false;

      a.listenToOnce(b, {
        one: function() { correctContext = (this === a); }
      });
      b.trigger('one');
      expect(correctContext).toBe(true);
    });

    it('should work with space-separated events', () => {
      const one = createEvented();
      const two = createEvented();
      let count = 1;
      const values = [];

      one.listenToOnce(two, 'x y', function(n) { values.push(n); });
      two.trigger('x', 1);
      two.trigger('x', 1);
      two.trigger('y', 2);
      two.trigger('y', 2);

      expect(values).toEqual([1, 2]);
    });
  });

  describe('off', () => {
    it('should unbind all functions', () => {
      const obj = createEvented({ counter: 0 });
      const callback = function() { this.counter += 1; };

      obj.on('event', callback);
      obj.trigger('event');
      expect(obj.counter).toBe(1);

      obj.off('event');
      obj.trigger('event');
      expect(obj.counter).toBe(1);
    });

    it('should unbind only one of two callbacks', () => {
      const obj = createEvented({ counterA: 0, counterB: 0 });
      const callback = function() { this.counterA += 1; };

      obj.on('event', callback);
      obj.on('event', function() { this.counterB += 1; });
      obj.trigger('event');
      expect(obj.counterA).toBe(1);
      expect(obj.counterB).toBe(1);

      obj.off('event', callback);
      obj.trigger('event');
      expect(obj.counterA).toBe(1);
      expect(obj.counterB).toBe(2);
    });

    it('should unbind a callback in the midst of it firing', () => {
      const obj = createEvented({ counter: 0 });
      const callback = function() {
        this.counter += 1;
        this.off('event', callback);
      };

      obj.on('event', callback);
      obj.trigger('event');
      obj.trigger('event');
      obj.trigger('event');
      expect(obj.counter).toBe(1);
    });

    it('should handle two binds that unbind themselves', () => {
      const obj = createEvented({ counterA: 0, counterB: 0 });
      const incrA = function() { this.counterA += 1; this.off('event', incrA); };
      const incrB = function() { this.counterB += 1; this.off('event', incrB); };

      obj.on('event', incrA);
      obj.on('event', incrB);
      obj.trigger('event');
      obj.trigger('event');
      obj.trigger('event');

      expect(obj.counterA).toBe(1);
      expect(obj.counterB).toBe(1);
    });

    it('should remove all events for a specific context', () => {
      const obj = createEvented();
      let goodCount = 0;
      let badCount = 0;

      obj.on('x y all', function() { goodCount++; });
      obj.on('x y all', function() { badCount++; }, obj);
      obj.off(null, null, obj);
      obj.trigger('x y');

      expect(goodCount).toBe(4); // x, y, all(x), all(y)
      expect(badCount).toBe(0);
    });

    it('should remove all events for a specific callback', () => {
      const obj = createEvented();
      let goodCount = 0;
      let badCount = 0;
      const success = function() { goodCount++; };
      const fail = function() { badCount++; };

      obj.on('x y all', success);
      obj.on('x y all', fail);
      obj.off(null, fail);
      obj.trigger('x y');

      expect(goodCount).toBe(4); // x, y, all(x), all(y)
      expect(badCount).toBe(0);
    });

    it('should not skip consecutive events (#1310)', () => {
      const obj = createEvented();
      let count = 0;

      obj.on('event', function() { count++; }, obj);
      obj.on('event', function() { count++; }, obj);
      obj.off(null, null, obj);
      obj.trigger('event');

      expect(count).toBe(0);
    });
  });

  describe('once', () => {
    it('should fire only once', () => {
      const obj = createEvented({ counterA: 0, counterB: 0 });
      const incrA = function() { this.counterA += 1; this.trigger('event'); };
      const incrB = function() { this.counterB += 1; };

      obj.once('event', incrA);
      obj.once('event', incrB);
      obj.trigger('event');

      expect(obj.counterA).toBe(1);
      expect(obj.counterB).toBe(1);
    });

    it('should work with on (variant one)', () => {
      let count = 0;
      const f = function() { count++; };

      const a = createEvented();
      a.once('event', f);
      const b = createEvented();
      b.on('event', f);

      a.trigger('event');
      expect(count).toBe(1);

      b.trigger('event');
      b.trigger('event');
      expect(count).toBe(3);
    });

    it('should work with on (variant two)', () => {
      let count = 0;
      const f = function() { count++; };
      const obj = createEvented();

      obj
        .once('event', f)
        .on('event', f)
        .trigger('event')
        .trigger('event');

      expect(count).toBe(3);
    });

    it('should work with off', () => {
      let count = 0;
      const f = function() { count++; };
      const obj = createEvented();

      obj.once('event', f);
      obj.off('event', f);
      obj.trigger('event');

      expect(count).toBe(0);
    });

    it('should work with event maps', () => {
      const obj = createEvented({ counter: 0 });
      const increment = function() {
        this.counter += 1;
      };

      obj.once({
        a: increment,
        b: increment,
        c: increment
      }, obj);

      obj.trigger('a');
      expect(obj.counter).toBe(1);

      obj.trigger('a b');
      expect(obj.counter).toBe(2);

      obj.trigger('c');
      expect(obj.counter).toBe(3);

      obj.trigger('a b c');
      expect(obj.counter).toBe(3);
    });

    it('should bind context with object notation', () => {
      const obj = createEvented({ counter: 0 });
      const context = {};
      let correctContext = false;

      obj.once({
        a: function() {
          correctContext = (this === context);
        }
      }, context).trigger('a');

      expect(correctContext).toBe(true);
    });

    it('should work with off only by context', () => {
      const context = {};
      const obj = createEvented();
      let count = 0;

      obj.once('event', function() { count++; }, context);
      obj.off(null, null, context);
      obj.trigger('event');

      expect(count).toBe(0);
    });

    it('should work with multiple events', () => {
      const obj = createEvented();
      let count = 0;

      obj.once('x y', function() { count++; });
      obj.trigger('x y');

      expect(count).toBe(2);
    });

    it('should handle off during iteration', () => {
      const obj = createEvented();
      let count = 0;
      const f = function() { this.off('event', f); };

      obj.on('event', f);
      obj.once('event', function() {});
      obj.on('event', function() { count++; });

      obj.trigger('event');
      obj.trigger('event');

      expect(count).toBe(2);
    });

    it('should work without a callback', () => {
      const obj = createEvented();
      expect(() => {
        obj.once('event').trigger('event');
      }).not.toThrow();
    });
  });

  describe('"all" event', () => {
    it('should trigger all for each event', () => {
      const obj = createEvented({ counter: 0 });
      let sawA = false;
      let sawB = false;

      obj.on('all', function(event) {
        this.counter++;
        if (event === 'a') sawA = true;
        if (event === 'b') sawB = true;
      }).trigger('a b');

      expect(sawA).toBe(true);
      expect(sawB).toBe(true);
      expect(obj.counter).toBe(2);
    });

    it('should handle #1282 - "all" callback list is retrieved after each event', () => {
      let counter = 0;
      const obj = createEvented();
      const incr = function() { counter++; };

      obj.on('x', function() {
        obj.on('y', incr).on('all', incr);
      }).trigger('x y');

      expect(counter).toBe(2);
    });
  });

  describe('edge cases', () => {
    it('should handle nested trigger with unbind', () => {
      const obj = createEvented({ counter: 0 });
      const incr1 = function() {
        this.counter += 1;
        this.off('event', incr1);
        this.trigger('event');
      };
      const incr2 = function() { this.counter += 1; };

      obj.on('event', incr1);
      obj.on('event', incr2);
      obj.trigger('event');

      expect(obj.counter).toBe(3);
    });

    it('should not alter callback list during trigger', () => {
      let counter = 0;
      const obj = createEvented();
      const incr = function() { counter++; };
      const incrOn = function() { obj.on('event all', incr); };
      const incrOff = function() { obj.off('event all', incr); };

      obj.on('event all', incrOn).trigger('event');
      expect(counter).toBe(0);

      obj.off().on('event', incrOff).on('event all', incr).trigger('event');
      expect(counter).toBe(2);
    });

    it('should be a noop if no callback is provided to on', () => {
      const obj = createEvented();
      expect(() => {
        obj.on('test').trigger('test');
      }).not.toThrow();
    });

    it('should throw if callback is truthy but not a function', () => {
      const obj = createEvented();
      obj.on('test', 'noop');
      expect(() => {
        obj.trigger('test');
      }).toThrow();
    });

    it('should bind with default context when none supplied', () => {
      const obj = createEvented({
        assertTrue: function() {
          expect(this).toBe(obj);
        }
      });

      obj.once('event', obj.assertTrue);
      obj.trigger('event');
    });

    it('should bind with supplied context', () => {
      class TestClass {
        assertTrue() {
          expect(this).toBeInstanceOf(TestClass);
        }
      }

      const obj = createEvented();
      obj.on('event', function() { this.assertTrue(); }, new TestClass());
      obj.trigger('event');
    });
  });

  describe('memory management', () => {
    it('should clean up references with stopListening', () => {
      const a = createEvented();
      const b = createEvented();
      const fn = function() {};

      b.on('event', fn);
      a.listenTo(b, 'event', fn).stopListening();
      // Note: We can't directly check _listeningTo with WeakMap,
      // but we can verify behavior is correct

      let count = 0;
      a.listenTo(b, 'event', function() { count++; });
      a.stopListening(b);
      b.trigger('event');
      expect(count).toBe(0);
    });

    it('should clean up references from listenToOnce', () => {
      const a = createEvented();
      const b = createEvented();
      const fn = function() {};

      b.on('event', fn);
      a.listenToOnce(b, 'event', fn).stopListening();

      let count = 0;
      a.listenToOnce(b, 'event', function() { count++; });
      a.stopListening(b);
      b.trigger('event');
      expect(count).toBe(0);
    });

    it('should clean up with listenTo and off', () => {
      const a = createEvented();
      const b = createEvented();
      let count = 0;
      const fn = function() { count++; };

      a.listenTo(b, 'event', fn);
      b.off();
      b.trigger('event');
      expect(count).toBe(0);

      a.listenTo(b, 'event', fn);
      b.off('event');
      b.trigger('event');
      expect(count).toBe(0);

      a.listenTo(b, 'event', fn);
      b.off(null, fn);
      b.trigger('event');
      expect(count).toBe(0);

      a.listenTo(b, 'event', fn);
      b.off(null, null, a);
      b.trigger('event');
      expect(count).toBe(0);
    });

    it('should clean up listenToOnce without context after event fires', () => {
      const a = createEvented();
      const b = createEvented();
      let count = 0;

      a.listenToOnce(b, 'all', function() { count++; });
      b.trigger('anything');
      expect(count).toBe(1);

      // Memory should be cleaned up (behavior verification)
      b.trigger('anything');
      expect(count).toBe(1);
    });

    it('should clean up listenToOnce with event maps', () => {
      const a = createEvented();
      const b = createEvented();
      let count = 0;

      a.listenToOnce(b, {
        one: function() { count++; },
        two: function() { count += 10; }
      });
      b.trigger('one');
      expect(count).toBe(1);

      // Second event should still be active
      b.trigger('two');
      expect(count).toBe(11);
    });
  });

  describe('chaining', () => {
    it('should support method chaining', () => {
      const obj = createEvented();
      const obj2 = createEvented();
      const fn = function() {};

      expect(obj.trigger('noeventssetyet')).toBe(obj);
      expect(obj.off('noeventssetyet')).toBe(obj);
      expect(obj.stopListening('noeventssetyet')).toBe(obj);
      expect(obj.on('a', fn)).toBe(obj);
      expect(obj.once('c', fn)).toBe(obj);
      expect(obj.trigger('a')).toBe(obj);
      expect(obj.listenTo(obj2, 'a', fn)).toBe(obj);
      expect(obj.listenToOnce(obj2, 'b', fn)).toBe(obj);
      expect(obj.off('a c')).toBe(obj);
      expect(obj.stopListening(obj2, 'a')).toBe(obj);
      expect(obj.stopListening()).toBe(obj);
    });
  });

  describe('interop with non-EventsMixin objects', () => {
    it('should work with non-EventsMixin event libraries (listenTo)', () => {
      const obj = createEvented();
      const other = {
        events: {},
        on: function(name, callback) {
          this.events[name] = callback;
        },
        trigger: function(name) {
          this.events[name]();
        }
      };

      let count = 0;
      obj.listenTo(other, 'test', function() { count++; });
      other.trigger('test');
      expect(count).toBe(1);
    });

    it('should work with non-EventsMixin event libraries (stopListening)', () => {
      const obj = createEvented();
      const other = {
        events: {},
        on: function(name, callback) {
          this.events[name] = callback;
        },
        off: function() {
          this.events = {};
        },
        trigger: function(name) {
          const fn = this.events[name];
          if (fn) fn();
        }
      };

      let count = 0;
      obj.listenTo(other, 'test', function() { count++; });
      obj.stopListening(other);
      other.trigger('test');
      expect(count).toBe(0);
    });
  });
});
