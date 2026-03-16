/**
 * EventsMixin - Modern ES6 event system for Backbone
 *
 * Provides pub/sub and event binding capabilities that can be mixed into any class.
 * Supports event maps, space-separated events, and cross-object event listening.
 *
 * @module EventsMixin
 */

import { keys, once, uniqueId, isEmpty } from 'lodash-es';

// WeakMaps for private data storage (prevents memory leaks)
const eventsStorage = new WeakMap();
const listenersStorage = new WeakMap();
const listeningToStorage = new WeakMap();
const listenIdStorage = new WeakMap();

// Regular expression used to split event strings
const eventSplitter = /\s+/;

// Shared variable for current listening context (used during listenTo setup)
let _listening;

/**
 * The Listening class tracks and cleans up memory bindings
 * when all callbacks have been removed.
 *
 * @private
 */
class Listening {
  constructor(listener, obj) {
    this.id = getListenId(listener);
    this.listener = listener;
    this.obj = obj;
    this.interop = true;
    this.count = 0;
    this._events = undefined;
  }

  /**
   * Add event binding to this listening relationship
   */
  on(name, callback, context) {
    return EventsMixin.on.call(this, name, callback, context);
  }

  /**
   * Remove callback (or several).
   * Uses an optimized counter if the listenee uses EventsMixin.
   * Otherwise, falls back to manual tracking to support events library interop.
   */
  off(name, callback) {
    let cleanup;
    if (this.interop) {
      this._events = eventsApi(offApi, this._events, name, callback, {
        context: undefined,
        listeners: undefined
      });
      cleanup = !this._events;
    } else {
      this.count--;
      cleanup = this.count === 0;
    }
    if (cleanup) this.cleanup();
  }

  /**
   * Clean up memory bindings between the listener and the listenee
   */
  cleanup() {
    const listeningTo = getListeningTo(this.listener);
    const objListenId = getListenId(this.obj);

    if (listeningTo && objListenId) {
      delete listeningTo[objListenId];
    }

    if (!this.interop) {
      const listeners = getListeners(this.obj);
      if (listeners) {
        delete listeners[this.id];
      }
    }
  }
}

/**
 * Helper functions to access private storage
 * @private
 */
function getEvents(obj) {
  return eventsStorage.get(obj);
}

function setEvents(obj, events) {
  eventsStorage.set(obj, events);
}

function getListeners(obj) {
  return listenersStorage.get(obj);
}

function setListeners(obj, listeners) {
  listenersStorage.set(obj, listeners);
}

function getListeningTo(obj) {
  return listeningToStorage.get(obj);
}

function setListeningTo(obj, listeningTo) {
  listeningToStorage.set(obj, listeningTo);
}

function getListenId(obj) {
  return listenIdStorage.get(obj);
}

function ensureListenId(obj) {
  let id = listenIdStorage.get(obj);
  if (!id) {
    id = uniqueId('l');
    listenIdStorage.set(obj, id);
  }
  return id;
}

/**
 * Iterates over the standard `event, callback` (as well as the fancy multiple
 * space-separated events `"change blur", callback` and event maps `{event: callback}`).
 *
 * @private
 */
function eventsApi(iteratee, events, name, callback, opts) {
  let i = 0;
  let names;

  if (name && typeof name === 'object') {
    // Handle event maps: {event1: callback1, event2: callback2}
    if (callback !== undefined && 'context' in opts && opts.context === undefined) {
      opts.context = callback;
    }
    names = keys(name);
    for (; i < names.length; i++) {
      events = eventsApi(iteratee, events, names[i], name[names[i]], opts);
    }
  } else if (name && eventSplitter.test(name)) {
    // Handle space-separated event names
    names = name.split(eventSplitter);
    for (; i < names.length; i++) {
      events = iteratee(events, names[i], callback, opts);
    }
  } else {
    // Standard single event
    events = iteratee(events, name, callback, opts);
  }

  return events;
}

/**
 * The reducing API that adds a callback to the `events` object.
 *
 * @private
 */
function onApi(events, name, callback, options) {
  if (callback) {
    const handlers = events[name] || (events[name] = []);
    const { context, ctx, listening } = options;

    if (listening) listening.count++;

    handlers.push({
      callback,
      context,
      ctx: context || ctx,
      listening
    });
  }
  return events;
}

/**
 * The reducing API that removes a callback from the `events` object.
 *
 * @private
 */
