'use strict';

const fs = require('fs');
const nodeRequire = require;
const File = require('./lib/file');

/**
 * Add a property to an object with a value
 *
 * @param {Object} object
 * @param {*} value
 * @param {File} file
 * @param {Function} transform  A transform function that takes the value and the file
 * If `transform` returns a function, then the object will use it as a getter
 *
 */
function defineProperty (object, file, transform, value) {
  const property = { enumerable: true };
  const result = transform(file, value);
  if (result !== undefined) {
    // If dirTransform returns a function, then use it as a getter, otherwise just return the value
    property[( result instanceof Function ) ? 'get' : 'value'] = result;
    return Object.defineProperty(object, file.key || file.basename, property);
  }
}

/**
 * Make sure transform functions are defined
 *
 * @param {Object} [options]
 * @param {RegExp|Function} [options.filter]
 * @param {Function} [options.dirTransform]
 * @param {Function} [options.fileTransform]
 */
function defaultOptions (options) {
  const opts = {};

  if (!(options instanceof Object)) {
    options = {};
  }

  if (options.filter instanceof RegExp) {
    opts.filter = file => opts.filter.test(file.basename);
  } else if (options.filter instanceof Function) {
    opts.filter = options.filter;
  } else {
    opts.filter = file => (
    file.isDirectory || file.isRequirable
    );
  }

  if (options.dirTransform instanceof Function) {
    opts.dirTransform = options.dirTransform;
  } else {
    opts.dirTransform = (f, v) => v;
  }

  if (options.fileTransform instanceof Function) {
    opts.fileTransform = options.fileTransform;
  } else {
    opts.fileTransform = f => nodeRequire(f.fullpath);
  }

  return opts;
}

/**
 * Read a directory tree and return an object
 *
 * @param {String} dir  The directory to read. Can be relative or absolute.
 * @param {Object} [options]
 * @param {Boolean} [options.dirTransform] A function called with the object result from scanning a directory
 * @param {Function} [options.fileTransform] A function called with one argument that is the result of require(file)
 * @returns {Promise.<Object>}
 */
function readDirectoryAsync (dir, options) {
  const opts = defaultOptions(options);

  return new Promise((resolve, reject) => {
    fs.readdir(dir, (err, files) => {
      if (err) { return reject(err); }
      if (!Array.isArray(files)) { return resolve({}); }

      let promises = [];
      const result = files.reduce((accum, name) => {
        const file = new File(dir, name);
        if (opts.filter(file)) {
          if (file.isDirectory) {
            promises.push(readDirectoryAsync(file.fullpath, options)
              .then(obj => defineProperty(accum, file, opts.dirTransform, obj)));
          } else {
            defineProperty(accum, file, opts.fileTransform);
          }
        }
        return accum;
      }, {});

      Promise.all(promises).then(() => resolve(result));
    });
  });
}

/**
 * Read a directory tree and return a object
 *
 * @param {String} dir  The directory to read. Can be relative or absolute.
 * @param {Object} [options]
 * @param {Function} [options.dirTransform] A function called with the object result from scanning a directory
 * @param {Function} [options.fileTransform] A function called with one argument that is the result of require(file)
 * @returns {Object}
 *
 * @example
 * readDirectory('./fixtures', { dirTransform: Object.freeze, fileTransform: v => () => _.cloneDeep(v) })
 *   .then(console.log)
 */
function readDirectory (dir, options) {
  const opts = defaultOptions(options);

  const files = fs.readdirSync(dir);
  if (!Array.isArray(files)) { return {}; }

  return files.reduce((accum, name) => {
    const file = new File(dir, name);
    if (opts.filter(file)) {
      if (file.isDirectory) { // Recurse into sub-directories
        defineProperty(accum, file, opts.dirTransform, readDirectory(file.fullpath, options));
      } else {
        defineProperty(accum, file, opts.fileTransform);
      }
    }
    return accum;
  }, {});
}

module.exports = {
  readDirectory,
  readDirectoryAsync
};
