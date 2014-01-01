var RedisConfig = require('./redis_config');

// Pass in a port, host if you like, otherwise defaults to localhost:6379
var config1 = new RedisConfig();
config1.sync_key("foo");

// Set the configuration key of "foo"
config1.foo = {a: "A", b: "B"};

// Get the configuration key of "foo"
console.log("config1.foo => ", config1.foo);


// Setup another config object for testing purposes, this will create new redis clients
// and we'll be sure then that it isn't just returning a cached value
var config2 = new RedisConfig();
// We'll map the redis_key of "foo" to our internal name "goo"
config2.sync_key("goo", "foo", function(err, val) {
    console.log("(sync callback) config2.goo => ", val);
});


// Here we'll setup 2 intervals.
// The first interval will just update a "d" key with the current epoch.
setInterval(function(){
    config1.foo.d = Date.now();

    // Note that this is a kludge to trigger the config1.foo's setter as setting
    // config1.foo.d is too deep within the structure to trigger our setter.
    config1.foo = config1.foo;
}, 1000);


// The second interval will just keep printing the latest value of config2.goo
// Everytime config1.foo gets updated, we should receive a message/subscription
// that automatically updates config2.goo
setInterval(function() {
    console.log("config2.goo => ", config2.goo);
}, 1000);

