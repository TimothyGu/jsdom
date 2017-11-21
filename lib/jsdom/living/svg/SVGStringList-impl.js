"use strict";

const { mixin } = require("../../utils");
const SVGListBase = require("./SVGListBase");
const WebIDLInterfaceImpl = require("../window/WebIDLInterfaceImpl").implementation;

class SVGStringListImpl extends WebIDLInterfaceImpl {
  constructor(args, privateData) {
    super([], privateData);

    this._initList(privateData);
  }
}

mixin(SVGStringListImpl.prototype, SVGListBase.prototype);

exports.implementation = SVGStringListImpl;
