import { isFunction, isString, extend, pick, result, uniqueId } from 'lodash-es';
import { EventsMixin } from './mixins/events.js';

// Backbone.View
// -------------

// Backbone Views are almost more convention than they are actual code. A View
// is simply a JavaScript object that represents a logical chunk of UI in the
// DOM. This might be a single item, an entire list, a sidebar or panel, or
// even the surrounding frame which wraps your whole app. Defining a chunk of
// UI as a **View** allows you to define your DOM events declaratively, without
// having to worry about render order ... and makes it easy for the view to
// react to specific changes in the state of your models.

// Cached regex to split keys for `delegate`.
const delegateEventSplitter = /^(\S+)\s*(.*)$/;

// List of view options to be set as properties.
const viewOptions = ['model', 'collection', 'el', 'id', 'attributes', 'className', 'tagName', 'events'];

// Creating a Backbone.View creates its initial element outside of the DOM,
// if an existing element is not provided...
export class View {
  constructor(options = {}) {
    this.cid = uniqueId('view');

    // Call preinitialize hook before setup
    this.preinitialize.apply(this, arguments);

    // Pick view-specific options
    extend(this, pick(options, viewOptions));

    // Ensure the view has a DOM element
    this._ensureElement();

    // Call initialize hook after setup
    this.initialize.apply(this, arguments);
  }

  // preinitialize is an empty function by default. You can override it with a function
  // or object. preinitialize will run before any instantiation logic is run in the View
  preinitialize() {}

  // Initialize is an empty function by default. Override it with your own
  // initialization logic.
  initialize() {}

  // **render** is the core function that your view should override, in order
  // to populate its element (`this.el`), with the appropriate HTML. The
  // convention is for **render** to always return `this`.
  render() {
    return this;
  }

  // Remove this view by taking the element out of the DOM, and removing any
  // applicable Backbone.Events listeners.
  remove() {
    this._removeElement();
    this.stopListening();
    this.undelegateEvents();
    return this;
  }

  // Remove this view's element from the document and all event listeners
  // attached to it. Exposed for subclasses using an alternative DOM
  // manipulation API.
  _removeElement() {
    if (this.el && this.el.parentNode) {
      this.el.parentNode.removeChild(this.el);
    }
  }

  // Change the view's element (`this.el` property) and re-delegate the
  // view's events on the new element.
  setElement(element) {
    this.undelegateEvents();
    this._setElement(element);
    this.delegateEvents();
    return this;
  }

  // Creates the `this.el` reference for this view using the given `el`.
  // `el` can be a CSS selector or an HTML string, or an element.
  // Subclasses can override this to utilize an alternative DOM manipulation
  // API and are only required to set the `this.el` property.
  _setElement(el) {
    if (isString(el)) {
      // Check if it's an HTML string (starts with '<')
      if (el.trim().charAt(0) === '<') {
        // Parse as HTML string
        const template = document.createElement('template');
        template.innerHTML = el.trim();
        this.el = template.content.firstChild;
      } else {
        // Try to select element from DOM
        this.el = document.querySelector(el);
      }
    } else {
      this.el = el;
    }
  }

  // Set callbacks, where `this.events` is a hash of
  //
  // *{"event selector": "callback"}*
  //
  //     {
  //       'mousedown .title':  'edit',
  //       'click .button':     'save',
  //       'click .open':       function(e) { ... }
  //     }
  //
  // pairs. Callbacks will be bound to the view, with `this` set properly.
  // Uses event delegation for efficiency.
  // Omitting the selector binds the event to `this.el`.
  delegateEvents(events) {
    events || (events = result(this, 'events'));
    if (!events) return this;
    this.undelegateEvents();

    for (const key in events) {
      let method = events[key];
      if (!isFunction(method)) method = this[method];
      if (!method) continue;

      const match = key.match(delegateEventSplitter);
      this.delegate(match[1], match[2], method.bind(this));
    }
    return this;
  }

  // Add a single event listener to the view's element (or a child element
  // using `selector`). This only works for delegate-able events: not `focus`,
  // `blur`, and not `change`, `submit`, and `reset` in Internet Explorer.
  delegate(eventName, selector, listener) {
    // Store delegated events for cleanup
    this._delegatedEvents = this._delegatedEvents || [];

    // Create a wrapper that handles event delegation
    const handler = (e) => {
      if (selector) {
        // Find the closest element that matches the selector
        let target = e.target;
        while (target && target !== this.el) {
          if (target.matches && target.matches(selector)) {
            listener.call(this, e);
            return;
          }
          target = target.parentNode;
        }
      } else {
        // No selector, only fire if event target is this.el itself
        if (e.target === this.el) {
          listener.call(this, e);
        }
      }
    };

    // Store the handler for cleanup
    this._delegatedEvents.push({
      eventName,
      selector,
      listener,
      handler
    });

    // Add the event listener
    this.el.addEventListener(eventName, handler, false);

    return this;
  }

  // Clears all callbacks previously bound to the view by `delegateEvents`.
  // You usually don't need to use this, but may wish to if you have multiple
  // Backbone views attached to the same DOM element.
  undelegateEvents() {
    if (this.el && this._delegatedEvents) {
      for (const event of this._delegatedEvents) {
        this.el.removeEventListener(event.eventName, event.handler, false);
      }
      this._delegatedEvents = [];
    }
    return this;
  }

  // A finer-grained `undelegateEvents` for removing a single delegated event.
  // `selector` and `listener` are both optional.
  undelegate(eventName, selector, listener) {
    if (!this.el || !this._delegatedEvents) return this;

    // Filter out the events that match the criteria
    const toRemove = this._delegatedEvents.filter(event => {
      if (event.eventName !== eventName) return false;
      if (selector && event.selector !== selector) return false;
      if (listener && event.listener !== listener) return false;
      return true;
    });

    // Remove the matching events
    for (const event of toRemove) {
      this.el.removeEventListener(event.eventName, event.handler, false);
      const index = this._delegatedEvents.indexOf(event);
      if (index > -1) {
        this._delegatedEvents.splice(index, 1);
      }
    }

    return this;
  }

  // Produces a DOM element to be assigned to your view. Exposed for
  // subclasses using an alternative DOM manipulation API.
  _createElement(tagName) {
    return document.createElement(tagName);
  }

  // Ensure that the View has a DOM element to render into.
  // If `this.el` is a string, pass it through `querySelector`, take the first
  // matching element, and re-assign it to `el`. Otherwise, create
  // an element from the `id`, `className` and `tagName` properties.
  _ensureElement() {
    if (!this.el) {
      const attrs = extend({}, result(this, 'attributes'));
      if (this.id) attrs.id = result(this, 'id');
      if (this.className) attrs['class'] = result(this, 'className');
      this.setElement(this._createElement(result(this, 'tagName')));
      this._setAttributes(attrs);
    } else {
      this.setElement(result(this, 'el'));
    }
  }

  // Set attributes from a hash on this view's element. Exposed for
  // subclasses using an alternative DOM manipulation API.
  _setAttributes(attributes) {
    for (const key in attributes) {
      this.el.setAttribute(key, attributes[key]);
    }
  }
}

// The default `tagName` of a View's element is `"div"`.
View.prototype.tagName = 'div';

// Mix in EventsMixin
Object.assign(View.prototype, EventsMixin);
