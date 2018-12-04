var tape = require("tape"),
    itemset = require("../");

tape("foo() returns the answer to the ultimate question of life, the universe, and everything.", function(test) {
  test.equal(itemset.circular(), 42);
  test.end();
});
