'use strict';

const fs = require('fs');
const nodeRequire = require;
const path = require('path');
const jsonFile = /^\.js(?:on)?$/;

/**
 * Symbol to define file attributes cache
 *
 * This allows us to store a cache of file attributes but keep it hidden
 *
 * @type {Symbol}
 * @private
 */
const _attributes = Symbol('attributes');
const _key = Symbol('key');

/**
 * File or directory
 * @property {String} path     The fully resolved path to the file (the parent directory)
 * @property {String} fullpath The fully resolved path of the file
 * @property {String} ext      The file extension
 * @property {String} name     The full name of the file with no path
 * @property {String} basename The name of the file without the extension
 * @property {Boolean} isDirectory Returns `true` if the file is a directory
 */
class File {
  constructor(dir, file) {
    this.path = path.resolve(dir);
    this.fullpath = path.join(this.path, file);
    this.ext = path.extname(this.fullpath);
    this.name = path.basename(this.fullpath);
    this.basename = path.basename(this.name, this.ext);
  };

  /**
   * Get a string value to be used as an object key
   *
   * @returns {String}
   */
  get key() {
    return this.attributes.key; 
  }

  set key(value) {
    return (this.attributes.key = value);
  }

  /**
   * Get the file's attributes
   *
   * @see https://nodejs.org/api/fs.html#fs_fs_lstatsync_path
   * @returns {Object}
   */
  get attributes() {
    if (!this[_attributes]) {
      const a = this[_attributes] = fs.lstatSync(this.fullpath);
      a.key = (a.isDirectory()) ? this.name : this.basename;
    }
    return this[_attributes];
  };

  /**
   * Check if file is a directory
   *
   * @returns {Boolean}
   */
  get isDirectory() {
    return this.attributes.isDirectory();
  }

  /**
   * Check if file extension is either `.js` or `.json`
   *
   * @returns {Boolean}
   */
  get isRequirable() {
    return jsonFile.test(this.ext);
  }
}

/**
 * Add a property to an object with a value
 *
 * @param {Function} transform
 * A transform function that takes the value and the file
 * If `transform` returns a function, then the object will use it as a getter
 *
 */
function defineProperty(object, value, file, transform) {
  const property = { enumerable: true };
  const result = transform(value, file);
  // If dirTransform returns a function, then use it as a getter, otherwise just return the value
  property[(typeof result === 'function') ? 'get' : 'value'] = result;

  return Object.defineProperty(object, file.key || file.basename, property);
}

/**
 * Make sure transform functions are defined
 */
function defaultOptions(options) {
  const opts = options || {};
  
  if (typeof opts.dirTransform !== 'function') {
    opts.dirTransform = v => v;
  }

  if (typeof opts.fileTransform !== 'function') {
    opts.fileTransform = v => v;
  }

  return opts;
}

/**
 * Read a directory tree and return an object
 *
 * @param {String} dir  The directory to read. Can be relative or absolute.
 * @param {Object} [options]
 * @param {Boolean} [options.dirTransform=Object.freeze] A function called with the object result from scanning a directory
 * @param {Function} [options.fileTransform=_.cloneDeep] A function called with one argument that is the result of require(file)
 * @returns {Promise.<Object>}
 */
function readDirectoryAsync(dir, options) {
  const opts = defaultOptions(options);

  return new Promise((resolve, reject) => {
    fs.readdir(dir, (err, files) => {
      if (err) { reject(err); }
      if (!Array.isArray(files)) { resolve({}); }

      let promises = [];
      const result = files.reduce((accum, name) => {
        const file = new File(dir, name);
        if (file.isDirectory) {
          promises.push(readDirectory(file.fullpath, options)
            .then(obj => defineProperty(accum, obj, file, opts.dirTransform)));
        } else if (file.isRequirable) {
          defineProperty(accum, require(file.fullpath), file, opts.fileTransform);
        }
        return accum;
      }, {});

      Promise.all(promises).then(() => resolve(result));
    });
  })
}

/**
 * Read a directory tree and return a object
 *
 * @param {String} dir  The directory to read. Can be relative or absolute.
 * @param {Object} [options]
 * @param {Boolean} [options.dirTransform] A function called with the object result from scanning a directory
 * Default is no transform
 * @param {Function} [options.fileTransform] A function called with one argument that is the result of require(file)
 * Default is a getter function that returns a clone of the file
 * @returns {Object}
 *
 * @example
 * readDirectory('./fixtures', { dirTransform: Object.freeze, fileTransform: v => () => _.cloneDeep(v) })
 *   .then(console.log)
 */
function readDirectory(dir, options) {
  const opts = defaultOptions(options);

  const files = fs.readdirSync(dir);
  if (!Array.isArray(files)) { return {}; }

  return files.reduce((accum, name) => {
    const file = new File(dir, name);
    if (file.isDirectory) { // Recurse into sub-directories
      defineProperty(accum, readDirectory(file.fullpath, options), file, opts.dirTransform);
    } else if (file.isRequirable) {
      defineProperty(accum, nodeRequire(file.fullpath), file, opts.fileTransform);
    }
    return accum;
  }, {});
}

module.exports = {
  readDirectory,
  readDirectoryAsync
};
