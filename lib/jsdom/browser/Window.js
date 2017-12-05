"use strict";

const webIDLConversions = require("webidl-conversions");
const idlUtils = require("../living/generated/utils");
const createWindowInterface = require("../living/generated/Window").createInterface;
const createXMLHttpRequest = require("../living/xmlhttprequest");
const createFileReader = require("../living/generated/FileReader").createInterface;

const dom = require("../living");

function createWindow(options) {
  const Window = createWindowInterface({});
  const window = Window.create([], { dom, options });
  Window.enableNamedPropertiesObject(window);
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

    const option = windowImpl._document.createElement("option");

    if (text !== "") {
      option.text = text;
    }
    if (value !== undefined) {
      option.setAttribute("value", value);
    }
    if (defaultSelected) {
      option.setAttribute("selected", "");
    }
    option._selectedness = selected;

    return idlUtils.wrapperForImpl(option);
  }
  Object.defineProperty(Option, "prototype", {
    value: dom.HTMLOptionElement.prototype,
    configurable: false,
    enumerable: false,
    writable: false
  });

  function Image() {
    const img = windowImpl._document.createElement("img");

    if (arguments.length > 0) {
      img.setAttribute("width", String(arguments[0]));
    }
    if (arguments.length > 1) {
      img.setAttribute("height", String(arguments[1]));
    }

    return idlUtils.wrapperForImpl(img);
  }
  Object.defineProperty(Image, "prototype", {
    value: dom.HTMLImageElement.prototype,
    configurable: false,
    enumerable: false,
    writable: false
  });

  function Audio(src) {
    const audio = windowImpl._document.createElement("audio");
    audio.setAttribute("preload", "auto");

    if (src !== undefined) {
      audio.setAttribute("src", String(src));
    }

    return idlUtils.wrapperForImpl(audio);
  }
  Object.defineProperty(Audio, "prototype", {
    value: dom.HTMLAudioElement.prototype,
    configurable: false,
    enumerable: false,
    writable: false
  });

  for (const ctor of [
    Window.interface,
    Option,
    Image,
    Audio,
    createFileReader({
      window: windowImpl
    }).interface,
    createXMLHttpRequest(windowImpl)
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
      windowImpl._virtualConsole.emit(method, ...args);
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

  return windowImpl;
}

module.exports = createWindow;