function offApi(events, name, callback, options) {
  if (!events) return;

  const { context, listeners } = options;
  let i = 0;
  let names;

  // Delete all event listeners and "drop" events
  if (!name && !context && !callback) {
    if (listeners) {
      names = keys(listeners);
      for (; i < names.length; i++) {
        listeners[names[i]].cleanup();
      }
    }
    return;
  }

  names = name ? [name] : keys(events);
  for (; i < names.length; i++) {
    name = names[i];
    const handlers = events[name];

    // Bail out if there are no events stored
    if (!handlers) break;

    // Find any remaining events
    const remaining = [];
    for (let j = 0; j < handlers.length; j++) {
      const handler = handlers[j];
      if (
        (callback && callback !== handler.callback &&
          callback !== handler.callback._callback) ||
        (context && context !== handler.context)
      ) {
        remaining.push(handler);
      } else {
        const listening = handler.listening;
        if (listening) listening.off(name, callback);
      }
    }

    // Replace events if there are any remaining. Otherwise, clean up.
    if (remaining.length) {
      events[name] = remaining;
    } else {
      delete events[name];
    }
  }

  return events;
}

/**
 * Handles triggering the appropriate event callbacks.
 *
 * @private
 */
function triggerApi(objEvents, name, callback, args) {
  if (objEvents) {
    const events = objEvents[name];
    let allEvents = objEvents.all;

    // Slice allEvents to prevent concurrent modification issues
    if (events && allEvents) allEvents = allEvents.slice();

    if (events) triggerEvents(events, args);
    if (allEvents) triggerEvents(allEvents, [name].concat(args));
  }
  return objEvents;
}

/**
 * A difficult-to-believe, but optimized internal dispatch function for
 * triggering events. Tries to keep the usual cases speedy (most internal
 * Backbone events have 3 arguments).
 *
 * @private
 */
function triggerEvents(events, args) {
  let ev;
  let i = -1;
  const l = events.length;
  const a1 = args[0];
  const a2 = args[1];
  const a3 = args[2];

  switch (args.length) {
    case 0:
      while (++i < l) (ev = events[i]).callback.call(ev.ctx);
      return;
    case 1:
      while (++i < l) (ev = events[i]).callback.call(ev.ctx, a1);
      return;
    case 2:
      while (++i < l) (ev = events[i]).callback.call(ev.ctx, a1, a2);
      return;
    case 3:
      while (++i < l) (ev = events[i]).callback.call(ev.ctx, a1, a2, a3);
      return;
    default:
      while (++i < l) (ev = events[i]).callback.apply(ev.ctx, args);
      return;
  }
}

/**
 * Reduces the event callbacks into a map of `{event: onceWrapper}`.
 * `offer` unbinds the `onceWrapper` after it has been called.
 *
 * @private
 */
function onceMap(map, name, callback, offer) {
  if (callback) {
    const wrapped = once(function() {
      offer(name, wrapped);
      callback.apply(this, arguments);
    });
    wrapped._callback = callback;
    map[name] = wrapped;
  }
  return map;
}

/**
 * Try-catch guarded event binding, to prevent poisoning the global
 * `_listening` variable.
 *
 * @private
 */
function tryCatchOn(obj, name, callback, context) {
  try {
    obj.on(name, callback, context);
  } catch (e) {
    return e;
  }
}

/**
 * EventsMixin - A mixin object providing event functionality
 *
 * This can be mixed into any class or object to provide event capabilities.
 * All methods return `this` for chaining.
 */
