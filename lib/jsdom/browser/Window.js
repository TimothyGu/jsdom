"use strict";

const webIDLConversions = require("webidl-conversions");
const idlUtils = require("../living/generated/utils");
const createWindowInterface = require("../living/generated/Window").createInterface;
const createXMLHttpRequest = require("../living/xmlhttprequest");
const createFileReader = require("../living/generated/FileReader").createInterface;
const { contextifyWindow } = require("./documentfeatures.js");

const dom = require("../living");

function createWindow(options) {
  const defaultPrivateData = {};
  const Window = createWindowInterface(defaultPrivateData);
  const window = Window.create([], { dom, options });
  const windowImpl = idlUtils.implForWrapper(window);

  ///// INTERFACES FROM THE DOM
  for (const name in dom) {
    Object.defineProperty(window, name, {
      enumerable: false,
      configurable: true,
      writable: true,
      value: dom[name]
    });
  }

  if (options._runScripts === "outside-only" || options._runScripts === "dangerously") {
    contextifyWindow(window);
  }

  ///// EXTRA DOM INTERFACES
  function Option(text, value, defaultSelected, selected) {
    if (text === undefined) {
      text = "";
    }
    text = webIDLConversions.DOMString(text);

    if (value !== undefined) {
      value = webIDLConversions.DOMString(value);
    }

    defaultSelected = webIDLConversions.boolean(defaultSelected);
    selected = webIDLConversions.boolean(selected);

    const option = window._document.createElement("option");
    const impl = idlUtils.implForWrapper(option);

    if (text !== "") {
      impl.text = text;
    }
    if (value !== undefined) {
      impl.setAttribute("value", value);
    }
    if (defaultSelected) {
      impl.setAttribute("selected", "");
    }
    impl._selectedness = selected;

    return option;
  }
  Object.defineProperty(Option, "prototype", {
    value: dom.HTMLOptionElement.prototype,
    configurable: false,
    enumerable: false,
    writable: false
  });

  function Image() {
    const img = window._document.createElement("img");
    const impl = idlUtils.implForWrapper(img);

    if (arguments.length > 0) {
      impl.setAttribute("width", String(arguments[0]));
    }
    if (arguments.length > 1) {
      impl.setAttribute("height", String(arguments[1]));
    }

    return img;
  }
  Object.defineProperty(Image, "prototype", {
    value: dom.HTMLImageElement.prototype,
    configurable: false,
    enumerable: false,
    writable: false

  functio Audio(src) {
    const audio = window._document.createElement("audio");
    const impl = idlUtils.implForWrapper(audio);
    impl.setAttribute("preload", "auto");

    if (src !== undefined) {
      impl.setAttribute("src", String(src));
    }

    return audio;
  }
  Object.defineProperty(Audio, "prototype", {
    value: dom.HTMLAudioElement.prototype,
    configurable: false,
    enumerable: false,
    writable: false
  });

  for (const ctor of [
    Window: Window.interface,
    Option,
    Image,
    Audio,
    FileReader: createFileReader({
      window: windowImpl
    }).interface,
    XMLHttpRequest: createXMLHttpRequest(windowImpl)
  ]) {
    Object.defineProperty(window, ctor.name, {
      enumerable: false,
      configurable: true,
      writable: true,
      value: ctor
    });
  }

  // TODO: necessary for Blob and FileReader due to different-globals weirdness; investigate how to avoid this.
  window.ArrayBuffer = ArrayBuffer;
  window.Int8Array = Int8Array;
  window.Uint8Array = Uint8Array;
  window.Uint8ClampedArray = Uint8ClampedArray;
  window.Int16Array = Int16Array;
  window.Uint16Array = Uint16Array;
  window.Int32Array = Int32Array;
  window.Uint32Array = Uint32Array;
  window.Float32Array = Float32Array;
  window.Float64Array = Float64Array;

  ///// PUBLIC DATA PROPERTIES (TODO: should be getters)

  function wrapConsoleMethod(method) {
    return (...args) => {
      window._virtualConsole.emit(method, ...args);
    };
  }

  window.console = {
    assert: wrapConsoleMethod("assert"),
    clear: wrapConsoleMethod("clear"),
    count: wrapConsoleMethod("count"),
    debug: wrapConsoleMethod("debug"),
    error: wrapConsoleMethod("error"),
    group: wrapConsoleMethod("group"),
    groupCollapsed: wrapConsoleMethod("groupCollapsed"),
    groupEnd: wrapConsoleMethod("groupEnd"),
    info: wrapConsoleMethod("info"),
    log: wrapConsoleMethod("log"),
    table: wrapConsoleMethod("table"),
    time: wrapConsoleMethod("time"),
    timeEnd: wrapConsoleMethod("timeEnd"),
    trace: wrapConsoleMethod("trace"),
    warn: wrapConsoleMethod("warn")
  };

  ///// INITIALIZATION

  process.nextTick(() => {
    if (!window.document) {
      return; // window might've been closed already
    }

    if (window.document.readyState === "complete") {
      const ev = window.document.createEvent("HTMLEvents");
      ev.initEvent("load", false, false);
      window.dispatchEvent(ev);
    } else {
      window.document.addEventListener("load", () => {
        const ev = window.document.createEvent("HTMLEvents");
        ev.initEvent("load", false, false);
        window.dispatchEvent(ev);
      });
    }
  });

  return {
    window,
    windowImpl
  }
}

module.exports = createWindow;
