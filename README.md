dir-obj
=======

Create an object from a directory tree.  Create a key with an object for each directory by name.  All files within a directory that can be required (`.js` or `.json`) are added to the directory object, using the base filename as the key and `require('file.js')` as the value.

This is useful for things like loading test fixture data.

## Example

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
