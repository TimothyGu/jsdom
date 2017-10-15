/* eslint-disable no-console, no-process-exit */

"use strict";

const path = require("path");
const fs = require("fs");
const rimraf = require("rimraf");

const browserify = require("browserify");
const Webidl2js = require("webidl2js");

const transformer = new Webidl2js({
  implSuffix: "-impl",
  suppressErrors: true,
  bundle: true
});

function addDir(dir) {
  const resolved = path.resolve(__dirname, dir);
  transformer.addSource(resolved, resolved);
}

addDir("../../lib/jsdom/living/traversal");
addDir("../../lib/jsdom/living/events");
addDir("../../lib/jsdom/living/attributes");
addDir("../../lib/jsdom/living/window");
addDir("../../lib/jsdom/living/nodes");
addDir("../../lib/jsdom/living/navigator");
addDir("../../lib/jsdom/living/file-api");
addDir("../../lib/jsdom/living/xhr");
addDir("../../lib/jsdom/living/domparsing");
addDir("../../lib/jsdom/living/svg");


const outputDir = path.resolve(__dirname, "../../lib/jsdom/living/generated/");

// Clean up any old stuff lying around.
rimraf.sync(outputDir);
fs.mkdirSync(outputDir);

transformer.generate(outputDir)
  .then(() => new Promise((resolve, reject) => {
    const bundler = browserify();
    bundler.add(path.resolve(__dirname, "../../lib/jsdom/living/generated/bundle-entry.js"));
    const outStream = fs.createWriteStream(path.resolve(__dirname, "../../lib/jsdom/living/generated/bundle.js"));
    outStream.on("error", reject);
    outStream.write("(function (binding) {", "utf8");
    const bundleStream = bundler.bundle();
    bundleStream.on("error", reject);
    bundleStream.pipe(outStream, { end: false });
    bundleStream.on("end", () => {
      outStream.end("})", "utf8", resolve);
    });
  }))
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
