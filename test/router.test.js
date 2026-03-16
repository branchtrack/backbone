import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Router } from '../src/router.js';
import { History, history } from '../src/history.js';
import { extend, pick } from 'lodash-es';

// Helper: Mock Location object for testing
class MockLocation {
  constructor(href) {
    this.parser = document.createElement('a');
    this.replace(href);
  }

  replace(href) {
    this.parser.href = href;
    extend(this, pick(this.parser,
      'href',
      'hash',
      'host',
      'search',
      'fragment',
      'pathname',
      'protocol'
    ));

    // In IE, anchor.pathname does not contain a leading slash though
    // window.location.pathname does.
    if (!/^\//.test(this.pathname)) this.pathname = '/' + this.pathname;
  }

  toString() {
    return this.href;
  }
}

describe('Router and History', () => {
  let mockLocation;
  let testHistory;
  let router;
  let lastRoute;
  let lastArgs;

  // Test Router class
  class TestRouter extends Router {
    constructor(options = {}) {
      super(options);
      this.count = 0;
      this.contacted = null;
      this.query = null;
      this.page = null;
      this.arg = null;
      this.args = null;
      this.anything = null;
    }

    get routes() {
      return {
        'counter': 'counter',
        'search/:query': 'search',
        'search/:query/p:page': 'search',
        'contacts': 'contacts',
        'contacts/new': 'newContact',
        'contacts/:id': 'loadContact',
        'optional(/:item)': 'optionalItem',
        'splat/*args/end': 'splat',
        '*anything': 'anything'
      };
    }

    preinitialize(options) {
      this.testpreinit = 'foo';
    }

    initialize(options) {
      this.testing = options?.testing;
      // Test that route() can be called in initialize
      this.route('implicit', 'implicit');
    }

    counter() {
      this.count++;
    }

    implicit() {
      this.count++;
    }

    search(query, page) {
      this.query = query;
      this.page = page;
    }

    contacts() {
      this.contacted = 'index';
    }

    newContact() {
      this.contacted = 'new';
    }

    loadContact(id) {
      this.contacted = 'load';
      this.contactId = id;
    }

    optionalItem(item) {
      this.arg = item !== undefined ? item : null;
    }

    splat(args) {
      this.args = args;
    }

    anything(whatever) {
      this.anything = whatever;
    }
  }

  const onRoute = function (routerParam, route, args) {
    lastRoute = route;
    lastArgs = args;
  };

  beforeEach(() => {
    mockLocation = new MockLocation('http://example.com');
    testHistory = new History();
    testHistory.location = mockLocation;
    testHistory.history = window.history; // Use real history for pushState tests

    // Replace the global history singleton
    history.stop();
    History.started = false;

    // Clear handlers from previous tests
    testHistory.handlers = [];

    // Copy properties to the singleton
    history.handlers = [];
    history.location = mockLocation;
    history.history = window.history;
    history.root = '/';

    router = new TestRouter({ testing: 101 });
    history.interval = 9;
    history.start({ pushState: false });

    lastRoute = null;
    lastArgs = [];
    history.on('route', onRoute);
  });

  afterEach(() => {
    history.stop();
    history.off('route', onRoute);
    History.started = false;
  });

  describe('Router', () => {
    it('should initialize with options', () => {
      expect(router.testing).toBe(101);
    });

    it('should call preinitialize hook', () => {
      expect(router.testpreinit).toBe('foo');
    });

    it('should handle simple routes', () => {
      mockLocation.replace('http://example.com#search/news');
      history.checkUrl();
      expect(router.query).toBe('news');
      expect(router.page).toBeNull();
      expect(lastRoute).toBe('search');
      expect(lastArgs[0]).toBe('news');
    });

    it('should handle unicode routes', () => {
      mockLocation.replace('http://example.com#search/тест');
      history.checkUrl();
      expect(router.query).toBe('тест');
      expect(router.page).toBeNull();
      expect(lastRoute).toBe('search');
      expect(lastArgs[0]).toBe('тест');
    });

    it('should handle two-part routes', () => {
      mockLocation.replace('http://example.com#search/nyc/p10');
      history.checkUrl();
      expect(router.query).toBe('nyc');
      expect(router.page).toBe('10');
    });

    it('should handle routes via navigate', () => {
      history.navigate('search/manhattan/p20', { trigger: true });
      expect(router.query).toBe('manhattan');
      expect(router.page).toBe('20');
    });

    it('should handle navigate with boolean trigger (backwards compatibility)', () => {
      history.navigate('search/brooklyn/p30', true);
      expect(router.query).toBe('brooklyn');
      expect(router.page).toBe('30');
    });

    it('should report matched route via navigate', () => {
      const matched = history.navigate('search/boston/p40', true);
      expect(matched).toBeTruthy();
    });

    it('should handle route precedence (first match wins)', () => {
      mockLocation.replace('http://example.com#contacts');
      history.checkUrl();
      expect(router.contacted).toBe('index');
      expect(lastRoute).toBe('contacts');
    });

    it('should handle more specific routes', () => {
      mockLocation.replace('http://example.com#contacts/new');
      history.checkUrl();
      expect(router.contacted).toBe('new');
      expect(lastRoute).toBe('newContact');
    });

    it('should handle parameterized routes', () => {
      mockLocation.replace('http://example.com#contacts/100');
      history.checkUrl();
      expect(router.contacted).toBe('load');
      expect(router.contactId).toBe('100');
      expect(lastRoute).toBe('loadContact');
    });

    it('should handle optional route segments', () => {
      mockLocation.replace('http://example.com#optional');
      history.checkUrl();
      expect(router.arg).toBeNull();

      mockLocation.replace('http://example.com#optional/thing');
      history.checkUrl();
      expect(router.arg).toBe('thing');
    });

    it('should handle splat routes', () => {
      mockLocation.replace('http://example.com#splat/long/path/end');
      history.checkUrl();
      expect(router.args).toBe('long/path');
    });

    it('should handle catch-all routes', () => {
      mockLocation.replace('http://example.com#anything/goes/here');
      history.checkUrl();
      expect(router.anything).toBe('anything/goes/here');
    });

    it('should call routes added via route() in initialize', () => {
      mockLocation.replace('http://example.com#implicit');
      history.checkUrl();
      expect(router.count).toBe(1);
    });

    it('should manually bind routes with route()', () => {
      let called = false;
      router.route('manual/:id', 'manual', (id) => {
        called = true;
        expect(id).toBe('test');
      });

      mockLocation.replace('http://example.com#manual/test');
      history.checkUrl();
      expect(called).toBe(true);
    });

    it('should handle route with regex', () => {
      let matched = false;
      router.route(/^custom\/(\d+)$/, 'custom', (id) => {
        matched = true;
        expect(id).toBe('123');
      });

      mockLocation.replace('http://example.com#custom/123');
      history.checkUrl();
      expect(matched).toBe(true);
    });

    it('should handle route with function as second argument', () => {
      let called = false;
      router.route('funcroute/:id', (id) => {
        called = true;
        expect(id).toBe('abc');
      });

      mockLocation.replace('http://example.com#funcroute/abc');
      history.checkUrl();
      expect(called).toBe(true);
    });

    it('should trigger route events', () => {
      let routeTriggered = false;
      let specificRouteTriggered = false;

      router.on('route', (name, args) => {
        routeTriggered = true;
        expect(name).toBe('search');
      });

      router.on('route:search', (query, page) => {
        specificRouteTriggered = true;
        expect(query).toBe('test');
      });

      mockLocation.replace('http://example.com#search/test');
      history.checkUrl();

      expect(routeTriggered).toBe(true);
      expect(specificRouteTriggered).toBe(true);
    });

    it('should support execute hook', () => {
      let executeCalled = false;
      const originalExecute = router.execute;

      router.execute = function (callback, args, name) {
        executeCalled = true;
        expect(name).toBe('counter');
        return originalExecute.call(this, callback, args, name);
      };

      mockLocation.replace('http://example.com#counter');
      history.checkUrl();
      expect(executeCalled).toBe(true);
      expect(router.count).toBe(1);
    });

    it('should not trigger route if execute returns false', () => {
      let routeTriggered = false;
      router.execute = function () {
        return false;
      };

      router.on('route:counter', () => {
        routeTriggered = true;
      });

      mockLocation.replace('http://example.com#counter');
      history.checkUrl();
      expect(routeTriggered).toBe(false);
    });

    it('should handle navigate via router', () => {
      router.navigate('search/test', { trigger: true });
      expect(router.query).toBe('test');
    });
  });

  describe('History', () => {
    it('should not start twice', () => {
      expect(() => {
        history.start();
      }).toThrow('Backbone.history has already been started');
    });

    it('should get fragment from hash', () => {
      mockLocation.replace('http://example.com#fragment');
      expect(history.getFragment()).toBe('fragment');
    });

    it('should get fragment from path with pushState', () => {
      history.stop();
      History.started = false;
      mockLocation.replace('http://example.com/path/to/page');
      history.start({ pushState: true, root: '/' });
      expect(history.getFragment()).toBe('path/to/page');
      history.stop();
      History.started = false;
    });

    it('should strip leading hash/slash from fragment', () => {
      mockLocation.replace('http://example.com#/test/path');
      expect(history.getFragment()).toBe('test/path');
    });

    it('should get hash correctly', () => {
      mockLocation.replace('http://example.com#test/hash');
      expect(history.getHash()).toBe('test/hash');
    });

    it('should get path correctly', () => {
      mockLocation.pathname = '/path/to/page';
      mockLocation.href = 'http://example.com/path/to/page';
      history.root = '/';
      expect(history.getPath()).toBe('path/to/page');
    });

    it('should decode fragments correctly', () => {
      const encoded = 'test%20with%20spaces';
      const decoded = history.decodeFragment(encoded);
      expect(decoded).toBe('test with spaces');
    });

    it('should handle custom root', () => {
      history.stop();
      History.started = false;
      mockLocation.replace('http://example.com/app/#test');
      history.start({ root: '/app/' });
      expect(history.root).toBe('/app/');
      history.stop();
      History.started = false;
    });

    it('should trigger notfound event when no route matches', () => {
      let notfoundTriggered = false;
      history.on('notfound', () => {
        notfoundTriggered = true;
      });

      mockLocation.replace('http://example.com#nonexistent/route');
      const result = history.loadUrl();
      expect(result).toBe(false);
      expect(notfoundTriggered).toBe(true);
    });

    it('should normalize root with leading and trailing slashes', () => {
      history.stop();
      History.started = false;
      history.start({ root: 'app' });
      expect(history.root).toBe('/app/');
      history.stop();
      History.started = false;
    });

    it('should handle navigate without triggering', () => {
      const initialCount = router.count;
      history.navigate('counter', { trigger: false });
      expect(router.count).toBe(initialCount); // Should not increment
    });

    it('should handle navigate with replace option', () => {
      history.navigate('search/first', { replace: false });
      history.navigate('search/second', { replace: true });
      // Note: In real browser, this would affect history.length
      // In tests, we just verify it doesn't throw
      expect(history.fragment).toBe('search/second');
    });

    it('should match root correctly', () => {
      history.root = '/';
      mockLocation.pathname = '/';
      expect(history.atRoot()).toBe(true);
    });

    it('should handle stop and restart', () => {
      history.stop();
      expect(History.started).toBe(false);

      History.started = false;
      history.start({ pushState: false });
      expect(History.started).toBe(true);
    });

    it('should clear handlers array', () => {
      const initialHandlers = history.handlers.length;
      history.route(/test/, () => {});
      expect(history.handlers.length).toBe(initialHandlers + 1);
    });
  });

  describe('Route conversion', () => {
    it('should convert named params to regex', () => {
      const regex = router._routeToRegExp('user/:id');
      expect(regex.test('user/123')).toBe(true);
      expect(regex.test('user/')).toBe(false);
    });

    it('should convert optional params to regex', () => {
      const regex = router._routeToRegExp('docs/:section(/:subsection)');
      expect(regex.test('docs/intro')).toBe(true);
      expect(regex.test('docs/intro/part1')).toBe(true);
    });

    it('should convert splat params to regex', () => {
      const regex = router._routeToRegExp('files/*path');
      expect(regex.test('files/folder/subfolder/file.txt')).toBe(true);
    });

    it('should escape regex special characters', () => {
      const regex = router._routeToRegExp('test.html');
      expect(regex.test('test.html')).toBe(true);
      expect(regex.test('testXhtml')).toBe(false);
    });

    it('should extract parameters correctly', () => {
      const regex = router._routeToRegExp('user/:id/post/:postId');
      const params = router._extractParameters(regex, 'user/123/post/456');
      expect(params).toEqual(['123', '456', null]);
    });

    it('should extract splat parameters', () => {
      const regex = router._routeToRegExp('files/*path');
      const params = router._extractParameters(regex, 'files/a/b/c.txt');
      expect(params).toEqual(['a/b/c.txt', null]);
    });

    it('should decode parameters', () => {
      const regex = router._routeToRegExp('search/:query');
      const params = router._extractParameters(regex, 'search/hello%20world');
      expect(params[0]).toBe('hello world');
    });

    it('should not decode query strings', () => {
      const regex = router._routeToRegExp('search/:query');
      const params = router._extractParameters(regex, 'search/test?foo=bar%20baz');
      expect(params[1]).toBe('foo=bar%20baz'); // Query string not decoded
    });

    it('should handle null parameters', () => {
      const regex = router._routeToRegExp('optional(/:item)');
      const params = router._extractParameters(regex, 'optional');
      expect(params[0]).toBeNull();
    });
  });
});
