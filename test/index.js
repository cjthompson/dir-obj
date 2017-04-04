'use strict';

const dirObj = require('..');

const assert = require('assert');
const path = require('path');
const fixturePath = path.join(__dirname, 'fixtures');

const test = (name, fn) => {
  try {
    fn();
    return true;
  } catch (e) {
    console.log('Failed test: ' + name);
    console.log(e.stack);
    return false;
  }
};

test('dir-obj', () => {
  const tests = [

    test('no arguments requires all js and json files', () => {
      const expected = {
        fixtures1: {
          'name': 'fixture1.json'
        },
        fixtures2: {
          name: 'fixtures2.js'
        }
      };
      const result = dirObj.readDirectory(path.join(__dirname, '/fixtures/dir1'));

      assert.deepEqual(result, expected);
    }),

    test('filter - only load JSON files', () => {
      const expected = {
        subdir1: {
          subsubdir1: {
            subfixture1: {
              'name': 'subsubdir1/subfixture1.json'
            }
          },
          subsubdir2: {}
        }
      };

      const result = dirObj.readDirectory(path.join(fixturePath, 'dir.2'), {
        filter: file => file.isDirectory || file.ext === '.json'
      });

      assert.deepEqual(result, expected);
    }),

    test('filter - do not add keys for empty directories', () => {
      const expected = {
        'dir.2': {
          subdir1: {
            subsubdir1: { subfixture2: true },
            subsubdir2: {
              index: { name: 'subsubdir2/index.js' }
            }
          }
        },
        dir1: {
          fixtures2: { name: 'fixtures2.js' }
        },
        root: 'This is the root'
      };

      const result = dirObj.readDirectory(fixturePath, {
        filter: file => file.isDirectory || file.ext === '.js',
        dirTransform: (file, value) => (Object.getOwnPropertyNames(value).length > 0) ? value : undefined
      });

      assert.deepEqual(result, expected);
    }),

    test('fileTransform - change the object key', () => {
      const expected = {
        '3dir': { FIXTURES3: { name: 'dir2/fixtures3.sjon' } },
        '4.dir': { '_-_BAD_%_FILE__NAME_': { name: ' - bad % file \\ name .json' } },
        'dir.2': {
          subdir1: {
            subsubdir1: {
              SUBFIXTURE1: { name: 'subsubdir1/subfixture1.json' },
              SUBFIXTURE2: true
            },
            subsubdir2: { INDEX: { name: 'subsubdir2/index.js' } }
          }
        },
        dir1: {
          FIXTURES1: { name: 'fixture1.json' },
          FIXTURES2: { name: 'fixtures2.js' }
        },
        ROOT: 'This is the root'
      };

      const result = dirObj.readDirectory(fixturePath, {
        fileTransform: file => {
          file.key = file.key.replace(/[. ]/g, '_').toUpperCase();
          return require(file.fullpath);
        }
      });

      assert.deepEqual(result, expected);
    }),

    test('fileTransform - use a custom file loader to get data from non-requireable files', () => {
      const expected = {
        dir1: { fixtures2: 'This will not get loaded\n' }
      };

      const result = dirObj.readDirectory(fixturePath, {
        filter: file => file.isDirectory || file.ext === '.txt',
        fileTransform: file => require('fs').readFileSync(file.fullpath, 'utf8'),
        dirTransform: (file, value) => Object.getOwnPropertyNames(value).length > 0 ? value : undefined
      });

      assert.deepEqual(result, expected);
    }),

    test('fileTransform - ozen object', () => {
      const result = dirObj.readDirectory(path.join(fixturePath, 'dir1'), {
        fileTransform: file => Object.freeze(require(file.fullpath)),
        dirTransform: (file, value) => Object.getOwnPropertyNames(value).length > 0 ? value : undefined
      });

      assert.ok(Object.isFrozen(result.fixtures1));
      assert.throws(() => { result.fixtures1 = {}; });
      assert.throws(() => { result.fixtures1.test = 'test'; });
    }),

    test('fileTransform - ignore a file by returning undefined', () => {
      const expected = {
        subdir1: {
          subsubdir1: {},
          subsubdir2: {}
        }
      };

      const result = dirObj.readDirectory(path.join(fixturePath, 'dir.2'), {
        fileTransform: file => undefined
      });

      assert.deepEqual(result, expected);
    }),

    test('dirTransform - change directory key', () => {
      const expected = {
        _dir: { fixtures3: { name: 'dir2/fixtures3.sjon' } },
        __dir: { ' - bad % file  name ': { name: ' - bad % file \\ name .json' } },
        dir__: {
          subdir_: {
            subsubdir_: {
              subfixture1: { name: 'subsubdir1/subfixture1.json' },
              subfixture2: true
            },
            subsubdir2: { index: { name: 'subsubdir2/index.js' } }
          }
        },
        dir_: {
          fixtures1: { name: 'fixture1.json' },
          fixtures2: { name: 'fixtures2.js' }
        },
        root: 'This is the root'
      };

      const result = dirObj.readDirectory(fixturePath, {
        dirTransform: (file, value) => {
          if (file.name !== 'subsubdir2') {
            file.key = file.key.replace(/[\d.]/g, '_');
          }
          return value;
        }
      });

      assert.deepEqual(result, expected);
    }),

    test('dirTransform - ignore a directory by returning undefined', () => {
      const expected = { root: 'This is the root' };

      const result = dirObj.readDirectory(fixturePath, {
        dirTransform: file => undefined
      });

      assert.deepEqual(result, expected);
    }),

    test('filter, fileTransform, and dirTransform', () => {
      const expected = {
        '3dir': { fixtures3: { name: 'dir2/fixtures3.sjon' } },
        '4.dir': { '_-_bad_%_file__name_': { name: ' - bad % file \\ name .json' } },
        'dir.2': {
          subdir1: {
            subsubdir1: {
              subfixture1: { name: 'subsubdir1/subfixture1.json' },
              subfixture2: true
            }
          }
        },
        dir1: {
          fixtures1: { name: 'fixture1.json' },
          fixtures2: { name: 'fixtures2.js' }
        },
        root: 'This is the root'
      };

      const result = dirObj.readDirectory(fixturePath, {
        filter: file => (file.isDirectory || file.isRequirable) && file.name !== 'index.js',
        fileTransform: file => {
          file.key = file.basename.replace(/\s/g, '_');
          return require(file.fullpath);
        },
        dirTransform: (file, value) => Object.getOwnPropertyNames(value).length > 0 ? value : undefined
      });

      assert.deepEqual(result, expected);
    })
  ];

  const results = tests.reduce((accum, t) => {
    accum[t ? 'passed' : 'failed'] += 1;
    return accum;
  }, {
    passed: 0,
    failed: 0
  });

  console.log(require('util').inspect(results, { colors: true }));
  assert.equal(results.failed, 0);
});
