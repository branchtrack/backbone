/**
 * Modern Backbone Model Example
 *
 * This example demonstrates the key features of the modernized Model class:
 * - Attribute management (get/set/unset/clear)
 * - Change tracking
 * - Validation
 * - Events integration
 * - Custom extensions
 * - URL generation
 */

import { Model } from '../src/index.js';

console.log('=== Modern Backbone Model Examples ===\n');

// ============================================================================
// Example 1: Basic Model Usage
// ============================================================================
console.log('1. Basic Model Usage');
console.log('-------------------');

const User = class extends Model {};
const user = new User({
  name: 'Jane Smith',
  email: 'jane@example.com',
  age: 28
});

console.log('Name:', user.get('name'));           // 'Jane Smith'
console.log('Email:', user.get('email'));         // 'jane@example.com'
console.log('All attributes:', user.toJSON());    // { name: 'Jane Smith', email: 'jane@example.com', age: 28 }
console.log('');

// ============================================================================
// Example 2: Change Tracking
// ============================================================================
console.log('2. Change Tracking');
console.log('-----------------');

user.on('change', (model) => {
  console.log('Model changed!');
  console.log('Changed attributes:', model.changedAttributes());
});

user.on('change:name', (model, value) => {
  console.log(`Name changed from "${model.previous('name')}" to "${value}"`);
});

// Make changes
user.set('name', 'Jane Doe');
user.set({ age: 29, location: 'San Francisco' });

console.log('Has name changed?', user.hasChanged('name'));        // true
console.log('Has email changed?', user.hasChanged('email'));      // false
console.log('Previous name:', user.previous('name'));             // 'Jane Smith'
console.log('Previous attributes:', user.previousAttributes());
console.log('');

// ============================================================================
// Example 3: Validation
// ============================================================================
console.log('3. Validation');
console.log('-------------');

class Contact extends Model {
  validate(attrs) {
    const errors = [];

    if (!attrs.name || attrs.name.trim().length === 0) {
      errors.push('Name is required');
    }

    if (!attrs.email || !attrs.email.includes('@')) {
      errors.push('Valid email is required');
    }

    if (attrs.age && (attrs.age < 0 || attrs.age > 150)) {
      errors.push('Age must be between 0 and 150');
    }

    if (errors.length > 0) {
      return errors.join(', ');
    }
  }
}

const contact = new Contact({ name: 'John', email: 'john@example.com' });

contact.on('invalid', (model, error) => {
  console.log('❌ Validation failed:', error);
});

contact.on('change', () => {
  console.log('✅ Model updated successfully');
});

// Valid changes
contact.set({ age: 30 }, { validate: true });

// Invalid changes
contact.set({ email: 'invalid-email' }, { validate: true });
contact.set({ age: 200 }, { validate: true });

// Check validity
console.log('Is valid?', contact.isValid());
console.log('');

// ============================================================================
// Example 4: Identity Management
// ============================================================================
console.log('4. Identity Management');
console.log('---------------------');

const product1 = new Model({ name: 'Widget' });
const product2 = new Model({ id: 42, name: 'Gadget' });

console.log('Product 1 CID:', product1.cid);              // 'c1' (auto-generated)
console.log('Product 1 is new?', product1.isNew());       // true (no id)

console.log('Product 2 ID:', product2.id);                // 42
console.log('Product 2 is new?', product2.isNew());       // false (has id)

// Setting ID
product1.set('id', 123);
console.log('Product 1 ID:', product1.id);                // 123
console.log('Product 1 is new now?', product1.isNew());   // false
console.log('');

// ============================================================================
// Example 5: Custom ID Attribute (MongoDB Example)
// ============================================================================
console.log('5. Custom ID Attribute (MongoDB)');
console.log('--------------------------------');

class MongoModel extends Model {}
MongoModel.prototype.idAttribute = '_id';

const doc = new MongoModel({
  _id: '507f1f77bcf86cd799439011',
  title: 'MongoDB Document',
  category: 'Database'
});

console.log('Mongo ID:', doc.id);                         // '507f1f77bcf86cd799439011'
console.log('Is new?', doc.isNew());                      // false
console.log('ID attribute name:', doc.idAttribute);       // '_id'
console.log('');

