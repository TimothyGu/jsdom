"use strict";

// Implementation classes of all Web IDL interfaces inherit from this class.
exports.implementation = class WebIDLInterfaceImpl {
  constructor(args, privateData) {
    // https://html.spec.whatwg.org/multipage/webappapis.html#concept-relevant-global
    // The relevant global object of the object.
    // However, such a name is cumbersome and not very precise. Thus, we may need to rename when runtime environments
    // where the global object is not referred to as "window" (i.e. workers of any sort).
    this._window = privateData.window;
  }
};