export const EventsMixin = {
  /**
   * Bind an event to a `callback` function.
   * Passing `"all"` will bind the callback to all events fired.
   *
   * @param {string|Object} name - Event name(s) or event map
   * @param {Function} callback - Function to call when event fires
   * @param {Object} [context] - Context for callback execution
   * @returns {Object} Returns this for chaining
   *
   * @example
   * obj.on('change', handler);
   * obj.on('change blur', handler);
   * obj.on({change: handler1, blur: handler2});
   */
  on(name, callback, context) {
    const currentEvents = getEvents(this) || {};
    const newEvents = eventsApi(onApi, currentEvents, name, callback, {
      context,
      ctx: this,
      listening: _listening
    });
    setEvents(this, newEvents);

    if (_listening) {
      const listeners = getListeners(this) || {};
      listeners[_listening.id] = _listening;
      setListeners(this, listeners);

      // Allow the listening to use a counter, instead of tracking
      // callbacks for library interop
      _listening.interop = false;
    }

    return this;
  },

  /**
   * Inversion-of-control version of `on`.
   * Tell *this* object to listen to an event in another object,
   * keeping track of what it's listening to for easier unbinding later.
   *
   * @param {Object} obj - Object to listen to
   * @param {string|Object} name - Event name(s) or event map
   * @param {Function} callback - Function to call when event fires
   * @returns {Object} Returns this for chaining
   *
   * @example
   * view.listenTo(model, 'change', render);
   */
  listenTo(obj, name, callback) {
    if (!obj) return this;

    const id = ensureListenId(obj);
    const listeningTo = getListeningTo(this) || {};
    let listening = _listening = listeningTo[id];

    // This object is not listening to any other events on `obj` yet.
    // Setup the necessary references to track the listening callbacks.
    if (!listening) {
      ensureListenId(this);
      listening = _listening = listeningTo[id] = new Listening(this, obj);
      setListeningTo(this, listeningTo);
    }

    // Bind callbacks on obj
    const error = tryCatchOn(obj, name, callback, this);
    _listening = undefined;

    if (error) throw error;

    // If the target obj is not using EventsMixin, track events manually
    if (listening.interop) listening.on(name, callback);

    return this;
  },

  /**
   * Remove one or many callbacks.
   * If `context` is null, removes all callbacks with that function.
   * If `callback` is null, removes all callbacks for the event.
   * If `name` is null, removes all bound callbacks for all events.
   *
   * @param {string} [name] - Event name(s)
   * @param {Function} [callback] - Callback function to remove
   * @param {Object} [context] - Context to match
   * @returns {Object} Returns this for chaining
   *
   * @example
   * obj.off('change', handler);
   * obj.off('change');
   * obj.off();
   */
  off(name, callback, context) {
    const currentEvents = getEvents(this);
    if (!currentEvents) return this;

    const newEvents = eventsApi(offApi, currentEvents, name, callback, {
      context,
      listeners: getListeners(this)
    });
    setEvents(this, newEvents);

    return this;
  },

  /**
   * Tell this object to stop listening to either specific events
   * or to every object it's currently listening to.
   *
   * @param {Object} [obj] - Object to stop listening to
   * @param {string} [name] - Event name(s) to stop listening for
   * @param {Function} [callback] - Callback to remove
   * @returns {Object} Returns this for chaining
   *
   * @example
   * view.stopListening(model, 'change', handler);
   * view.stopListening(model);
   * view.stopListening();
   */
  stopListening(obj, name, callback) {
    const listeningTo = getListeningTo(this);
    if (!listeningTo) return this;

    const ids = obj ? [getListenId(obj)] : keys(listeningTo);

    for (let i = 0; i < ids.length; i++) {
      const listening = listeningTo[ids[i]];

      // If listening doesn't exist, this object is not currently
      // listening to obj. Break out early.
      if (!listening) break;

      listening.obj.off(name, callback, this);
      if (listening.interop) listening.off(name, callback);
    }

    if (isEmpty(listeningTo)) {
      listeningToStorage.delete(this);
    }

    return this;
  },

  /**
   * Bind an event to only be triggered a single time.
   * After the first time the callback is invoked, its listener will be removed.
   * If multiple events are passed in using the space-separated syntax,
   * the handler will fire once for each event, not once for a combination of all events.
   *
   * @param {string|Object} name - Event name(s) or event map
   * @param {Function} callback - Function to call when event fires
   * @param {Object} [context] - Context for callback execution
   * @returns {Object} Returns this for chaining
   *
   * @example
   * obj.once('change', handler);
   */
  once(name, callback, context) {
    // Map the event into a `{event: once}` object
    const events = eventsApi(onceMap, {}, name, callback, this.off.bind(this));
    if (typeof name === 'string' && context == null) callback = undefined;
    return this.on(events, callback, context);
  },

  /**
   * Inversion-of-control version of `once`.
   *
   * @param {Object} obj - Object to listen to
   * @param {string|Object} name - Event name(s) or event map
   * @param {Function} callback - Function to call when event fires
   * @returns {Object} Returns this for chaining
   *
   * @example
   * view.listenToOnce(model, 'change', render);
   */
  listenToOnce(obj, name, callback) {
    // Map the event into a `{event: once}` object
    const events = eventsApi(onceMap, {}, name, callback, this.stopListening.bind(this, obj));
    return this.listenTo(obj, events);
  },

  /**
   * Trigger one or many events, firing all bound callbacks.
   * Callbacks are passed the same arguments as `trigger` is, apart from the event name
   * (unless you're listening on `"all"`, which will cause your callback to
   * receive the true name of the event as the first argument).
   *
   * @param {string} name - Event name to trigger
   * @param {...*} args - Arguments to pass to callbacks
   * @returns {Object} Returns this for chaining
   *
   * @example
   * obj.trigger('change', value);
   * obj.trigger('custom', arg1, arg2, arg3);
   */
  trigger(name, ...args) {
    const currentEvents = getEvents(this);
    if (!currentEvents) return this;

    eventsApi(triggerApi, currentEvents, name, undefined, args);
    return this;
  }
};

export default EventsMixin;
