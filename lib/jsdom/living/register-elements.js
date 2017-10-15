"use strict";
/* eslint global-require: 0 */

const DocumentImpl = require("./nodes/Document-impl.js");

const mappings = {
  // https://html.spec.whatwg.org/multipage/dom.html#elements-in-the-dom%3Aelement-interface
  // https://html.spec.whatwg.org/multipage/indices.html#elements-3
  "http://www.w3.org/1999/xhtml": {
    HTMLElement: {
      tags: [
        "abbr",
        "acronym",
        "address",
        "article",
        "aside",
        "b",
        "basefont",
        "bdi",
        "bdo",
        "big",
        "center",
        "cite",
        "code",
        "dd",
        "dfn",
        "dt",
        "em",
        "figcaption",
        "figure",
        "footer",
        "header",
        "hgroup",
        "i",
        "kbd",
        "main",
        "mark",
        "nav",
        "nobr",
        "noembed",
        "noframes",
        "noscript",
        "plaintext",
        "rb",
        "rp",
        "rt",
        "rtc",
        "ruby",
        "s",
        "samp",
        "section",
        "small",
        "strike",
        "strong",
        "sub",
        "summary",
        "sup",
        "tt",
        "u",
        "var",
        "wbr"
      ]
    },
    HTMLAnchorElement: {
      tags: ["a"]
    },
    HTMLAppletElement: {
      tags: ["applet"]
    },
    HTMLAreaElement: {
      tags: ["area"]
    },
    HTMLAudioElement: {
      tags: ["audio"]
    },
    HTMLBaseElement: {
      tags: ["base"]
    },
    HTMLBodyElement: {
      tags: ["body"]
    },
    HTMLBRElement: {
      tags: ["br"]
    },
    HTMLButtonElement: {
      tags: ["button"]
    },
    HTMLCanvasElement: {
      tags: ["canvas"]
    },
    HTMLDataElement: {
      tags: ["data"]
    },
    HTMLDataListElement: {
      tags: ["datalist"]
    },
    HTMLDetailsElement: {
      tags: ["details"]
    },
    HTMLDialogElement: {
      tags: ["dialog"]
    },
    HTMLDirectoryElement: {
      tags: ["dir"]
    },
    HTMLDivElement: {
      tags: ["div"]
    },
    HTMLDListElement: {
      tags: ["dl"]
    },
    HTMLEmbedElement: {
      tags: ["embed"]
    },
    HTMLFieldSetElement: {
      tags: ["fieldset"]
    },
    HTMLFontElement: {
      tags: ["font"]
    },
    HTMLFormElement: {
      tags: ["form"]
    },
    HTMLFrameElement: {
      tags: ["frame"]
    },
    HTMLFrameSetElement: {
      tags: ["frameset"]
    },
    HTMLHeadingElement: {
      tags: ["h1", "h2", "h3", "h4", "h5", "h6"]
    },
    HTMLHeadElement: {
      tags: ["head"]
    },
    HTMLHRElement: {
      tags: ["hr"]
    },
    HTMLHtmlElement: {
      tags: ["html"]
    },
    HTMLIFrameElement: {
      tags: ["iframe"]
    },
    HTMLImageElement: {
      tags: ["img"]
    },
    HTMLInputElement: {
      tags: ["input"]
    },
    HTMLLabelElement: {
      tags: ["label"]
    },
    HTMLLegendElement: {
      tags: ["legend"]
    },
    HTMLLIElement: {
      tags: ["li"]
    },
    HTMLLinkElement: {
      tags: ["link"]
    },
    HTMLMapElement: {
      tags: ["map"]
    },
    HTMLMarqueeElement: {
      tags: ["marquee"]
    },
    HTMLMediaElement: {
      tags: []
    },
    HTMLMenuElement: {
      tags: ["menu"]
    },
    HTMLMetaElement: {
      tags: ["meta"]
    },
    HTMLMeterElement: {
      tags: ["meter"]
    },
    HTMLModElement: {
      tags: ["del", "ins"]
    },
    HTMLObjectElement: {
      tags: ["object"]
    },
    HTMLOListElement: {
      tags: ["ol"]
    },
    HTMLOptGroupElement: {
      tags: ["optgroup"]
    },
    HTMLOptionElement: {
      tags: ["option"]
    },
    HTMLOutputElement: {
      tags: ["output"]
    },
    HTMLParagraphElement: {
      tags: ["p"]
    },
    HTMLParamElement: {
      tags: ["param"]
    },
    HTMLPictureElement: {
      tags: ["picture"]
    },
    HTMLPreElement: {
      tags: ["listing", "pre", "xmp"]
    },
    HTMLProgressElement: {
      tags: ["progress"]
    },
    HTMLQuoteElement: {
      tags: ["blockquote", "q"]
    },
    HTMLScriptElement: {
      tags: ["script"]
    },
    HTMLSelectElement: {
      tags: ["select"]
    },
    HTMLSourceElement: {
      tags: ["source"]
    },
    HTMLSpanElement: {
      tags: ["span"]
    },
    HTMLStyleElement: {
      tags: ["style"]
    },
    HTMLTableCaptionElement: {
      tags: ["caption"]
    },
    HTMLTableCellElement: {
      tags: ["th", "td"]
    },
    HTMLTableColElement: {
      tags: ["col", "colgroup"]
    },
    HTMLTableElement: {
      tags: ["table"]
    },
    HTMLTimeElement: {
      tags: ["time"]
    },
    HTMLTitleElement: {
      tags: ["title"]
    },
    HTMLTableRowElement: {
      tags: ["tr"]
    },
    HTMLTableSectionElement: {
      tags: ["thead", "tbody", "tfoot"]
    },
    HTMLTemplateElement: {
      tags: ["template"]
    },
    HTMLTextAreaElement: {
      tags: ["textarea"]
    },
    HTMLTrackElement: {
      tags: ["track"]
    },
    HTMLUListElement: {
      tags: ["ul"]
    },
    HTMLUnknownElement: {
      tags: []
    },
    HTMLVideoElement: {
      tags: ["video"]
    }
  },
  "http://www.w3.org/2000/svg": {
    SVGElement: {
      file: require("./generated/SVGElement.js"),
      tags: []
    },
    SVGGraphicsElement: {
      file: require("./generated/SVGGraphicsElement.js"),
      tags: []
    },
    SVGSVGElement: {
      file: require("./generated/SVGSVGElement.js"),
      tags: ["svg"]
    }
  }
};

module.exports = (documentImpl) => {
  const window = documentImpl._global;

  for (const ns of Object.keys(mappings)) {
    const interfaces = mappings[ns];
    documentImpl._elementBuilders[ns] = Object.create(null);

    for (const interfaceName of Object.keys(interfaces)) {
      const { tags } = interfaces[interfaceName];

      for (const tagName of tags) {
        documentImpl._elementBuilders[ns][tagName] = (elName) => {
          return window._core[interfaceName].create([], {
            core,
            ownerDocument: window.document,
            localName: elName || tagName.toUpperCase()
          });
        };
      }
    }
  }
};
