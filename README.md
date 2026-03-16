# Backbone.js - Modern ES6 Version

A modern ES6+ rewrite of Backbone.js with native DOM APIs, native fetch, lodash-es, and zero jQuery/Underscore dependencies.

## Overview

This is a modernized version of Backbone.js that maintains API compatibility while using modern JavaScript features:

- **ES6 Classes** - All components are ES6 classes with proper inheritance
- **Native DOM** - No jQuery dependency, uses native DOM APIs
- **Native fetch** - Built-in REST sync via the fetch API, no jQuery Ajax
- **Lodash-es** - Tree-shakeable lodash utilities instead of underscore
- **ES Modules** - Full ESM support with named exports
- **No Globals** - Clean module system, no global namespace pollution
- **Pluggable Sync** - Extend the `Sync` class to customise transport

## Installation

```bash
npm install
```

## Usage

```javascript
import {
  Model,
  Collection,
  View,
  Router,
  History,
  history,
  Sync,
} from "./src/index.js";
```

## Quick Start

```javascript
import { Model, Collection, View, EventsMixin } from "./src/index.js";

// Create a model
class Todo extends Model {
  defaults() {
    return {
      title: "",
      completed: false,
    };
  }
}

// Create a collection
class TodoList extends Collection {
  get model() {
    return Todo;
  }
}

// Create a view
class TodoView extends View {
  initialize() {
    this.listenTo(this.model, "change", this.render);
  }

  render() {
    this.el.innerHTML = `
      <div>
        <input type="checkbox" ${this.model.get("completed") ? "checked" : ""}>
        <span>${this.model.get("title")}</span>
      </div>
    `;
    return this;
  }

  events() {
    return {
      "change input": "toggleCompleted",
    };
  }

  toggleCompleted() {
    this.model.set("completed", !this.model.get("completed"));
  }
}

// Use it
const todo = new Todo({ title: "Learn Modern Backbone" });
const view = new TodoView({ model: todo });
document.body.appendChild(view.render().el);
```

## Components

### EventsMixin

Provides event system with on/off/once/trigger and listenTo/stopListening.

```javascript
import { EventsMixin } from "./src/index.js";

class MyClass {}
Object.assign(MyClass.prototype, EventsMixin);

const obj = new MyClass();
obj.on("change", () => console.log("changed!"));
obj.trigger("change");
```

### Model

Data models with validation, change tracking, and computed properties.

```javascript
class User extends Model {
  defaults() {
    return {
      firstName: "",
      lastName: "",
    };
  }

  validate(attrs) {
    if (!attrs.firstName) {
      return "First name is required";
    }
  }
}

const user = new Model({ firstName: "John", lastName: "Doe" });
user.on("change", () => console.log("User changed"));
user.set({ firstName: "Jane" });
console.log(user.get("firstName")); // 'Jane'
```

**Key Methods:**

- `get(attr)` - Get an attribute value
- `set(attrs, options)` - Set one or more attributes
- `has(attr)` - Check if attribute exists
- `unset(attr)` - Remove an attribute
- `clear()` - Remove all attributes
- `toJSON()` - Get a copy of attributes
- `clone()` - Clone the model
- `isNew()` - Check if model has been saved
- `validate(attrs)` - Override to add validation
- Plus 40+ lodash utility methods (keys, values, pick, omit, etc.)

### Collection

Ordered sets of models with rich enumeration methods.

```javascript
class Users extends Collection {
  get model() {
    return User;
  }
}

const users = new Users([
  { firstName: "Alice", age: 25 },
  { firstName: "Bob", age: 30 },
]);

users.add({ firstName: "Charlie", age: 35 });
console.log(users.length); // 3

const adults = users.filter((user) => user.get("age") >= 18);
const names = users.pluck("firstName"); // ['Alice', 'Bob', 'Charlie']
```

**Key Methods:**

