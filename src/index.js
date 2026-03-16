/**
 * Backbone Modern - ES6 Edition
 *
 * A modern, tree-shakeable reimplementation of Backbone.js using:
 * - Native ES6 classes and modules
 * - lodash-es for tree-shaking
 * - Native DOM APIs (no jQuery dependency)
 * - No global namespace pollution
 *
 * @module backbone-modern
 */

export { EventsMixin } from './mixins/events.js';
export { Model } from './model.js';
export { Collection } from './collection.js';
export { View } from './view.js';
export { Router } from './router.js';
export { History, history } from './history.js';
