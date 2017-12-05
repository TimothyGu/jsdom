"use strict";

// Browserify's process implementation doesn't have hrtime, and this package is small so not much of a burden for
// Node.js users.
const hrtime = require("browser-process-hrtime");
const cssom = require("cssom");
const { CSSStyleDeclaration } = require("cssstyle");

const { domSymbolTree } = require("../helpers/internal-constants");
const { isValidTargetOrigin, mixin } = require("../../utils");
const NODE_TYPE = require("../node-type");
const notImplemented = require("../../browser/not-implemented");
const SessionHistory = require("./SessionHistory");
const VirtualConsole = require("../../virtual-console");
const { contextifyWindow } = require("../../browser/documentfeatures");

const idlUtils = require("../generated/utils");
const EventTargetImpl = require("../events/EventTarget-impl").implementation;
const { matchesDontThrow } = require("../helpers/selectors");
const GlobalEventHandlersImpl = require("../nodes/GlobalEventHandlers-impl").implementation;
const WindowEventHandlersImpl = require("../nodes/WindowEventHandlers-impl").implementation;
const WindowOrWorkerGlobalScopeImpl = require("./WindowOrWorkerGlobalScope-impl").implementation;

const Document = require("../generated/Document");
const External = require("../generated/External");
const HTMLCollection = require("../generated/HTMLCollection");
const MessageEventInit = require("../generated/MessageEventInit");
const Navigator = require("../generated/Navigator");
const Screen = require("../generated/Screen");

