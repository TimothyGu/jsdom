"use strict";
const { resolve } = require("path");
const vm = require("vm");
const dom = require("../living");
const idlUtils = require("../living/generated/utils");

const domBundle = new vm.Script(
  fs.readFileSync(resolve(__dirname, "../living/generated/bundle.js")),
  { filename: resolve(__dirname, "../living/generated/bundle.js") }
);

exports.availableDocumentFeatures = [
  "FetchExternalResources",
  "SkipExternalResources"
];

exports.defaultDocumentFeatures = {
  FetchExternalResources: ["script", "link"], // omitted by default: "frame"
  SkipExternalResources: false
};

exports.applyDocumentFeatures = (documentImpl, features = {}) => {
  for (let i = 0; i < exports.availableDocumentFeatures.length; ++i) {
    const featureName = exports.availableDocumentFeatures[i];
    let featureSource;

    if (features[featureName] !== undefined) {
      featureSource = features[featureName];
      // We have to check the lowercase version also because the Document feature
      // methods convert everything to lowercase.
    } else if (typeof features[featureName.toLowerCase()] !== "undefined") {
      featureSource = features[featureName.toLowerCase()];
    } else if (exports.defaultDocumentFeatures[featureName]) {
      featureSource = exports.defaultDocumentFeatures[featureName];
    } else {
      continue;
    }

    const implImpl = documentImpl._implementation;
    implImpl._removeFeature(featureName);

    if (featureSource !== undefined) {
      if (Array.isArray(featureSource)) {
        for (let j = 0; j < featureSource.length; ++j) {
          implImpl._addFeature(featureName, featureSource[j]);
        }
      } else {
        implImpl._addFeature(featureName, featureSource);
      }
    }
  }
};

exports.contextifyWindow = window => {
  if (vm.isContext(window)) {
    return;
  }

  vm.createContext(window);
  const binding = {
    utils: idlUtils,
    impls: dom.impls,
    defaultPrivateData: {}
  };
  domBundle.runInContext(window)(binding);
  binding.bootstrap("Window");
  for (const extra of Object.key(dom.extras)) {
    Object.defineProperty(window, extra, {
      writable: true,
      enumerable: false,
      configurable: true,
      value: dom.extras[extra]
    });
  }

  window._globalProxy = vm.runInContext("this", window);
  return binding;
};
