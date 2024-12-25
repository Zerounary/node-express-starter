var assert = require('assert');

// 测试方式可以参考Express
// https://github.com/expressjs/express/blob/master/test/Router.js

describe('Array', function () {
  describe('#indexOf()', function () {
    it('should return -1 when the value is not present', function () {
      assert.equal([1, 2, 3].indexOf(4), -1);
    });
  });
});