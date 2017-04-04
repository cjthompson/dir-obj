'use strict';

const path = require('path');
const jsonFile = /^\.js(?:on)?$/;
const fs = require('fs');

/**
 * Symbol to define file attributes cache
 *
 * This allows us to store a cache of file attributes but keep it hidden
 *
 * @type {Symbol}
 * @private
 */
const _attributes = Symbol('attributes');

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
  constructor (dir, file) {
    this.path = path.resolve(dir);
    this.fullpath = path.join(this.path, file);
    this.ext = path.extname(this.fullpath);
    this.name = path.basename(this.fullpath);
    this.basename = path.basename(this.name, this.ext);
  };

  /**
   * Load the file as a UTF8 string
   *
   * @param {{ encoding: string, flag: string }}options
   */
  readSync (options) {
    options = options || { encoding: 'utf8' };
    return fs.readFileSync(this.fullpath, options);
  }

  /**
   * Get a string value to be used as an object key
   *
   * @returns {string}
   */
  get key () {
    return this.attributes.key;
  }

  /**
   * Set a string to be used as an object key
   *
   * @param {string} value
   */
  set key (value) {
    this.attributes.key = value;
  }

  /**
   * Get the file's attributes
   *
   * @see https://nodejs.org/api/fs.html#fs_fs_lstatsync_path
   *
   * @returns {fs.Stats}
   */
  get attributes () {
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
  get isDirectory () {
    return this.attributes.isDirectory();
  }

  /**
   * Check if file extension is either `.js` or `.json`
   *
   * @returns {Boolean}
   */
  get isRequirable () {
    return jsonFile.test(this.ext);
  }

  toString () {
    return this.fullpath;
  }

  get [Symbol.toStringTag] () {
    return 'File';
  }
}

module.exports = File;
