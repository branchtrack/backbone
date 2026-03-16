# Legacy Backbone Code

This directory contains the original Backbone.js code and related files from before the ES6 modernization project.

## Contents

- `backbone.js` - Original UMD build of Backbone.js
- `backbone-min.js` and maps - Minified version
- `debug-info.js` - Debug utilities
- `bower.json` - Bower package configuration
- `index.html` - Original test runner HTML

### test/

Original QUnit-based test suite:

- `collection.js` - Collection tests
- `events.js` - Events tests
- `model.js` / `model.coffee` - Model tests
- `router.js` - Router tests
- `sync.js` - Sync tests
- `view.js` - View tests
- `noconflict.js` - Conflict resolution tests
- `debuginfo.js` - Debug info tests
- `setup/` - QUnit test setup utilities
- `vendor/` - Test dependencies (jQuery, Underscore, QUnit)

### examples/

- `backbone.localStorage.js` - LocalStorage adapter
- `todos/` - Classic TodoMVC example

### docs/

- Documentation site built with Docco
- API reference and examples

### modules/

- AMD/UMD module build files

### karma/

- `karma.conf.js` - Karma test runner configuration
- `karma.conf-sauce.js` - SauceLabs cross-browser testing config

## Modern Code Location

The modernized ES6 version of Backbone is located in:

- `/src/` - ES6 modules and classes
- `/test/` - Vitest test suite (\*.test.js)

## Why Keep This?

This legacy code is preserved for:

1. Reference during the modernization process
2. Historical comparison of implementation approaches
3. Legacy example applications
4. Original test coverage verification
