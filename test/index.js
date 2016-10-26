'use strict';

const assert = require('assert');
const dirObj = require('..');

const expected = { 
  fixtures:
   { '3dir': { fixtures3: { name: 'dir2/fixtures3.sjon' } },
     '4.dir': { '_-_bad_%_file__name_': { name: ' - bad % file \\ name .json' } },
     'dir.2':
      { subdir1:
         { subsubdir1:
            { subfixture1: { name: 'subsubdir1/subfixture1.json' },
              subfixture2: true },
           subsubdir2: { index: { name: 'subsubdir2/index.js' } } } },
     dir1:
      { fixtures1: { name: 'fixture1.json' },
        fixtures2: { name: 'fixtures2.js' } },
     emptydir: {},
     root: 'This is the root' },
  index: {} 
};

const result = dirObj.readDirectory(__dirname, { 
  fileTransform: (value, file) => {
    file.key = file.basename.replace(/\s/g, '_');
    return value;
  }
});

assert.deepEqual(result, expected);
console.log('test passed');
