"use strict";

const WebIDLInterfaceImpl = require("./WebIDLInterfaceImpl").implementation;

// https://html.spec.whatwg.org/multipage/obsolete.html#dom-external
exports.implementation = class ExternalImpl extends WebIDLInterfaceImpl {
  // The AddSearchProvider() and IsSearchProviderInstalled() methods must do nothing
  AddSearchProvider() {}

  IsSearchProviderInstalled() {}
};
