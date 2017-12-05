"use strict";

const DOMException = require("domexception");
const { btoa, atob } = require("abab");

const reportException = require("../helpers/runtime-script-errors");

class WindowOrWorkerGlobalScopeImpl {
  _initTimers() {
    this._timers = Object.create(null);
    this._latestTimerId = 0;
  }

  _startTimer(startFn, stopFn, timerId, callback, ms, timerStorage, args) {
    if (!this || !this._document) {
      return undefined;
    }
    if (typeof callback !== "function") {
      const code = String(callback);
      callback = this._globalProxy.eval.bind(this, code + `\n//# sourceURL=${this.location.href}`);
    }

    const oldCallback = callback;
    callback = () => {
      try {
        oldCallback.apply(this._globalProxy, args);
      } catch (e) {
        reportException(this, e, this.location.href);
      }
    };

    const res = startFn(callback, ms);
    timerStorage[timerId] = [res, stopFn];
    return timerId;
  }

  _stopTimer(timerStorage, id) {
    const timer = timerStorage[id];
    if (timer) {
      // Need to .call() with undefined to ensure the thisArg is not timer itself
      timer[1].call(undefined, timer[0]);
      delete timerStorage[id];
    }
  }

  _stopTimers(timerStorage = this._timers) {
    Object.keys(timerStorage).forEach(key => {
      const timer = timerStorage[key];
      // Need to .call() with undefined to ensure the thisArg is not timer itself
      timer[1].call(undefined, timer[0]);
    });
  }

  _resetTimers() {
    this._latestTimerId = 0;
    this._timers = Object.create(null);
  }

  btoa() {
    const result = btoa(str);
    if (result === null) {
      throw new DOMException("The string to be encoded contains invalid characters.", "InvalidCharacterError");
    }
    return result;
  }

  atob() {
    const result = atob(str);
    if (result === null) {
      throw new DOMException("The string to be decoded contains invalid characters.", "InvalidCharacterError");
    }
    return result;
  }

  setTimeout(handler, timeout = 0, ...args) {
    return this._startTimer(setTimeout, clearTimeout, ++this._latestTimerId, handler, timeout, this._timers, args);
  }

  clearTimeout(handle = 0) {
    this._stopTimer(this._timers, handle);
  }

  setInterval(handler, timeout = 0, ...args) {
    return this._startTimer(setInterval, clearInterval, ++this._latestTimerId, handler, timeout, this._timers, args);
  }

  clearInterval(handle = 0) {
    this._stopTimer(this._timers, handle);
  }
}

exports.implementation = WindowOrWorkerGlobalScopeImpl;