- `add(models, options)` - Add models to collection
- `remove(models, options)` - Remove models from collection
- `reset(models, options)` - Replace all models
- `get(id)` - Get model by id or cid
- `at(index)` - Get model at index
- `where(attrs)` - Find all models matching attributes
- `findWhere(attrs)` - Find first model matching attributes
- `pluck(attr)` - Extract attribute from all models
- `sort(options)` - Sort the collection
- `toJSON()` - Get array of model attributes
- Plus 40+ lodash utility methods (map, filter, reduce, groupBy, etc.)

### View

Component for building UI with declarative event binding.

```javascript
class AppView extends View {
  initialize() {
    this.listenTo(this.collection, "add", this.addOne);
    this.render();
  }

  render() {
    this.el.innerHTML = '<ul id="todo-list"></ul><button>Add</button>';
    this.collection.each((model) => this.addOne(model));
    return this;
  }

  events() {
    return {
      "click button": "addTodo",
    };
  }

  addOne(model) {
    const view = new TodoView({ model });
    this.el.querySelector("#todo-list").appendChild(view.render().el);
  }

  addTodo() {
    this.collection.add({ title: "New Todo" });
  }
}

const app = new AppView({
  collection: new TodoList(),
  el: document.getElementById("app"),
});
```

**Key Methods:**

- `render()` - Override to render your view
- `remove()` - Remove view from DOM and clean up
- `setElement(element)` - Change the view's element
- `delegateEvents(events)` - Bind event handlers
- `undelegateEvents()` - Remove all event handlers

**Key Properties:**

- `el` - The DOM element
- `tagName` - Element tag name (default: 'div')
- `className` - CSS class name(s)
- `id` - Element ID
- `attributes` - Additional attributes
- `events` - Event handlers hash
- `model` - Associated model
- `collection` - Associated collection

### Router

Client-side URL routing that maps URLs to actions.

```javascript
class AppRouter extends Router {
  routes() {
    return {
      "": "home",
      "todos/:id": "showTodo",
      "*path": "notFound",
    };
  }

  home() {
    console.log("Showing home");
  }

  showTodo(id) {
    console.log("Showing todo", id);
  }

  notFound(path) {
    console.log("Not found:", path);
  }
}

const router = new AppRouter();
history.start({ pushState: true });
```

**Key Methods:**

- `route(route, name, callback)` - Manually define a route
- `navigate(fragment, options)` - Navigate to a URL fragment

### History

Manages browser history via `pushState` or hashchange.

```javascript
import { history } from "./src/index.js";

// Start history (call once in your app)
history.start({ pushState: true });

// Navigate programmatically
history.navigate("todos/1", { trigger: true });
```

**Key Methods:**

- `start(options)` - Start listening to URL changes
- `stop()` - Stop listening
- `navigate(fragment, options)` - Navigate to a fragment

### Sync

RESTful server synchronization via the native fetch API.

```javascript
import { Sync } from "./src/index.js";

// Default CRUD operations work automatically
class Todo extends Model {
  urlRoot() {
    return "/api/todos";
  }
}

const todo = new Todo({ id: 1 });
await todo.fetch(); // GET /api/todos/1
await todo.save({ title: "x" }); // PUT /api/todos/1
await todo.destroy(); // DELETE /api/todos/1

// Customise transport by extending Sync
class AuthSync extends Sync {
  init(method, model, options) {
    const req = super.init(method, model, options);
    req.headers["Authorization"] = "Bearer " + getToken();
    return req;
  }
}

class SecureModel extends Model {}
SecureModel.Sync = AuthSync;
```

**Key Methods:**

- `url(method, model, options)` - Build the request URL
- `init(method, model, options)` - Build the fetch init object (headers, body, etc.)
- `parse(response)` - Parse the fetch Response, returns JSON by default
- `execute(method, model, options)` - Orchestrate the full request cycle

## Testing

All components have comprehensive test coverage using Vitest.

```bash
# Run modern tests
npm run test:modern

# Watch mode
npm run test:watch
```

**Test Coverage:**

- EventsMixin: 50 tests
- Model: 75 tests
- Collection: 89 tests
- View: 41 tests
- Router + History: 46 tests
- Sync: 59 tests
- **Total: 360 tests passing ✅**

## Differences from Original Backbone

### What's Changed

