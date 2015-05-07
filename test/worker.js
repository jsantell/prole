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
      var id = e.data.id;
      var task = e.data.task;
      var data = e.data.data;
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
          response.then(function (val) { self.postMessage({ id: id, response: val }); }, handleError);
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

createTask(self, "square", function (val)  {
  if (typeof val !== "number") {
    throw new Error("Not a number!");
  }
  return val * val;
});
createTask(self, "squarePromise", function (val) {
  return new Promise(function (resolve) { resolve(val * val); });
});
createTask(self, "myError", function (val) {
  return new Error("Nope");
});
createTask(self, "myReject", function (val) {
  return new Promise(function (resolve, reject) { reject("nope"); });
});