const cssSelectorSplitRE = /((?:[^,"']|"[^"]*"|'[^']*')+)/;

const defaultStyleSheet = cssom.parse(require("../../browser/default-stylesheet"));

class WindowImpl extends EventTargetImpl {
  constructor(args, privateData) {
    super(args, privateData);
    const { dom, options } = privateData;
    this._core = dom;

    // See https://lists.w3.org/Archives/Public/public-script-coord/2015JanMar/0109.html
    this.addEventListener = this.addEventListener.bind(this);
    this.removeEventListener = this.removeEventListener.bind(this);
    this.dispatchEvent = this.dispatchEvent.bind(this);

    this._initGlobalEvents();
    this._initTimers();

    this._wrapper = privateData.wrapper;
    // vm initialization is deferred until script processing is activated
    // NEVER assume _globalProxy is constant; i.e. never store a reference to _globalProxy as it is at this moment.
    this._globalProxy = privateData.wrapper;
    this._runScripts = options.runScripts;

    // This implements window.frames.length, since window.frames returns a
    // self reference to the window object.  This value is incremented in the
    // HTMLFrameElement implementation.
    this._length = 0;

    // These references can be corrected by frame/iframe code.
    this._top = this;
    this._parent = this;
    this._frameElement = null;

    // List options explicitly to be clear which are passed through
    this._document = Document.createImpl([], {
      core: dom,
      options: {
        parsingMode: options.parsingMode,
        contentType: options.contentType,
        encoding: options.encoding,
        cookieJar: options.cookieJar,
        url: options.url,
        lastModified: options.lastModified,
        referrer: options.referrer,
        cookie: options.cookie,
        deferClose: options.deferClose,
        resourceLoader: options.resourceLoader,
        concurrentNodeIterators: options.concurrentNodeIterators,
        pool: options.pool,
        agent: options.agent,
        agentClass: options.agentClass,
        agentOptions: options.agentOptions,
        strictSSL: options.strictSSL,
        proxy: options.proxy,
        parseOptions: options.parseOptions,
        defaultView: this
      }
    });

    // https://html.spec.whatwg.org/#session-history
    this._sessionHistory = new SessionHistory({
      document: this._document,
      url: this._document._URL,
      stateObject: null
    }, this);

    // TODO NEWAPI can remove this
    if (options.virtualConsole) {
      if (options.virtualConsole instanceof VirtualConsole) {
        this._virtualConsole = options.virtualConsole;
      } else {
        throw new TypeError("options.virtualConsole must be a VirtualConsole (from createVirtualConsole)");
      }
    } else {
      this._virtualConsole = new VirtualConsole();
    }

    this.name = "nodejs";
    this.status = "";

    this.navigator = Navigator.createImpl([], {
      userAgent: options.userAgent
    });

    // TODO
    this._pretendToBeVisual = options.pretendToBeVisual;
    this._animationFrameCallbacks = Object.create(null);
    this._initializedTime = hrtime();
    this._latestAnimationFrameCallbackId = 0;

    this.external = External.createImpl();

    this._screen = Screen.createImpl();

    if (options.runScripts === "outside-only" || options.runScripts === "dangerously") {
      contextifyWindow(this);
    }
  }

  static init(impl) {
    Object.defineProperty(impl, idlUtils.wrapperSymbol, { get: () => impl._globalProxy });
  }

  _stopAllTimers() {
    this._stopTimers();
    this._resetTimers();

    this._stopTimers(this._animationFrameCallbacks);
    this._latestAnimationFrameCallbackId = 0;
    this._animationFrameCallbacks = Object.create(null);
  }

  // No need to return this._globalProxy since the wrapper object is set to the global proxy.
  get window() {
    return this;
  }

  get self() {
    return this;
  }

  get document() {
    return this._document;
  }

  // name is a data property

  get location() {
    return this._document._location;
  }

  get history() {
    return this._document._history;
  }

  // status is a data property

  close() {
    // Recursively close child frame windows, then ourselves.
    const currentWindow = this;
    // TODO
    (function windowCleaner(windowToClean) {
      for (let i = 0; i < windowToClean.length; i++) {
        windowCleaner(windowToClean[i]);
      }

      // We"re already in our own window.close().
      if (windowToClean !== currentWindow) {
        windowToClean.close();
      }
    }(this));

    // Clear out all listeners. Any in-flight or upcoming events should not get delivered.
    this._eventListeners = Object.create(null);

    if (this._document) {
      const { body, _requestManager } = this._document
      if (body) {
        body.innerHTML = "";
      }

      if (this._document.close) {
        // It's especially important to clear out the listeners here because document.close() causes a "load" event to
        // fire.
        this._document._eventListeners = Object.create(null);
        this._document.close();
      }
      if (_requestManager) {
        _requestManager.close();
      }
      this._document = null;
    }

    this._stopAllTimers();
  }

  stop() {
    if (this._document) {
      const manager = this._document._requestManager;
      if (manager) {
        manager.close();
      }
    }
  }

  get frames() {
    return this;
  }

  get length() {
    return this._length;
  }

  get top() {
    return this._top;
  }

  get parent() {
    return this._parent;
  }

  get frameElement() {
    return this._frameElement;
  }

  _namedObjects(name, elementsOnly = false) {
    const results = [];
    for (const node of domSymbolTree.treeIterator(this._document)) {
      if (node.nodeType !== NODE_TYPE.ELEMENT_NODE) continue;
      if (node.namespaceURI !== "http://www.w3.org/1999/xhtml") continue;

      switch (node.nodeName) {
        // These two elements are the only elements in jsdom that support nested browsing contexts right now.
        case "IFRAME":
        case "FRAME":
          // Due to the fact that our <iframe> doesn't currently implement name content attribute reflection to child
          // window.name, we are going to allow checking the <iframe>'s name content attribute as well.
          if (!elementsOnly &&
              node.contentWindow && (node.contentWindow.name === name || node.getAttribute("name") === name)) {
            return node.contentWindow;
          }
          break;

        case "EMBED":
        case "FORM":
        case "FRAMESET":
        case "IMG":
        case "OBJECT":
          if (node.getAttribute("name") === name) {
            results.push(node);
            continue;
          }
      }

      if (node.getAttribute("id") === name) {
        results.push(node);
      }
    }
    return results;
  }

  [idlUtils.namedGet](name) {
    const objects = this._namedObjects(name);
    if (!Array.isArray(objects)) {
      // WindowProxy of the first nested browsing context
      return objects;
    }
    if (objects.length === 0) {
      return null;
    }
    if (objects.length === 1) {
      return objects[0];
    }
    return HTMLCollection.createImpl([], {
      element: this._document.documentElement,
      query: this._namedObjects.bind(this, name, true)
    });
  }

  requestAnimationFrame(callback) {
    const hr = hrtime(windowInitialized);
    const hrInMicro = hr[0] * 1e3 + hr[1] / 1e6;
    const fps = 1000 / 60;

    return this._startTimer(
      setTimeout,
      clearTimeout,
      ++this._latestAnimationFrameCallbackId,
      callback,
      fps,
      this._animationFrameCallbacks,
      [hrInMicro]
    );
  }

  cancelAnimationFrame(handle) {
    this._stopTimer(this._animationFrameCallbacks, handle);
  }

  postMessage(message, targetOrigin, transfer = []) {
    if (!isValidTargetOrigin(targetOrigin)) {
      throw new DOMException("Failed to execute 'postMessage' on 'Window': " +
        `Invalid target origin '${targetOrigin}' in a call to 'postMessage'.`, "SyntaxError");
    }

    // TODO: targetOrigin === '/' - requires reference to source window
    // See https://github.com/tmpvar/jsdom/pull/1140#issuecomment-111587499
    if (targetOrigin !== "*" && targetOrigin !== this.location.origin) {
      return;
    }

    // TODO: event.source - requires reference to source window
    // TODO: event.origin - requires reference to source window
    // TODO: event.ports
    // TODO: event.data - structured clone message - requires cloning DOM nodes
    const event = MessageEvent.createImpl(["message", MessageEventInit.convert({ data: message })]);

    event.initEvent("message", false, false);

    setTimeout(() => {
      this.dispatchEvent(event);
    }, 0);
  }

  // The captureEvents() and releaseEvents() methods must do nothing
  captureEvents() {}

  releaseEvents() {}

  // TODO: pseudoelements
  getComputedStyle(elt, pseudoElt = null) {
    const s = node.style;
    const cs = new CSSStyleDeclaration();
    const { forEach } = Array.prototype;

    function setPropertiesFromRule(rule) {
      if (!rule.selectorText) {
        return;
      }

      const selectors = rule.selectorText.split(cssSelectorSplitRE);
      let matched = false;
      for (const selectorText of selectors) {
        if (selectorText !== "" && selectorText !== "," && !matched && matchesDontThrow(elt, selectorText)) {
          matched = true;
          forEach.call(rule.style, property => {
            cs.setProperty(property, rule.style.getPropertyValue(property), rule.style.getPropertyPriority(property));
          });
        }
      }
    }

    function readStylesFromStyleSheet(sheet) {
      forEach.call(sheet.cssRules, rule => {
        if (rule.media) {
          if (Array.prototype.indexOf.call(rule.media, "screen") !== -1) {
            forEach.call(rule.cssRules, setPropertiesFromRule);
          }
        } else {
          setPropertiesFromRule(rule);
        }
      });
    }

    readStylesFromStyleSheet(defaultStyleSheet);
    forEach.call(node.ownerDocument.styleSheets, readStylesFromStyleSheet);

    forEach.call(s, property => {
      cs.setProperty(property, s.getPropertyValue(property), s.getPropertyPriority(property));
    });

    return cs;
  }
}

function notImplementedMethod(name) {
  return function() {
    notImplemented(name, this);
  };
}

Object.assign(WindowImpl.prototype, {
  focus: notImplementedMethod("window.focus"),
  blur: notImplementedMethod("window.blur"),

  open: notImplementedMethod("window.open"),

  alert: notImplementedMethod("window.alert"),
  confirm: notImplementedMethod("window.confirm"),
  prompt: notImplementedMethod("window.prompt"),
  print: notImplementedMethod("window.print"),

  moveTo: notImplementedMethod("window.moveTo"),
  moveBy: notImplementedMethod("window.moveBy"),
  resizeTo: notImplementedMethod("window.resizeTo"),
  resizeBy: notImplementedMethod("window.resizeBy"),

  innerWidth: 1024,
  innerHeight: 768,

  scrollX: 0,
  pageXOffset: 0,
  scrollY: 0,
  pageYOffset: 0,
  scroll: notImplementedMethod("window.scroll"),
  scrollTo: notImplementedMethod("window.scrollTo"),
  scrollBy: notImplementedMethod("window.scrollBy"),

  screenX: 0,
  screenY: 0,
  outerWidth: 1024,
  outerHeight: 1024,
  devicePixelRatio: 1,

  // Not sure where these are specified but kept for compatibility.
  screenLeft: 0,
  screenTop: 0,
  scrollTop: 0,
  scrollLeft: 0,
  createPopup: notImplementedMethod("window.createPopup"),
});

mixin(WindowImpl.prototype, GlobalEventHandlersImpl.prototype);
mixin(WindowImpl.prototype, WindowEventHandlersImpl.prototype);
mixin(WindowImpl.prototype, WindowOrWorkerGlobalScopeImpl.prototype);

exports.implementation = WindowImpl;
