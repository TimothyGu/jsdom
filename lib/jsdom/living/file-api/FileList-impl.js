"use strict";

const idlUtils = require("../generated/utils.js");
const WebIDLInterfaceImpl = require("../window/WebIDLInterfaceImpl").implementation;

exports.implementation = class FileListImpl extends WebIDLInterfaceImpl {
  constructor(args, privateData) {
    super(args, privateData);

    this._list = [];
  }
  get length() {
    return this._list.length;
  }
  item(index) {
    return this._list[index] || null;
  }
  get [idlUtils.supportedPropertyIndices]() {
    return this._list.keys();
  }
};
