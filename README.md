dir-obj
=======

Create an object from a directory tree.

`dir-obj` creates an object with keys for each directory (by name).
All files within a directory that can be required (`.js` or `.json`) are added to the directory object, using the base filename as the key and `require('file.js')` as the value.

This is useful for things like loading test fixture data.

## API
You can also customize how `dir-obj` processes the directory tree

```javascript
const fixtures = dirObj.readDirectory(path.join(__dirname, 'fixtures'), {
  // Use the `filter` option to filter all directories and files
  // Return `true` to include the directory or file (call `file.isDirectory` to check)
  // Return `false` to exclude the file or directory from the result
  // The default is to only allow `.js` and `.json` files
  filter: file => (file.isDirectory || file.isRequirable) && file.name !== 'index.js',
  // This function takes a File object and returns the value to be added to the object
  // You can mutate `File.key` to change the object key used to reference the value
  // You can return `undefined` to not include the file in the result
  // The default `fileTransform` just calls `require(file.fullpath)`
  // Example: Change whitespace in a filename to `_` then set the value using `require`
  fileTransform: file => {
    file.key = file.basename.replace(/\s/g, '_');
    return require(file.fullpath);
  },
  // This function takes a File (which is a directory) and a value, which is the recursively
  // calculated value of that directory
  // Example: Do not include any directories that have no child keys
  dirTransform: (file, value) => Object.getOwnPropertyNames(value).length > 0 ? value : undefined
});
```

## Example
Using the default options:

```javascript
/*
directory structure:

fixtures
  ok
    success.json
  responses
    success.json
*/

const path = require('path');
const dirObj = require('dir-obj');
const fixtures = dirObj.readDirectory(path.combine(__dirname, '/fixtures'));

describe('test', function () {
  it('should work', function () {
    nock(/api/).get('/ok').reply(200, fixtures.ok.success);

    request('/')
      .expect(200, fixtures.ok.response.success);
  });
});
```

Loading SQL files:

```javascript
// Get an object where the value of each key is a string loaded from each SQL file

const fixtures = dirObj.readDirectory(path.resolve('../../models/sql'), {
  filter: file => file.isDirectory || file.ext === '.sql'.
  fileTransform: file => file.readSync() // helper function equivilent to `fs.readFileSync(file.fullpath, 'utf8')`
});

```
