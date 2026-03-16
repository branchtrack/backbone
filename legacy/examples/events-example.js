/**
 * Example usage of EventsMixin
 * Run with: node --input-type=module examples/events-example.js
 */

import { EventsMixin } from '../src/index.js';

console.log('=== EventsMixin Example ===\n');

// Create objects with event capabilities
const emitter = { name: 'Emitter', ...EventsMixin };
const listener = { name: 'Listener', ...EventsMixin };

// Basic event binding and triggering
console.log('1. Basic events:');
emitter.on('greet', (message) => {
  console.log(`   Received: ${message}`);
});
emitter.trigger('greet', 'Hello World!');

// Space-separated events
console.log('\n2. Space-separated events:');
let count = 0;
emitter.on('save destroy', () => {
  count++;
  console.log(`   Event fired! Count: ${count}`);
});
emitter.trigger('save');
emitter.trigger('destroy');

// Event maps
console.log('\n3. Event maps:');
emitter.on({
  create: () => console.log('   Created!'),
  update: () => console.log('   Updated!'),
  delete: () => console.log('   Deleted!')
});
emitter.trigger('create update delete');

// Once (fires only once)
console.log('\n4. Once - fires only once:');
let onceCount = 0;
emitter.once('init', () => {
  onceCount++;
  console.log(`   Init fired! Count: ${onceCount}`);
});
emitter.trigger('init');
emitter.trigger('init'); // Won't fire again
console.log(`   Final count: ${onceCount}`);

// Cross-object listening (listenTo/stopListening)
console.log('\n5. Cross-object listening:');
const model = { id: 1, ...EventsMixin };
const view = { ...EventsMixin };

view.listenTo(model, 'change', (attr, value) => {
  console.log(`   View: Model changed ${attr} to ${value}`);
});

model.trigger('change', 'title', 'New Title');
model.trigger('change', 'status', 'published');

console.log('   Stopping listening...');
view.stopListening(model);
model.trigger('change', 'author', 'John'); // Won't be received

// The "all" event
console.log('\n6. The "all" event:');
const logger = { ...EventsMixin };
logger.on('all', (eventName, ...args) => {
  console.log(`   [LOG] Event: ${eventName}, Args: ${JSON.stringify(args)}`);
});
logger.trigger('custom', 'arg1', 'arg2');
logger.trigger('another', { data: 42 });

// Context binding
console.log('\n7. Context binding:');
const contextObj = {
  name: 'ContextObject',
  value: 100,
  ...EventsMixin
};

const handler = function(increment) {
  this.value += increment;
  console.log(`   ${this.name} value: ${this.value}`);
};

contextObj.on('increment', handler, contextObj);
contextObj.trigger('increment', 5);
contextObj.trigger('increment', 10);

// Chaining
console.log('\n8. Method chaining:');
const chained = { counter: 0, ...EventsMixin };
chained
  .on('a', () => chained.counter++)
  .on('b', () => chained.counter++)
  .trigger('a')
  .trigger('b')
  .trigger('a b');
console.log(`   Final counter: ${chained.counter}`); // Should be 5

console.log('\n=== All examples completed! ===');
