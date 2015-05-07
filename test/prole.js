describe("Prole", function () {
  it("creates a Prole instance with default Worker and Promise", function (done) {
    var prole = new Prole("./worker.js");
    prole.performTask("square", 5).then(function (val) {
      expect(val).to.be.equal(25);
      prole.destroy();
      done();
    });
  });

  it("can specify custom Worker and Promise", function (done) {
    var workerCalled;
    var promiseCalled;
    function MyWorker (url) {
      workerCalled = url;
      return new Worker(url);
    }
    MyWorker.prototype = Worker.prototype;
    function MyPromise (fn) {
      promiseCalled = true;
      return new Promise(fn);
    }
    MyPromise.prototype = Promise.prototype;
    Object.keys(Promise).forEach(function (k) { MyPromise[k] = Promise[k]; });

    var prole = new Prole("./worker.js", { Worker: MyWorker, Promise: MyPromise });
    prole.performTask("square", 5).then(function (val) {
      expect(val).to.be.equal(25);
      expect(workerCalled).to.be.equal("./worker.js");
      expect(promiseCalled).to.be.equal(true);
      prole.destroy();
      done();
    });
  });

  // This fails immediately for ChromeWorkers in Firefox, but waits
  // to fire an onerror handler while in content for a normal Worker.
  /*
  it("fails when worker not found", function () {
    try {
      var prole = new Prole("./idontexist.js");
      expect(false).to.be.ok;
    } catch (e) {
      expect(true).to.be.ok;
    }
  });
  */
});

describe("Prole.prototype.performTask", function () {
  it("rejects when an error is thrown in the worker", function (done) {
    var prole = new Prole("./worker.js");
    prole.performTask("square", "hello").then(function (val) {
      expect(false).to.be.ok;
    }, function (e) {
      expect(e).to.be.ok;
      prole.destroy();
      done();
    });
  });

  it("rejects when the task name does not exist", function (done) {
    var prole = new Prole("./worker.js");
    prole.performTask("square???", 5).then(function (val) {
      expect(false).to.be.ok;
    }, function (e) {
      expect(e).to.be.ok;
      prole.destroy();
      done();
    });
  });

  it("throws when performing a task on a destroyed worker", function () {
    var prole = new Prole("./worker.js");
    prole.destroy();
    try {
      prole.performTask("square", 5).then(function (val) {
        expect(false).to.b.ok;
      });
      expect(false).to.be.ok;
    } catch (e) {
      expect(true).to.be.ok;
    }
  });

  it("returns primitives correctly", function (done) {
    var prole = new Prole("./worker.js");
    prole.performTask("square", 5).then(function (val) {
      expect(val).to.be.equal(25);
      prole.destroy();
      done();
    });
  });

  it("resolves promises correctly", function (done) {
    var prole = new Prole("./worker.js");
    prole.performTask("squarePromise", 5).then(function (val) {
      expect(val).to.be.equal(25);
      prole.destroy();
      done();
    });
  });

  it("rejects if returned a rejected promise", function (done) {
    var prole = new Prole("./worker.js");
    prole.performTask("myReject", 5).then(function (val) {
      expect(false).to.be.ok;
    }, function (e) {
      expect(e).to.be.ok;
      prole.destroy();
      done();
    });
  });

  it("rejects if returned an Error instance", function (done) {
    var prole = new Prole("./worker.js");
    prole.performTask("myError", 5).then(function (val) {
      expect(false).to.be.ok;
    }, function (e) {
      expect(e).to.be.ok;
      prole.destroy();
      done();
    });
  });

  it("correctly syncs up many async worker requests", function (done) {
    var prole = new Prole("./worker.js");
    var count = 0;

    for (var i = 0; i < 20; i++) {
      (function () {
      var num = i;
      setTimeout(function () {
      prole.performTask("square", num).then(function (val) {
        expect(val).to.be.equal(num * num);
        checkCount();
      });
      }, Math.random() / (num || 1));
      })();
    }

    function checkCount () {
      if (++count === 20) {
        prole.destroy();
        done();
      }
    }
  });
});
