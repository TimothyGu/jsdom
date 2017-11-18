"use strict";

const { splitOnASCIIWhitespace, splitOnCommas } = require("../helpers/strings");
const { reserializeCommaSeparatedTokens, reserializeSpaceSeparatedTokens } = require("../helpers/svg/basic-types");

class SVGTestsImpl {
  get requiredExtensions() {
    return this._window._core.SVGStringList.createImpl([], {
      element: this,
      attribute: "requiredExtensions"
    });
  }

  get systemLanguage() {
    return this._window._core.SVGStringList.createImpl([], {
      element: this,
      attribute: "systemLanguage"
    });
  }
}

SVGTestsImpl.attributeRegistry = new Map([
  // https://svgwg.org/svg2-draft/struct.html#RequiredExtensionsAttribute
  [
    "requiredExtensions", {
      getValue: splitOnASCIIWhitespace,
      serialize: reserializeSpaceSeparatedTokens,
      initialValue: undefined
    }
  ],
  // https://svgwg.org/svg2-draft/struct.html#SystemLanguageAttribute
  [
    "systemLanguage", {
      getValue: splitOnCommas,
      serialize: reserializeCommaSeparatedTokens,
      initialValue: undefined
    }
  ]
]);

exports.implementation = SVGTestsImpl;
