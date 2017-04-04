'use strict';

const dirObj = require('..');

const assert = require('assert');
const path = require('path');
const fixturePath = path.join(__dirname, 'fixtures');

const test = (name, fn) => {
  return fn()
    .then(() => true)
    .catch(e => {
      console.log('Failed test: ' + name);
      console.log(e.stack);
      return false;
    });
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

      return dirObj.readDirectoryAsync(path.join(fixturePath, 'dir1'))
        .then(result => assert.deepEqual(result, expected))
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

      return dirObj.readDirectoryAsync(fixturePath, {
        filter: file => (file.isDirectory || file.isRequirable) && file.name !== 'index.js',
        fileTransform: file => {
          file.key = file.basename.replace(/\s/g, '_');
          return require(file.fullpath);
        },
        dirTransform: (file, value) => Object.getOwnPropertyNames(value).length > 0 ? value : undefined
      })
        .then(result => assert.deepEqual(result, expected));
    })

  ];

  return Promise.all(tests)
    .then(testResults => {
      const results = testResults.reduce((accum, t) => {
          accum[t ? 'passed' : 'failed'] += 1;
          return accum;
        }, {
          passed: 0,
          failed: 0
        }
      );

      console.log(require('util').inspect(results, { colors: true }));
      assert.equal(results.failed, 0);
    })
    .catch(e => console.log(e.stack));
});
