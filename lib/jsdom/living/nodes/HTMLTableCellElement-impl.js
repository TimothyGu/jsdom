"use strict";

const HTMLElementImpl = require("./HTMLElement-impl").implementation;

const closest = require("../helpers/traversal").closest;

class HTMLTableCellImpl extends HTMLElementImpl {
  get colSpan() {
    const value = this.getAttribute("colspan");
    if (value === null) {
      return 1;
    }
    const parsed = parseInt(value);
    if (isNaN(parsed)) {
      return 1;
    }
    if (parsed < 1) {
      return 1;
    }
    if (parsed > 1000) {
      return 1000;
    }
    return parsed;
  }

  set colSpan(V) {
    this.setAttribute("colspan", String(V));
  }

  get rowSpan() {
    const value = this.getAttribute("rowspan");
    if (value === null) {
      return 1;
    }
    const parsed = parseInt(value);
    if (isNaN(parsed)) {
      return 1;
    }
    if (parsed < 0) {
      return 0;
    }
    if (parsed > 65534) {
      return 65534;
    }
    return parsed;
  }

  set rowSpan(V) {
    this.setAttribute("rowspan", String(V));
  }

  get cellIndex() {
    const tr = closest(this, "tr", "http://www.w3.org/1999/xhtml");
    if (tr === null) {
      return -1;
    }

    return tr.cells.indexOf(this);
  }

  get scope() {
    // TODO: This logic should only apply to <th>, not <td>, since only <th> defines the scope attribute and its states.
    // But Firefox and Chrome alike seem to apply it to <td> as well.
    // https://html.spec.whatwg.org/#attr-th-scope
    const value = this.getAttribute("scope");
    if (value === "row" || value === "col" || value === "rowgroup" || value === "colgroup") {
      return value;
    }

    return "";
  }

  set scope(V) {
    this.setAttribute("scope", V);
  }
}

module.exports = {
  implementation: HTMLTableCellImpl
};
