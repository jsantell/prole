/**
 * prole - 1.0.0
 * https://github.com/jsantell/prole
 * MIT License, copyright (c) 2015 Jordan Santell
 */
!function(e){if("object"==typeof exports&&"undefined"!=typeof module)module.exports=e();else if("function"==typeof define&&define.amd)define([],e);else{var f;"undefined"!=typeof window?f=window:"undefined"!=typeof global?f=global:"undefined"!=typeof self&&(f=self),f.Prole=e()}}(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
module.exports = require("./lib/worker").Prole;

},{"./lib/worker":3}],2:[function(require,module,exports){
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */
"use strict";

// Wrapper for CommonJS or browser
(function (global, fn) {
  if (typeof exports === "object") {
    fn(exports);
  } else {
    fn(global);
  }
})(this, function (exports) {

/**
 * This file is to only be included by ChromeWorkers. This exposes
 * a `createTask` function to workers to register tasks for communication
 * back to `devtools/shared/worker`.
 *
 * Tasks can be send their responses via a return value, either a primitive
 * or a promise.
 *
 * createTask(self, "average", function (data) {
 *   return data.reduce((sum, val) => sum + val, 0) / data.length;
 * });
 *
 * createTask(self, "average", function (data) {
 *   return new Promise((resolve, reject) => {
 *     resolve(data.reduce((sum, val) => sum + val, 0) / data.length);
 *   });
 * });
 *
 *
 * Errors:
 *
 * Returning an Error value, or if the returned promise is rejected, this
 * propagates to the DevToolsWorker as a rejected promise. If an error is
 * thrown in a synchronous function, that error is also propagated.
 */

/**
 * Takes a worker's `self` object, a task name, and a function to
 * be called when that task is called. The task is called with the
 * passed in data as the first argument
 *
 * @param {object} self
 * @param {string} name
 * @param {function} fn
 */
function createTask (self, name, fn) {
  // Store a hash of task name to function on the Worker
  if (!self._tasks) {
    self._tasks = {};
  }

  // Create the onmessage handler if not yet created.
  if (!self.onmessage) {
    self.onmessage = createHandler(self);
  }

  // Store the task on the worker.
  self._tasks[name] = fn;

  /**
   * Creates the `self.onmessage` handler for a Worker.
   *
   * @param {object} self
   * @return {function}
   */
  function createHandler (self) {
    return function (e) {
      var { id, task, data } = e.data;
      var taskFn = self._tasks[task];

      if (!taskFn) {
        var error = "Task " + task + " not found in worker.";
        self.postMessage({ id: id, error: error });
        return;
      }

      try {
        var results;
        handleResponse(taskFn(data));
      } catch (e) {
        handleError(e);
      }

      function handleResponse (response) {
        // If a promise
        if (response && typeof response.then === "function") {
          response.then(val => self.postMessage({ id: id, response: val }), handleError);
        }
        // If an error object
        else if (response instanceof Error) {
          handleError(response);
        }
        // If anything else
        else {
          self.postMessage({ id: id, response: response });
        }
      }

      function handleError (e) {
        self.postMessage({ id: id, error: e ? (e.message || e) : "Error" });
      }
    }
  }
}
exports.createTask = createTask;
});

},{}],3:[function(require,module,exports){
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */
"use strict";

var MESSAGE_COUNTER = 0;
var createTask = require("./worker-helper").createTask;

/**
 * Creates a wrapper around a Worker, providing easy
 * communication to offload demanding tasks. The corresponding URL
 * must implement the interface provided by `./worker-helper`.
 *
 * @param {string} url
 *        The URL of the worker.
 * @param {object} options
 * @options {object?} Worker
 *          The constructor to use for Worker. Defaults to global `Worker`.
 * @options {object?} Promise
 *          The constructor to use for Promises. Defaults to global `Promiser`.
 */
function Prole (url, options) {
  options = options || {};
  this._Worker = options.Worker || Worker;
  this._Promise = options.Promise || Promise;
  this._worker = new this._Worker(url);
}
exports.Prole = Prole;

/**
 * Performs the given task in a chrome worker, passing in data.
 * Returns a promise that resolves when the task is compvared, resulting in
 * the return value of the task.
 *
 * @param {string} task
 *        The name of the task to execute in the worker.
 * @param {any} data
 *        Data to be passed into the task implemented by the worker.
 * @return {Promise}
 */
Prole.prototype.performTask = function ProlePerformTask (task, data) {
  if (this._destroyed) {
    return this._Promise.reject("Cannot call performTask on a destroyed Prole instance.");
  }
  var worker = this._worker;
  var id = ++MESSAGE_COUNTER;
  worker.postMessage({ task, id, data });

  return new this._Promise(function (resolve, reject) {
    worker.addEventListener("message", function listener({ data }) {
      if (data.id !== id) {
        return;
      }
      worker.removeEventListener("message", listener);
      if (data.error) {
        reject(data.error);
      } else {
        resolve(data.response);
      }
    });
  });
};

/**
 * Terminates the underlying worker. Use when no longer needing the worker.
 */
Prole.prototype.destroy = function ProleDestroy () {
  this._worker.terminate();
  this._worker = this._Worker = this._Promise = null;
  this._destroyed = true;
};

},{"./worker-helper":2}]},{},[1])(1)
});