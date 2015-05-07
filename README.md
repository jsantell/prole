# prole

[![Build Status](http://img.shields.io/npm/v/prole.svg?style=flat-square)](https://www.npmjs.org/package/prole)


Simple Worker wrapper to create and off load tasks.

## How It Works

Create a worker script, like a normal [Worker](https://developer.mozilla.org/en-US/docs/Web/API/Worker/Worker) would accept, but you make add Prole hooks to it first. Include `./lib/worker-helper.js`, or require it via CommonJS in the worker script and define your task.

```
/* included ./lib/worker-helper.js */

createTask(self, "square", function (x) {
  return x * x;
});
```

The tasks must only accept one argument, and to communicate back to the main thread, return a value, or a promise.

On the main thread, create a Prole instance, pointing to your worker. The prole `performTask` method returns a promise that resolves to the return or resolve value of the task in the worker, or rejects if an error is thrown, the task returns an error instance, or a rejected promise is returned.

```
var prole = new Prole("./myworker.js");
prole.performTask("square", 5).then(function (value) {
  // value === 25
});
```


## Installation

`$ npm install prole`

## Build

You can build a browserified version via `gulp`, created in the `./build` directory, or
just use this in a script tag.

## API

### new Prole(url, { Worker, Promise });

Create a new `Prole` instance. Must specify a valid worker URL. May optionally pass in your
own optional [Worker](https://developer.mozilla.org/en-US/docs/Web/API/Worker/Worker) and [Promise](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise) constructors (Promise constructor must support constructor, and static methods all, resolve and reject.

#### {Promise} prole.performTask(taskName, value)

Executes task `taskName` in the worker script defined in the constructor. May pass in an argument as `value`, which will be the first argument passed into the task. Returns a promise that resolves to the return value of the task, or the resolution of a resolved promise, or rejects if an error is thrown in the task, a rejected promise is returned, or an error instance is returned.

## Testing

Open `./test/index.html`

## License

MPL 2.0 License, copyright (c) 2015 Jordan Santell
