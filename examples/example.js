/**
 * Example Usage - Modern Backbone ES6
 *
 * This file demonstrates the usage of the modernized Backbone library
 * with ES6 classes, native DOM APIs, and no jQuery.
 */

import { Model, Collection, View, EventsMixin } from './src/index.js';

// ============================================================================
// Model Example
// ============================================================================

class Todo extends Model {
  // Define default attributes
  defaults() {
    return {
      title: '',
      completed: false,
      priority: 'medium'
    };
  }

  // Validation
  validate(attrs) {
    if (attrs.title !== undefined && attrs.title.trim() === '') {
      return 'Title cannot be empty';
    }
    if (attrs.priority && !['low', 'medium', 'high'].includes(attrs.priority)) {
      return 'Priority must be low, medium, or high';
    }
  }

  // Custom method
  toggle() {
    this.set('completed', !this.get('completed'));
  }
}

// Create and use a model
const todo = new Todo({
  title: 'Learn Modern Backbone',
  priority: 'high'
});

// Listen to changes
todo.on('change', () => {
  console.log('Todo changed:', todo.toJSON());
});

todo.on('change:completed', (model, value) => {
  console.log('Completed status:', value);
});

// Modify the model
todo.set({ title: 'Master Modern Backbone' });
todo.toggle();

// ============================================================================
// Collection Example
// ============================================================================

class TodoList extends Collection {
  get model() {
    return Todo;
  }

  // Custom comparator for sorting
  comparator(todo) {
    return todo.get('completed') ? 1 : 0; // Incomplete items first
  }

  // Custom method
  completed() {
    return this.filter(todo => todo.get('completed'));
  }

  remaining() {
    return this.filter(todo => !todo.get('completed'));
  }
}

// Create a collection
const todos = new TodoList([
  { title: 'Write code', completed: false },
  { title: 'Write tests', completed: false },
  { title: 'Write docs', completed: true }
]);

// Listen to collection events
todos.on('add', (model) => {
  console.log('Todo added:', model.get('title'));
});

todos.on('remove', (model) => {
  console.log('Todo removed:', model.get('title'));
});

// Use collection methods
console.log('Total todos:', todos.length);
console.log('Completed:', todos.completed().length);
console.log('Remaining:', todos.remaining().length);

// Use lodash utility methods
const titles = todos.pluck('title');
const byPriority = todos.groupBy('priority');
const highPriorityTodos = todos.where({ priority: 'high' });

// Add a new todo
todos.add({ title: 'Deploy app', priority: 'high' });

// ============================================================================
// View Example
// ============================================================================

class TodoItemView extends View {
  get tagName() {
    return 'li';
  }

  get className() {
    return 'todo-item';
  }

  initialize() {
    // Re-render when model changes
    this.listenTo(this.model, 'change', this.render);

    // Remove view when model is removed from collection
    this.listenTo(this.model, 'destroy', this.remove);
  }

  // Event handlers for DOM events
  events() {
    return {
      'click .toggle': 'toggleCompleted',
      'click .destroy': 'clear',
      'dblclick label': 'edit'
    };
  }

  render() {
    const title = this.model.get('title');
    const completed = this.model.get('completed');
    const priority = this.model.get('priority');

    this.el.innerHTML = `
      <div class="view">
        <input class="toggle" type="checkbox" ${completed ? 'checked' : ''}>
        <label class="priority-${priority}">${title}</label>
        <button class="destroy">×</button>
      </div>
    `;

    // Add completed class
    if (completed) {
      this.el.classList.add('completed');
    } else {
      this.el.classList.remove('completed');
    }

    return this;
  }

  toggleCompleted() {
    this.model.toggle();
  }

  clear() {
    this.model.trigger('destroy', this.model);
  }

  edit() {
    // Edit functionality would go here
    console.log('Editing:', this.model.get('title'));
  }
}

class TodoAppView extends View {
  initialize() {
    // Listen to collection events
    this.listenTo(this.collection, 'add', this.addOne);
    this.listenTo(this.collection, 'reset', this.addAll);
    this.listenTo(this.collection, 'all', this.render);

    this.render();
  }

  events() {
    return {
      'submit form': 'createTodo',
      'click .clear-completed': 'clearCompleted',
      'click .toggle-all': 'toggleAll'
    };
  }

  render() {
    const remaining = this.collection.remaining().length;
    const completed = this.collection.completed().length;

    // Update stats
    const stats = this.el.querySelector('.todo-stats');
    if (stats) {
      stats.innerHTML = `
        <span class="todo-count">
          <strong>${remaining}</strong> ${remaining === 1 ? 'item' : 'items'} left
        </span>
        ${completed > 0 ? `<button class="clear-completed">Clear completed (${completed})</button>` : ''}
      `;
    }

    return this;
  }

  addOne(todo) {
    const view = new TodoItemView({ model: todo });
    const list = this.el.querySelector('.todo-list');
    list.appendChild(view.render().el);
  }

  addAll() {
    const list = this.el.querySelector('.todo-list');
    list.innerHTML = '';
    this.collection.each(this.addOne, this);
  }

  createTodo(e) {
    e.preventDefault();
    const input = this.el.querySelector('.new-todo');
    const title = input.value.trim();

    if (!title) return;

    this.collection.add({ title });
    input.value = '';
  }

  clearCompleted() {
    const completed = this.collection.completed();
    completed.forEach(todo => {
      this.collection.remove(todo);
    });
  }

  toggleAll() {
    const allCompleted = this.collection.every(todo => todo.get('completed'));
    this.collection.each(todo => {
      todo.set('completed', !allCompleted);
    });
  }
}

// ============================================================================
// EventsMixin Example
// ============================================================================

// You can mix events into any object
class DataStore {
  constructor() {
    this.data = {};

    // Mix in event capabilities
    Object.assign(this, EventsMixin);
  }

  set(key, value) {
    const oldValue = this.data[key];
    this.data[key] = value;
    this.trigger('change', key, value, oldValue);
    this.trigger('change:' + key, value, oldValue);
  }

  get(key) {
    return this.data[key];
  }
}

const store = new DataStore();

store.on('change:user', (value) => {
  console.log('User changed to:', value);
});

store.set('user', 'Alice');
store.set('user', 'Bob');

// ============================================================================
// Usage with Native DOM
// ============================================================================

// Since we're not using jQuery, you interact with native DOM
function initializeApp() {
  // Get or create the app element
  let appEl = document.getElementById('todoapp');

  if (!appEl) {
    appEl = document.createElement('div');
    appEl.id = 'todoapp';
    appEl.innerHTML = `
      <form>
        <input class="new-todo" placeholder="What needs to be done?" autofocus>
      </form>
      <section class="main">
        <input class="toggle-all" type="checkbox">
        <ul class="todo-list"></ul>
      </section>
      <footer class="todo-stats"></footer>
    `;
    document.body.appendChild(appEl);
  }

  // Create the app
  const app = new TodoAppView({
    el: appEl,
    collection: todos
  });

  // Expose for debugging
  window.app = app;
  window.todos = todos;
}

// Initialize when the DOM is ready
if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeApp);
  } else {
    initializeApp();
  }
}

// ============================================================================
// Export for use in other modules
// ============================================================================

export {
  Todo,
  TodoList,
  TodoItemView,
  TodoAppView,
  DataStore
};