1. **No jQuery** - All DOM manipulation uses native APIs
   - `view.$el` → `view.el` (native element)
   - `view.$('selector')` → removed (use `view.el.querySelector()`)
   - Event delegation uses native `addEventListener`

2. **Native fetch** - Server sync uses the native fetch API
   - `Model.prototype.fetch()` - GET model from server
   - `Model.prototype.save()` - POST/PUT model to server
   - `Model.prototype.destroy()` - DELETE model from server
   - `Collection.prototype.fetch()` - GET collection from server
   - Extend the `Sync` class to customise transport

3. **ES6 Classes** - Use class syntax

   ```javascript
   // Old
   var MyModel = Backbone.Model.extend({ ... });

   // New
   class MyModel extends Model { ... }
   ```

4. **No Globals** - Import what you need

   ```javascript
   // Old
   new Backbone.Model();

   // New
   import { Model } from "./src/index.js";
   new Model();
   ```

5. **Lodash-es** - Tree-shakeable imports instead of underscore

### What's the Same

- **API Compatible** - All core APIs work the same
- **Event System** - Same on/off/trigger/listenTo behavior
- **Change Tracking** - Models track changes the same way
- **Validation** - Same validation hooks
- **Collections** - Same rich enumeration methods
- **Views** - Same declarative event binding
- **Router** - Same route patterns and navigate behavior
- **Sync** - fetch/save/destroy/create work against a REST endpoint
- **Philosophy** - Still provides just enough structure

## Browser Support

Requires modern browsers with ES6+ support:

- Chrome 51+
- Firefox 54+
- Safari 10+
- Edge 15+

## Dependencies

- **lodash-es** v4.17.21 - Tree-shakeable utility functions
- **vitest** v1.6.1 - Testing framework (dev only)

## File Structure

```
src/
  ├── index.js              # Main exports
  ├── model.js              # Model class
  ├── collection.js         # Collection class
  ├── view.js               # View class
  ├── router.js             # Router + History classes
  ├── sync.js               # Sync class + sync() function
  └── mixins/
      └── events.js         # EventsMixin

test/
  ├── events_mixin.test.js  # EventsMixin tests (50)
  ├── model.test.js         # Model tests (75)
  ├── collection.test.js    # Collection tests (89)
  ├── view.test.js          # View tests (41)
  ├── router.test.js        # Router + History tests (46)
  └── sync.test.js          # Sync tests (59)
```

## Migration Guide

### From Original Backbone

```javascript
// Before
var TodoModel = Backbone.Model.extend({
  defaults: {
    title: "",
    completed: false,
  },

  initialize: function () {
    this.on("change:title", this.titleChanged);
  },

  titleChanged: function () {
    console.log("Title changed");
  },
});

// After
class TodoModel extends Model {
  defaults() {
    return {
      title: "",
      completed: false,
    };
  }

  initialize() {
    this.on("change:title", this.titleChanged);
  }

  titleChanged() {
    console.log("Title changed");
  }
}
```

### Views Without jQuery

```javascript
// Before - with jQuery
var TodoView = Backbone.View.extend({
  render: function () {
    this.$el.html("<span>" + this.model.get("title") + "</span>");
    return this;
  },

  events: {
    "click .edit": "edit",
  },
});

// After - native DOM
class TodoView extends View {
  render() {
    this.el.innerHTML = "<span>" + this.model.get("title") + "</span>";
    return this;
  }

  events() {
    return {
      "click .edit": "edit",
    };
  }
}
```

## Philosophy

This modernization maintains Backbone's original philosophy:

> Backbone.js gives structure to web applications by providing models with key-value binding and custom events, collections with a rich API of enumerable functions, views with declarative event handling, and connects it all to your existing API over a RESTful JSON interface.

The goal is to provide **just enough structure** without being prescriptive. You bring your own templating, AJAX library, and whatever else your application needs.

## License

MIT License - same as original Backbone.js

## Credits

- Original Backbone.js by Jeremy Ashkenas and contributors
- Modern ES6 rewrite maintaining API compatibility
- Test suite adapted from original Backbone test suite

## Contributing

This is a modernization exercise. The original Backbone.js is at:
https://github.com/jashkenas/backbone
