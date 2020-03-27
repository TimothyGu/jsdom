/* eslint-disable no-console, no-process-exit */

"use strict";

const path = require("path");
const fs = require("fs");
const rimraf = require("rimraf");
const { XLINK_NS } = require("../../lib/jsdom/living/helpers/namespaces");

const Webidl2js = require("webidl2js");

function isSimpleIDLType(idlType, expected) {
  if (idlType.generic !== "" || idlType.union) {
    return false;
  }
  return idlType.idlType === expected;
}

const transformer = new Webidl2js({
  implSuffix: "-impl",
  suppressErrors: true,
  processCEReactions(code) {
    const preSteps = this.addImport("../helpers/custom-elements", "ceReactionsPreSteps");
    const postSteps = this.addImport("../helpers/custom-elements", "ceReactionsPostSteps");

    return `
      ${preSteps}(globalObject);
      try {
        ${code}
      } finally {
        ${postSteps}(globalObject);
      }
    `;
  },
  processHTMLConstructor() {
    const identifier = this.addImport("../helpers/html-constructor", "HTMLConstructor");

    return `
      return ${identifier}(globalObject, interfaceName, new.target);
    `;
  },
  // https://html.spec.whatwg.org/multipage/common-dom-interfaces.html#reflecting-content-attributes-in-idl-attributes
  // https://svgwg.org/svg2-draft/types.html#TermReflect
  processReflect(idl, implObj) {
    const reflectAttr = idl.extAttrs.find(attr => attr.name === "Reflect");
    const attrName = (reflectAttr && reflectAttr.rhs && JSON.parse(reflectAttr.rhs.value)) || idl.name.toLowerCase();

    if (idl.extAttrs.find(attr => attr.name === "ReflectURL")) {
      checkAttributeNamespace(attrName);

      // Allow DOMString also due to https://github.com/whatwg/html/issues/5241.
      if (!isSimpleIDLType(idl.idlType, "USVString") && !isSimpleIDLType(idl.idlType, "DOMString")) {
        throw new Error("[ReflectURL] specified on non-USV/DOMString attribute");
      }
      const parseURLToResultingURLRecord =
        this.addImport("../helpers/document-base-url", "parseURLToResultingURLRecord");
      const serializeURL = this.addImport("whatwg-url", "serializeURL");
      return {
        get: `
          const value = ${implObj}.getAttributeNS(null, "${attrName}");
          if (value === null) {
            return "";
          }
          const urlRecord = ${parseURLToResultingURLRecord}(value, ${implObj}._ownerDocument);
          if (urlRecord !== null) {
            return ${serializeURL}(urlRecord);
          }
          return conversions.USVString(value);
        `,
        set: `
          ${implObj}.setAttributeNS(null, "${attrName}", V);
        `
      };
    }

    if (isSimpleIDLType(idl.idlType, "DOMString") || isSimpleIDLType(idl.idlType, "USVString")) {
      checkAttributeNamespace(attrName);

      const isUSV = isSimpleIDLType(idl.idlType, "USVString");
      return {
        get: `
          const value = ${implObj}.getAttributeNS(null, "${attrName}");
          return value === null ? "" : ${isUSV ? "conversions.USVString(value)" : "value"};
        `,
        set: `
          ${implObj}.setAttributeNS(null, "${attrName}", V);
        `
      };
    }

    if (isSimpleIDLType(idl.idlType, "boolean")) {
      checkAttributeNamespace(attrName);

      return {
        get: `
          return ${implObj}.hasAttributeNS(null, "${attrName}");
        `,
        set: `
          if (V) {
            ${implObj}.setAttributeNS(null, "${attrName}", "");
          } else {
            ${implObj}.removeAttributeNS(null, "${attrName}");
          }
        `
      };
    }

    if (isSimpleIDLType(idl.idlType, "long")) {
      const parseInteger = this.addImport("../helpers/strings", "parseInteger");
      checkAttributeNamespace(attrName);

      return {
        get: `
          let value = ${implObj}.getAttributeNS(null, "${attrName}");
          if (value === null) {
            return 0;
          }
          value = ${parseInteger}(value);
          return value !== null && conversions.long(value) === value ? value : 0;
        `,
        set: `
          ${implObj}.setAttributeNS(null, "${attrName}", String(V));
        `
      };
    }

    if (isSimpleIDLType(idl.idlType, "unsigned long")) {
      const parseNonNegativeInteger = this.addImport("../helpers/strings", "parseNonNegativeInteger");
      checkAttributeNamespace(attrName);

      return {
        get: `
          let value = ${implObj}.getAttributeNS(null, "${attrName}");
          if (value === null) {
            return 0;
          }
          value = ${parseNonNegativeInteger}(value);
          return value !== null && value >= 0 && value <= 2147483647 ? value : 0;
        `,
        set: `
          const n = V <= 2147483647 ? V : 0;
          ${implObj}.setAttributeNS(null, "${attrName}", String(n));
        `
      };
    }

    if (isSimpleIDLType(idl.idlType, "SVGAnimatedString")) {
      const SVGAnimatedString = this.addImport("./SVGAnimatedString");
      checkAttributeNamespace(attrName);
      const deprecatedAttr = extractAttributeInfo(getExtAttrValue("ReflectDeprecated"));
      const initialValue = getExtAttrValue("ReflectInitial");
      if (initialValue !== undefined && typeof initialValue !== "string") {
        throw new Error("Initial value of SVGAnimatedString must be a string");
      }

      return {
        get: `
          return ${SVGAnimatedString}.create(globalObject, [], {
            element: ${implObj},
            attribute: "${attrName}",
            ${deprecatedAttr !== undefined ?
              `attributeDeprecatedNamespace: ${JSON.stringify(deprecatedAttr.ns)},
               attributeDeprecated: ${JSON.stringify(deprecatedAttr.name)},` :
              ""}
            ${initialValue !== undefined ?
              `initialValue: ${JSON.stringify(initialValue)},` :
              ""}
          });
        `
      };
    }

    if (isSimpleIDLType(idl.idlType, "SVGAnimatedPreserveAspectRatio")) {
      const SVGAnimatedPreserveAspectRatio = this.addImport("./SVGAnimatedPreserveAspectRatio");
      if (attrName !== "preserveAspectRatio") {
        throw new Error("SVGAnimatedPreserveAspectRatio can only be used with the preserveAspectRatio attribute");
      }

      return {
        get: `
          return ${SVGAnimatedPreserveAspectRatio}.create(globalObject, [], {
            element: ${implObj}
          });
        `
      };
    }

    if (isSimpleIDLType(idl.idlType, "SVGAnimatedRect")) {
      const SVGAnimatedRect = this.addImport("./SVGAnimatedRect");
      checkAttributeNamespace(attrName);

      return {
        get: `
          return ${SVGAnimatedRect}.create(globalObject, [], {
            element: ${implObj},
            attribute: "${attrName}"
          });
        `
      };
    }

    throw new Error("Unrecognized reflection type " + idl.idlType.idlType);

    function getExtAttrValue(extAttrName) {
      const reflectDeprecatedAttr = idl.extAttrs.find(extAttr => extAttr.name === extAttrName);
      if (reflectDeprecatedAttr) {
        return JSON.parse(reflectDeprecatedAttr.rhs.value);
      }
      return undefined;
    }

    function checkAttributeNamespace(attr) {
      if (attr.includes(":")) {
        throw new Error(`Namespace not supported for attribute ${attr}`);
      }
    }

    function extractAttributeInfo(attr) {
      if (attr === undefined) {
        return undefined;
      }

      const parts = attr.split(":");
      if (parts.length === 1) {
        return { ns: null, name: parts[0] };
      }
      if (parts.length === 2) {
        let ns;
        if (parts[0] === "xlink") {
          ns = XLINK_NS;
        } else {
          throw new Error(`Unrecognized attribute namespace name ${parts[0]}`);
        }
        return { ns, name: parts[1] };
      }
      throw new Error(`Invalid attribute "${attr}"`);
    }
  }
});