// ============================================================================
// Example 6: Custom CID Prefix
// ============================================================================
console.log('6. Custom CID Prefix');
console.log('--------------------');

class Article extends Model {}
Article.prototype.cidPrefix = 'article';

const article1 = new Article({ title: 'First Article' });
const article2 = new Article({ title: 'Second Article' });

console.log('Article 1 CID:', article1.cid);             // 'article1'
console.log('Article 2 CID:', article2.cid);             // 'article2'
console.log('');

// ============================================================================
// Example 7: URL Generation
// ============================================================================
console.log('7. URL Generation');
console.log('-----------------');

class Book extends Model {}
Book.prototype.urlRoot = '/api/books';

const existingBook = new Book({ id: 42, title: '1984' });
const newBook = new Book({ title: 'New Book' });

console.log('Existing book URL:', existingBook.url());   // '/api/books/42'
console.log('New book URL:', newBook.url());             // '/api/books'

// Dynamic urlRoot
class DynamicModel extends Model {
  urlRoot() {
    return `/api/users/${this.get('userId')}/posts`;
  }
}

const post = new DynamicModel({ userId: 10, id: 5, title: 'My Post' });
console.log('Dynamic URL:', post.url());                 // '/api/users/10/posts/5'
console.log('');

// ============================================================================
// Example 8: Lifecycle Hooks
// ============================================================================
console.log('8. Lifecycle Hooks');
console.log('------------------');

class TrackedModel extends Model {
  preinitialize(attributes, options) {
    console.log('preinitialize called');
    console.log('Attributes:', attributes);
    console.log('Options:', options);
  }

  initialize(attributes, options) {
    console.log('initialize called');
    console.log('Model CID:', this.cid);

    // Set up any default listeners
    this.on('change', () => {
      console.log('TrackedModel changed');
    });
  }
}

const tracked = new TrackedModel({ value: 100 }, { source: 'example' });
tracked.set('value', 200);
console.log('');

// ============================================================================
// Example 9: Defaults
// ============================================================================
console.log('9. Defaults');
console.log('-----------');

class Settings extends Model {
  defaults() {
    return {
      theme: 'light',
      notifications: true,
      language: 'en'
    };
  }
}

const settings1 = new Settings();
const settings2 = new Settings({ theme: 'dark' });

console.log('Settings 1:', settings1.toJSON());
// { theme: 'light', notifications: true, language: 'en' }

console.log('Settings 2:', settings2.toJSON());
// { theme: 'dark', notifications: true, language: 'en' }
console.log('');

// ============================================================================
// Example 10: Cloning and Matching
// ============================================================================
console.log('10. Cloning and Matching');
console.log('-----------------------');

const original = new Model({
  name: 'Original',
  tags: ['javascript', 'backbone'],
  metadata: { version: 1 }
});

const cloned = original.clone();
console.log('Clone equals original?', cloned.cid !== original.cid); // Different instances
console.log('Clone has same attributes?',
  JSON.stringify(cloned.attributes) === JSON.stringify(original.attributes));

// Matching
console.log('Matches name="Original"?', original.matches({ name: 'Original' }));    // true
console.log('Matches name="Different"?', original.matches({ name: 'Different' }));  // false
console.log('');

// ============================================================================
// Example 11: Event Cross-Object Listening
// ============================================================================
console.log('11. Cross-Object Event Listening');
console.log('---------------------------------');

const teacher = new Model({ name: 'Dr. Smith' });
const student = new Model({ name: 'Alice' });

// Student listens to teacher
student.listenTo(teacher, 'change:subject', (model, subject) => {
  console.log(`${student.get('name')} heard: Teacher is now teaching ${subject}`);
});

teacher.set('subject', 'Mathematics');
teacher.set('subject', 'Physics');

// Clean up
student.stopListening();
teacher.set('subject', 'Chemistry'); // No output (student stopped listening)
console.log('');

// ============================================================================
// Example 12: Silent Changes
// ============================================================================
console.log('12. Silent Changes');
console.log('------------------');

