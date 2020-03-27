"use strict";

class DOMRectReadOnlyImpl {
  constructor(globalObject, [x = 0, y = 0, width = 0, height = 0], privateData) {
    this._globalObject = globalObject;
    this._x = x;
    this._y = y;
    this._width = width;
    this._height = height;

    // Reflection mode for SVG's viewBox.
    this._reflectedElement = privateData.reflectedElement;
    this._reflectedAttribute = privateData.reflectedAttribute;
    this._parser = privateData.parser;
  }

  get x() {
    if (this._reflectedElement) {
      const attr = this._reflectedElement.getAttributeNS(null, this._reflectedAttribute);
      return this._parser(attr).x;
    }
    return this._x;
  }

  get y() {
    if (this._reflectedElement) {
      const attr = this._reflectedElement.getAttributeNS(null, this._reflectedAttribute);
      return this._parser(attr).y;
    }
    return this._y;
  }

  get width() {
    if (this._reflectedElement) {
      const attr = this._reflectedElement.getAttributeNS(null, this._reflectedAttribute);
      return this._parser(attr).width;
    }
    return this._width;
  }

  get height() {
    if (this._reflectedElement) {
      const attr = this._reflectedElement.getAttributeNS(null, this._reflectedAttribute);
      return this._parser(attr).height;
    }
    return this._height;
  }

  get top() {
    const { height, y } = this;
    if (isNaN(height)) {
      return y;
    }
    return Math.min(y, y + height);
  }

  get right() {
    const { width, x } = this;
    if (isNaN(width)) {
      return x;
    }
    return Math.max(x, x + width);
  }

  get bottom() {
    const { height, y } = this;
    if (isNaN(height)) {
      return y;
    }
    return Math.max(y, y + height);
  }

  get left() {
    const { width, x } = this;
    if (isNaN(width)) {
      return x;
    }
    return Math.min(x, x + width);
  }
}

exports.implementation = DOMRectReadOnlyImpl;
