"use strict";

const DOMException = require("domexception");
const idlUtils = require("../generated/utils");
const { addNwmatcher } = require("../helpers/selectors");
const { domSymbolTree } = require("../helpers/internal-constants");
const NODE_TYPE = require("../node-type");
const { memoizeQuery } = require("../../utils");

class ParentNodeImpl {
  get children() {
    if (!this._childrenList) {
      this._childrenList = this._window._core.HTMLCollection.createImpl([], {
        element: this,
        query: () => domSymbolTree.childrenToArray(this, {
          filter: node => node.nodeType === NODE_TYPE.ELEMENT_NODE
        })
      });
    } else {
      this._childrenList._update();
    }
    return this._childrenList;
  }

  get firstElementChild() {
    for (const child of domSymbolTree.childrenIterator(this)) {
      if (child.nodeType === NODE_TYPE.ELEMENT_NODE) {
        return child;
      }
    }

    return null;
  }

  get lastElementChild() {
    for (const child of domSymbolTree.childrenIterator(this, { reverse: true })) {
      if (child.nodeType === NODE_TYPE.ELEMENT_NODE) {
        return child;
      }
    }

    return null;
  }

  get childElementCount() {
    return this.children.length;
  }
}

ParentNodeImpl.prototype.querySelector = memoizeQuery(function (selectors) {
  if (shouldAlwaysSelectNothing(this)) {
    return null;
  }
  const matcher = addNwmatcher(this);

  try {
    return idlUtils.implForWrapper(matcher.first(selectors, idlUtils.wrapperForImpl(this)));
  } catch (e) {
    throw new DOMException(e.message, "SyntaxError");
  }
});

ParentNodeImpl.prototype.querySelectorAll = memoizeQuery(function (selectors) {
  if (shouldAlwaysSelectNothing(this)) {
    return this._window._core.NodeList.createImpl([], { nodes: [] });
  }
  const matcher = addNwmatcher(this);

  let list;
  try {
    list = matcher.select(selectors, idlUtils.wrapperForImpl(this));
  } catch (e) {
    throw new DOMException(e.message, "SyntaxError");
  }

  return this._window._core.NodeList.createImpl([], { nodes: list.map(n => idlUtils.tryImplForWrapper(n)) });
});

function shouldAlwaysSelectNothing(elImpl) {
  // The latter clause is true during initialization.
  return !domSymbolTree.hasChildren(elImpl) || (elImpl === elImpl._ownerDocument && !elImpl.documentElement);
}

module.exports = {
  implementation: ParentNodeImpl
};
