#!/usr/bin/env node

'use strict';

// Vendor includes
const fs = require('fs').promises;
const yargs = require('yargs');
const path = require('path');
const jsdom = require('jsdom-no-contextify');
const SVGtoJSX = require('svg-to-jsx');

// Language files
const content = require('./lang/en');

// Local includes
const createComponentName = require('./src/createComponentName');
const generateComponent = require('./src/generateComponent');
const printErrors = require('./src/output').printErrors;
const removeStyle = require('./src/removeStyle');
const replaceAllStrings = require('./src/replaceAllStrings');
const replaceFill = require('./src/replaceFill');
const replaceStroke = require('./src/replaceStroke');
const replaceWidthHeight = require('./src/replaceWidthHeight');

// Argument setup
const args = yargs
  .option('dir', { alias: 'd', default: '.' })
  .option('format', { default: true })
  .option('output', { alias: 'o' })
  .option('fillProp', { type: 'boolean', default: true })
  .option('strokeProp', { type: 'boolean', default: true })
  .option('widthHeightProp', { type: 'boolean', default: true })
  .option('rm-style', { default: false })
  .option('force', { alias: 'f', default: false }).argv;

// Resolve arguments
const firstArg = args._[0];
const newFileName = args._[1] || 'MyComponent';
const outputPath = args.output;
const directoryPath = args.dir;
const fillProp = args.fillProp;
const strokeProp = args.strokeProp;
const widthHeightProp = args.widthHeightProp;
const rmStyle = args.rmStyle;

// Bootstrap base variables´
const svg = `./${firstArg}.svg`;

process.on('unhandledRejection', (up) => {
  throw up;
});

const initialBasePath = path.resolve(process.cwd(), directoryPath);
const fullOutputPath = outputPath ? path.resolve(process.cwd(), outputPath) : process.cwd();

const writeFile = async (processedSVG, originalFilepath, filename) => {
  const originalFilename = path.basename(originalFilepath);
  const relativeFilepath = path
    .relative(initialBasePath, originalFilepath)
    .replace(originalFilename, `${filename}.tsx`);

  const file = path.resolve(fullOutputPath, relativeFilepath);

  try {
    await fs.writeFile(file, processedSVG, { flag: args.force ? 'w' : 'wx' });
  } catch (error) {
    if (error.code === 'EEXIST') {
      printErrors(`Output file ${file} already exists. Use the force (--force) flag to overwrite the existing files`);
    } else {
      printErrors(`Output file ${file} not writable`);
    }
    throw error;
  }

  console.log('File written to -> ' + file);
};

const runUtil = async (fileToRead, fileToWrite) => {
  const file = await fs.readFile(fileToRead, 'utf8');

  const output = await new Promise((resolve, reject) => {
    jsdom.env(file, (err, window) => {
      const body = window.document.getElementsByTagName('body')[0];

      if (rmStyle) {
        removeStyle(body);
      }

      // Add width and height
      // The order of precedence of how width/height is set on to an element is as follows:
      // 1st - passed in props are always priority one. This gives run time control to the container
      // 2nd - svg set width/height is second priority
      // 3rd - if no props, and no svg width/height, use the viewbox width/height as the width/height
      // 4th - if no props, svg width/height or viewbox, simlpy set it to 50px/50px
      let defaultWidth = '50px';
      let defaultheight = '50px';
      if (body.firstChild.hasAttribute('viewBox')) {
        const [minX, minY, width, height] = body.firstChild.getAttribute('viewBox').split(/[,\s]+/);
        defaultWidth = width;
        defaultheight = height;
      }

      if (!body.firstChild.hasAttribute('width')) {
        body.firstChild.setAttribute('width', defaultWidth);
      }
      if (!body.firstChild.hasAttribute('height')) {
        body.firstChild.setAttribute('height', defaultheight);
      }

      // Add generic props attribute to parent element, allowing props to be passed to the svg
      // such as className
      body.firstChild.setAttribute(':props:', '');

      // Now that we are done with manipulating the node/s we can return it back as a string
      resolve(body.innerHTML);
    });
  });

  // Convert from HTML to JSX
  // output = converter.convert(output);
  let jsx = await SVGtoJSX(output);

  // Convert any html tags to react-native-svg tags
  jsx = replaceAllStrings(jsx);

  // replace Fill
  if (fillProp) {
    jsx = replaceFill(jsx);
  }

  // replace Stroke
  if (strokeProp) {
    jsx = replaceStroke(jsx);
  }

  // replace widthHeightProp
  if (widthHeightProp) {
    jsx = replaceWidthHeight(jsx);
  }

  // Wrap it up in a React component
  jsx = generateComponent(jsx, fileToWrite);

  writeFile(jsx, fileToRead, fileToWrite);
};

const runUtilForAllInDir = async (basePath = initialBasePath) => {
  const files = await fs.readdir(basePath);

  await Promise.all(
    files.map(async (f) => {
      const filepath = path.resolve(basePath, f);
      const stat = await fs.stat(filepath);

      if (stat.isDirectory()) return await runUtilForAllInDir(filepath);

      const extension = path.extname(filepath);
      const filename = path.basename(filepath);

      if (extension === '.svg') {
        // variable instantiated up top
        const componentName = createComponentName(f, filename);
        await runUtil(filepath, componentName);
      }
    }),
  );
};

// Exit out early arguments
if (args.help) {
  console.log(content.helptext);
  process.exit(1);
}

if (args.example) {
  console.log(content.exampleText);
  process.exit(1);
}

// Main entry point
if (directoryPath) {
  runUtilForAllInDir();
} else {
  runUtil(svg, newFileName);
}
