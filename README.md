# RedisConfig

## Introduction
This is a simple NodeJS based configurations class that is backed by a Redis store. It lets you create an object with arbitrary keys/properties that automatically get sync'd to/from Redis keys. Every time a sync'd property is set it updates the Redis key and publishes the new value on a channel by the same Redis key name. The class also is subscribed to Redis under the redis key so that it receives any updates to values on that key made by any other process.

## Installation
Clone this git repository and while inside the directory run 

    $ npm install
    

## Examples

Begin by creating a RedisConfig object

    var RedisConfig = require('./redis_config);    
    var config = new RedisConfig(6379, 'localhost');

Now you can define a key/configuration property to be sync'd to/from Redis. Here we'll define a property called "foo", this will create a getter/setter for config on a "foo" property. The setter will store the value in Redis under the key "foo".
    
    config.sync_key("foo");
    config.foo = "BAR";

Alternatively you may use a different key name for Redis than the key name used by the config object by using the second parameter to sync_key().
    
	config.sync_key("foo", "goo");
	config.foo = "BAR";
	
Now whenever you store something in "foo" it'll get stored as "goo" in Redis. It should be noted that you can store whatever value you like in config.foo and it'll be stored after a JSON.stringify into Redis. This means you can store a relatively complex object/array as well (see the Caveats section).

    config.foo = { bar: "BAR", zab: ["ZAB", "BAZ"] };

If you intend to initially load the configuration from Redis reliably, you'll need to pass in a callback function to sync_key() as the third parameter. We have to do it as a callback because the call to Redis.set is asynchronous.
 
    config.sync_key("foo", undefined, function(err, val) {
    	console.log("FOO = ", config.foo);
    });
 
After you use sync_key() to setup a configuration property it'll subscribe to changes of that key in Redis, every time another process, that uses this RedisConfig class, updates that property in Redis it'll push the changes to this process. Let's look at an example.

**Process A:**

	var RedisConfig = require('./redis_config');
    var config = new RedisConfig();
    config.sync_key("foo");
    setInterval(function() {
    	console.log("IN INTERVAL FOO = ", config.foo);
    }, 1000);

**Process B:**

	var RedisConfig = require('./redis_config');
    var config = new RedisConfig();
    config.sync_key("foo");
    setInterval(function() {
    	config.foo = Date.now();
    }, 1000);
    
As you can see **Process A** is simply sitting there printing the value of config.foo every second (config.foo implies a getter call to get the value). Meanwhile **Process B** is simply updating the value of the foo property to the current time epoch via Date.now() every second (this implies a setter call which stores to Redis). Both processes are subscribed to the "foo" Redis channel. Every time **Process B** sets the value of config.foo it stores the value within Redis under the "foo" key and also publishes the value to the "foo" Redis channel which is picked up by **Process A** which then updates it's internal foo value to the new value.

## Caveats

If you store an object within a RedisConfig property and then you add/change/delete a property within that object the RedisConfig setter won't be aware that anything has changed and thus won't sync the new version to Redis. Basically the setter works only when it detects a change on the first level (nothing deeper). You can get around this by simply assigning the property to itself which will trigger the setter and sync the latest version to Redis.

    // Assuming config.foo= {a:"A", b:"B"}
    config.foo.b = "BBB";
    config.foo.c = "C";
    
    // will not sync to Redis as those are being set in the 
    // sub-object level and RedisConfig only manages the 
    // config.foo level. The easiest workaround is:
    config.foo = config.foo;
    
    // That will kick the RedisConfig config.foo setter
    // to sync the latest version