function addDir(dir) {
  const resolved = path.resolve(__dirname, dir);
  transformer.addSource(resolved, resolved);
}

addDir("../../lib/jsdom/living/aborting");
addDir("../../lib/jsdom/living/attributes");
addDir("../../lib/jsdom/living/constraint-validation");
addDir("../../lib/jsdom/living/cssom");
addDir("../../lib/jsdom/living/custom-elements");
addDir("../../lib/jsdom/living/domparsing");
addDir("../../lib/jsdom/living/events");
addDir("../../lib/jsdom/living/fetch");
addDir("../../lib/jsdom/living/file-api");
addDir("../../lib/jsdom/living/geometry");
addDir("../../lib/jsdom/living/hr-time");
addDir("../../lib/jsdom/living/mutation-observer");
addDir("../../lib/jsdom/living/navigator");
addDir("../../lib/jsdom/living/nodes");
addDir("../../lib/jsdom/living/range");
addDir("../../lib/jsdom/living/selection");
addDir("../../lib/jsdom/living/svg");
addDir("../../lib/jsdom/living/traversal");
addDir("../../lib/jsdom/living/websockets");
addDir("../../lib/jsdom/living/webstorage");
addDir("../../lib/jsdom/living/window");
addDir("../../lib/jsdom/living/xhr");

const outputDir = path.resolve(__dirname, "../../lib/jsdom/living/generated/");

// Clean up any old stuff lying around.
rimraf.sync(outputDir);
fs.mkdirSync(outputDir);

transformer.generate(outputDir)
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