const counter = new Model({ count: 0 });

counter.on('change', () => {
  console.log('Counter changed!');
});

counter.set('count', 1);              // Triggers event
counter.set('count', 2, { silent: true }); // No event
counter.set('count', 3);              // Triggers event

console.log('Final count:', counter.get('count'));
console.log('');

// ============================================================================
// Example 13: HTML Escaping
// ============================================================================
console.log('13. HTML Escaping');
console.log('-----------------');

const comment = new Model({
  username: 'john_doe',
  message: '<script>alert("XSS")</script>Hello!'
});

console.log('Raw message:', comment.get('message'));
console.log('Escaped message:', comment.escape('message'));
// &lt;script&gt;alert(&quot;XSS&quot;)&lt;&#x2F;script&gt;Hello!
console.log('');

// ============================================================================
// Example 14: Parse Hook
// ============================================================================
console.log('14. Parse Hook');
console.log('--------------');

class DateModel extends Model {
  parse(response) {
    // Convert date strings to Date objects
    if (response.createdAt) {
      response.createdAt = new Date(response.createdAt);
    }
    if (response.updatedAt) {
      response.updatedAt = new Date(response.updatedAt);
    }
    return response;
  }
}

const record = new DateModel({
  id: 1,
  createdAt: '2024-01-15T10:30:00Z',
  updatedAt: '2024-01-20T15:45:00Z'
}, { parse: true });

console.log('Created at:', record.get('createdAt'));  // Date object
console.log('Updated at:', record.get('updatedAt'));  // Date object
console.log('');

// ============================================================================
// Example 15: No Server Sync (Modern Approach)
// ============================================================================
console.log('15. Server Sync (Not Implemented)');
console.log('----------------------------------');

const data = new Model({ id: 1, value: 'test' });

try {
  data.save();
} catch (error) {
  console.log('❌ save() throws:', error.message);
}

try {
  data.fetch();
} catch (error) {
  console.log('❌ fetch() throws:', error.message);
}

try {
  data.destroy();
} catch (error) {
  console.log('❌ destroy() throws:', error.message);
}

console.log('');
console.log('💡 Modern approach: Use fetch/axios/etc. directly');
console.log('   Example:');
console.log('   const response = await fetch(model.url(), {');
console.log('     method: "PUT",');
console.log('     body: JSON.stringify(model.toJSON())');
console.log('   });');
console.log('');

// ============================================================================
// Example 16: Underscore/Lodash Utility Methods
// ============================================================================
console.log('16. Underscore/Lodash Utility Methods');
console.log('-------------------------------------');

const util = new Model({
  name: 'Jane Doe',
  age: 28,
  city: 'San Francisco',
  country: 'USA',
  active: true
});

// keys, values, pairs
console.log('Keys:', util.keys());                        // ['name', 'age', 'city', 'country', 'active']
console.log('Values:', util.values());                    // ['Jane Doe', 28, 'San Francisco', 'USA', true]
console.log('Pairs:', util.pairs());                      // [['name', 'Jane Doe'], ['age', 28], ...]

// pick and omit
console.log('Pick name & city:', util.pick('name', 'city'));           // { name: 'Jane Doe', city: 'San Francisco' }
console.log('Omit age & country:', util.omit('age', 'country'));       // { name: 'Jane Doe', city: 'San Francisco', active: true }

// invert
const codes = new Model({ US: 'United States', UK: 'United Kingdom', FR: 'France' });
console.log('Inverted:', codes.invert());                 // { 'United States': 'US', 'United Kingdom': 'UK', 'France': 'FR' }

// isEmpty
const empty = new Model();
const full = new Model({ data: 'value' });
console.log('Empty model isEmpty?', empty.isEmpty());     // true
console.log('Full model isEmpty?', full.isEmpty());       // false

// chain
const nums = new Model({ a: 1, b: 2, c: 3, d: 4 });
const result = nums.chain()
  .omit('d')
  .invert()
  .value();
console.log('Chained result:', result);                   // { '1': 'a', '2': 'b', '3': 'c' }
console.log('');

console.log('=== All Model Examples Complete ===');
