# Project Structure

This document describes the organization of the modernized Backbone.js project.

## Modern ES6 Implementation

### Source Code (`/src/`)

Modern ES6 modules implementing the Backbone API:

- `events_mixin.js` - Event system with on/off/trigger/listenTo
- `model.js` - Model class with attributes, validation, change tracking
- `collection.js` - Collection class with add/remove/sort and lodash utilities
- `view.js` - View class with DOM management and event delegation
- `router.js` - Router class with URL pattern matching, named params, splats
- `history.js` - History class with pushState/hash-based navigation
- `index.js` - Barrel exports for the public API
- `sync.js` - Not yet implemented (placeholder)

### Tests (`/test/`)

Comprehensive vitest test suite:

- `events_mixin.test.js` - 50 tests for EventsMixin
- `model.test.js` - 75 tests for Model
- `collection.test.js` - 89 tests for Collection
- `view.test.js` - 41 tests for View
- `router.test.js` - 46 tests for Router and History

**Total: 301 tests, all passing ✅**

### Configuration

- `package.json` - Modern dependencies and scripts (vitest, vite, lodash-es)
- `vitest.config.js` - Test configuration
- `.eslintrc` - Code linting rules

## Legacy Code (`/legacy/`)

Original Backbone.js code preserved for reference:

### Configuration

- `package.json` - Legacy dependencies and scripts (karma, qunit, underscore, uglifyjs)

### Root Files

- `backbone.js` - Original UMD build
- `backbone-min.js` - Minified version
- `karma.conf.js` - Karma test runner
- `bower.json` - Bower package config
- `index.html` - Original test runner
- `README.md` - Original Backbone.js README
- `LEGACY.md` - Legacy directory explanation

### Subdirectories

- `test/` - QUnit test suite (collection, events, model, router, sync, view)
- `examples/` - Classic examples (todos, localStorage adapter)
- `docs/` - Docco-generated documentation site
- `modules/` - AMD/UMD module builds

## Examples (`/examples/`)

- `example.js` - Modern ES6 example using the new API

## Documentation

- `README.md` - Modern ES6 version guide and API reference
- `MIGRATION_SUMMARY.md` - Overview of the modernization process
- `PHASE2_COMPLETE.md` - Model implementation notes
- `PHASE3_COMPLETE.md` - Collection implementation notes
- `PROJECT_STRUCTURE.md` - This file

## NPM Scripts

### Modern Development (root)

- `npm test` - Run all tests (vitest)
- `npm run test:watch` - Run tests in watch mode
- `npm run test:ui` - Run tests with UI
- `npm run build` - Build modern ES6 modules
- `npm run lint` - Lint modern code

### Legacy Development (in legacy/ directory)

To work with legacy code, `cd legacy` first:

- `npm test` - Run legacy karma/QUnit tests
- `npm run build` - Build legacy UMD bundle
- `npm run lint` - Lint legacy code
- `npm run doc` - Generate Docco documentation

## Main Entry Point

The package now exports the modern ES6 implementation:

```javascript
import { Model, Collection, View, Router, History, history } from "backbone";
```

See `package.json` - `"main": "src/index.js"`

## Key Differences from Legacy

1. **Module System**: ES6 modules instead of UMD
2. **Classes**: ES6 classes with `extends` instead of prototype chains
3. **Syntax**: Arrow functions, const/let, template literals
4. **Dependencies**: lodash-es (tree-shakeable) instead of underscore
5. **Testing**: vitest instead of QUnit/karma
6. **Sync**: Not yet implemented (throwsError for now)

## Migration Status

✅ Complete:

- EventsMixin (50 tests)
- Model (75 tests)
- Collection (89 tests)
- View (41 tests)
- Router (22 tests)
- History (15 tests)
- Route conversion utilities (9 tests)

🚧 Todo:

- Sync implementation
- Server integration examples
- Build tooling for distribution
- Performance benchmarks
