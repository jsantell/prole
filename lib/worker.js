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
