import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { View } from '../src/view.js';
import { Model } from '../src/model.js';
import { Collection } from '../src/collection.js';

describe('View', () => {
  let testElement;
  let view;

  beforeEach(() => {
    // Create a test element in the DOM
    testElement = document.createElement('div');
    testElement.id = 'testElement';
    testElement.innerHTML = '<h1>Test</h1>';
    document.body.appendChild(testElement);

    view = new View({
      id: 'test-view',
      className: 'test-view',
      other: 'non-special-option'
    });
  });

  afterEach(() => {
    // Clean up
    if (testElement && testElement.parentNode) {
      testElement.parentNode.removeChild(testElement);
    }
    if (view && view.el && view.el.parentNode) {
      view.el.parentNode.removeChild(view.el);
    }
  });

  describe('constructor', () => {
    it('should set id and className on el', () => {
      expect(view.el.id).toBe('test-view');
      expect(view.el.className).toBe('test-view');
      expect(view.el.other).toBeUndefined();
    });

    it('should assign cid', () => {
      expect(view.cid).toBeDefined();
      expect(view.cid).toMatch(/^view/);
    });
  });

  describe('initialize', () => {
    it('should call initialize hook', () => {
      class CustomView extends View {
        initialize() {
          this.one = 1;
        }
      }

      const customView = new CustomView();
      expect(customView.one).toBe(1);
    });
  });

  describe('preinitialize', () => {
    it('should call preinitialize hook', () => {
      class CustomView extends View {
        preinitialize() {
          this.one = 1;
        }
      }

      const customView = new CustomView();
      expect(customView.one).toBe(1);
    });

    it('should occur before view is set up', () => {
      let elInPreinitialize;
      class CustomView extends View {
        preinitialize() {
          elInPreinitialize = this.el;
        }
      }

      const customView = new CustomView();
      expect(elInPreinitialize).toBeUndefined();
      expect(customView.el).toBeDefined();
    });
  });

  describe('render', () => {
    it('should return the view instance', () => {
      const result = view.render();
      expect(result).toBe(view);
    });
  });

  describe('delegateEvents', () => {
    it('should bind events', () => {
      let counter = 0;
      const myView = new View({ el: testElement });
      myView.increment = function () { counter++; };

      const events = { 'click h1': 'increment' };
      myView.delegateEvents(events);

      const h1 = testElement.querySelector('h1');
      h1.click();
      expect(counter).toBe(1);

      h1.click();
      expect(counter).toBe(2);
    });

    it('should re-delegate events without duplicates', () => {
      let counter = 0;
      const myView = new View({ el: testElement });
      myView.increment = function () { counter++; };

      const events = { 'click h1': 'increment' };
      myView.delegateEvents(events);
      myView.delegateEvents(events);

      const h1 = testElement.querySelector('h1');
      h1.click();
      expect(counter).toBe(1); // Should only fire once, not twice
    });

    it('should allow functions for callbacks', () => {
      let counter = 0;
      const myView = new View({ el: testElement });

      const events = {
        'click h1': function () {
          counter++;
        }
      };

      myView.delegateEvents(events);
      testElement.querySelector('h1').click();
      expect(counter).toBe(1);

      testElement.querySelector('h1').click();
      expect(counter).toBe(2);
    });

    it('should ignore undefined methods', () => {
      const myView = new View({ el: testElement });
      myView.delegateEvents({ 'click h1': 'undefinedMethod' });
      // Should not throw
      testElement.querySelector('h1').click();
    });

    it('should bind events without selector to el', () => {
      let counter = 0;
      const myView = new View({ el: testElement });
      myView.increment = function () { counter++; };

      const events = { 'click': 'increment' };
      myView.delegateEvents(events);

      testElement.click();
      expect(counter).toBe(1);
    });
  });

  describe('delegate', () => {
    it('should add single event listener with selector', () => {
      let fired = false;
      const myView = new View({ el: testElement });
      myView.delegate('click', 'h1', function () {
        fired = true;
      });

      testElement.querySelector('h1').click();
      expect(fired).toBe(true);
    });

    it('should add single event listener without selector', () => {
      let fired = false;
      const myView = new View({ el: testElement });
      myView.delegate('click', '', function () {
        fired = true;
      });

      testElement.click();
      expect(fired).toBe(true);
    });

    it('should return the view instance', () => {
      const myView = new View({ el: testElement });
      const result = myView.delegate('click', 'h1', function () {});
      expect(result).toBe(myView);
    });
  });

  describe('undelegateEvents', () => {
    it('should remove all delegated events', () => {
      let counter = 0;
      const myView = new View({ el: testElement });
      myView.increment = function () { counter++; };

      const events = { 'click h1': 'increment' };
      myView.delegateEvents(events);

      testElement.querySelector('h1').click();
      expect(counter).toBe(1);

      myView.undelegateEvents();
      testElement.querySelector('h1').click();
      expect(counter).toBe(1); // Should still be 1
    });

    it('should return the view instance', () => {
      const myView = new View({ el: testElement });
      const result = myView.undelegateEvents();
      expect(result).toBe(myView);
    });
  });

  describe('undelegate', () => {
    it('should remove all events for event name', () => {
      let counter1 = 0;
      let counter2 = 0;
      const myView = new View({ el: testElement });

      myView.delegate('click', '', function () { counter1++; });
      myView.delegate('click', 'h1', function () { counter2++; });
      myView.undelegate('click');

      testElement.querySelector('h1').click();
      testElement.click();
      expect(counter1).toBe(0);
      expect(counter2).toBe(0);
    });

    it('should remove event with specific selector', () => {
      let counter1 = 0;
      let counter2 = 0;
      const myView = new View({ el: testElement });

      myView.delegate('click', '', function () { counter1++; });
      myView.delegate('click', 'h1', function () { counter2++; });
      myView.undelegate('click', 'h1');

      testElement.querySelector('h1').click();
      expect(counter2).toBe(0);

      testElement.click();
      expect(counter1).toBe(1);
    });

    it('should remove event with specific handler', () => {
      let counter1 = 0;
      let counter2 = 0;
      const myView = new View({ el: testElement });
      const handler = function () { counter1++; };

      myView.delegate('click', '', handler);
      myView.delegate('click', '', function () { counter2++; });
      myView.undelegate('click', '', handler);

      testElement.click();
      expect(counter1).toBe(0);
      expect(counter2).toBe(1);
    });

    it('should return the view instance', () => {
      const myView = new View({ el: testElement });
      const result = myView.undelegate('click');
      expect(result).toBe(myView);
    });
  });

  describe('tagName', () => {
    it('can be provided as a string', () => {
      class CustomView extends View {}
      CustomView.prototype.tagName = 'span';

      const customView = new CustomView();
      expect(customView.el.tagName).toBe('SPAN');
    });

    it('can be provided as a function', () => {
      class CustomView extends View {
        tagName() {
          return 'p';
        }
      }

      const customView = new CustomView();
      expect(customView.el.tagName).toBe('P');
    });

    it('defaults to div', () => {
      const myView = new View();
      expect(myView.el.tagName).toBe('DIV');
    });
  });

  describe('_ensureElement', () => {
    it('with DOM node el', () => {
      class CustomView extends View {}
      CustomView.prototype.el = document.body;

      const customView = new CustomView();
      expect(customView.el).toBe(document.body);
    });

    it('with string el as CSS selector', () => {
      class CustomView extends View {}
      CustomView.prototype.el = '#testElement';

      const customView = new CustomView();
      expect(customView.el).toBe(testElement);
    });

    it('with non-existent selector', () => {
      class CustomView extends View {}
      CustomView.prototype.el = '#nonexistent';

      const customView = new CustomView();
      expect(customView.el).toBeNull();
    });

    it('with HTML string', () => {
      class CustomView extends View {}
      CustomView.prototype.el = '<div id="html-string"><span>test</span></div>';

      const customView = new CustomView();
      expect(customView.el.id).toBe('html-string');
      expect(customView.el.querySelector('span').textContent).toBe('test');
    });
  });

  describe('className and id', () => {
    it('with className and id functions', () => {
      class CustomView extends View {
        className() {
          return 'className';
        }
        id() {
          return 'id';
        }
      }

      const customView = new CustomView();
      expect(customView.el.className).toBe('className');
      expect(customView.el.id).toBe('id');
    });
  });

  describe('attributes', () => {
    it('with attributes object', () => {
      class CustomView extends View {}
      CustomView.prototype.attributes = {
        'id': 'id',
        'class': 'class'
      };

      const customView = new CustomView();
      expect(customView.el.className).toBe('class');
      expect(customView.el.id).toBe('id');
    });

    it('with attributes as a function', () => {
      class CustomView extends View {
        attributes() {
          return { 'class': 'dynamic' };
        }
      }

      const customView = new CustomView();
      expect(customView.el.className).toBe('dynamic');
    });

    it('should default to className/id properties', () => {
      class CustomView extends View {}
      CustomView.prototype.className = 'backboneClass';
      CustomView.prototype.id = 'backboneId';
      CustomView.prototype.attributes = {
        'class': 'attributeClass',
        'id': 'attributeId'
      };

      const myView = new CustomView();
      expect(myView.el.className).toBe('backboneClass');
      expect(myView.el.id).toBe('backboneId');
    });

    it('should clone attributes object', () => {
      class CustomView extends View {}
      CustomView.prototype.attributes = { foo: 'bar' };

      const view1 = new CustomView({ id: 'foo' });
      expect(view1.el.id).toBe('foo');

      const view2 = new CustomView();
      expect(view2.el.id).toBe('');
    });
  });

  describe('multiple views per element', () => {
    it('should handle multiple views on same element', () => {
      let count = 0;
      class CustomView extends View {
        constructor(options) {
          super(options);
          this.events = {
            click: function () {
              count++;
            }
          };
          this.delegateEvents();
        }
      }

      const el = document.createElement('p');
      document.body.appendChild(el);

      const view1 = new CustomView({ el });
      el.click();
      expect(count).toBe(1);

      const view2 = new CustomView({ el });
      el.click();
      expect(count).toBe(3); // Both views fire

      view1.delegateEvents();
      el.click();
      expect(count).toBe(5); // Both views still fire

      document.body.removeChild(el);
    });
  });

  describe('setElement', () => {
    it('should change element and re-delegate events', () => {
      let counter = 0;
      const myView = new View();
      myView.increment = function () { counter++; };
      myView.events = {
        click: 'increment'
      };

      const oldEl = myView.el;
      const newEl = document.createElement('div');
      document.body.appendChild(oldEl);
      document.body.appendChild(newEl);

      myView.delegateEvents();
      myView.setElement(newEl);

      oldEl.click();
      expect(counter).toBe(0); // Old element should not fire

      newEl.click();
      expect(counter).toBe(1); // New element should fire

      expect(myView.el).toBe(newEl);
      expect(myView.el).not.toBe(oldEl);

      document.body.removeChild(oldEl);
      document.body.removeChild(newEl);
    });

    it('should return the view instance', () => {
      const myView = new View();
      const result = myView.setElement(document.createElement('div'));
      expect(result).toBe(myView);
    });
  });

  describe('remove', () => {
    it('should remove element from DOM and clean up events', () => {
      let counter = 0;
      const myView = new View();
      document.body.appendChild(myView.el);

      myView.delegate('click', '', function () { counter++; });
      myView.listenTo(myView, 'all', function () { counter++; });

      const result = myView.remove();
      expect(result).toBe(myView); // Should return view instance

      myView.el.click();
      myView.trigger('x');
      expect(counter).toBe(0); // Events should not fire

      expect(myView.el.parentNode).toBeNull(); // Should be removed from DOM
    });
  });

  describe('with model and collection', () => {
    it('should accept model option', () => {
      const model = new Model({ name: 'test' });
      const myView = new View({ model });
      expect(myView.model).toBe(model);
    });

    it('should accept collection option', () => {
      const collection = new Collection();
      const myView = new View({ collection });
      expect(myView.collection).toBe(collection);
    });

    it('stopListening should work with model and collection', () => {
      let counter = 0;
      class CustomView extends View {
        initialize() {
          this.listenTo(this.model, 'change', function () { counter++; });
          this.listenTo(this.collection, 'add', function () { counter++; });
        }
      }

      const myView = new CustomView({
        model: new Model(),
        collection: new Collection()
      });

      myView.stopListening();
      myView.model.set('name', 'test');
      myView.collection.add(new Model());
      expect(counter).toBe(0);
    });
  });

  describe('el as a function', () => {
    it('should provide function for el', () => {
      class CustomView extends View {
        el() {
          return '<p><a></a></p>';
        }
      }

      const myView = new CustomView();
      expect(myView.el.tagName).toBe('P');
      expect(myView.el.querySelector('a')).toBeDefined();
    });
  });

  describe('events passed in options', () => {
    it('should use events from options', () => {
      let counter = 0;
      class CustomView extends View {
        increment() {
          counter++;
        }
      }
      CustomView.prototype.el = testElement;

      const myView = new CustomView({
        events: {
          'click h1': 'increment'
        }
      });

      testElement.querySelector('h1').click();
      testElement.querySelector('h1').click();
      expect(counter).toBe(2);
    });
  });
});
