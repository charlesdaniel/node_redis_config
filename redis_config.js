var redis = require('redis');

function RedisConfig(port, host, options) {
    var self = this;
    // Actual config key/values stored in config
    self.config = {};
    // To keep track of our mappings to redis key mappings
    self.mapRedisKey2Key = {};

    // We need 2 Redis clients, one for commands and the other for subscriptions.
    // Redis doesn't allow other non-subscription commands after a subscribe request.
    self.subscriptionsClient = redis.createClient(port, host, options);
    self.commandsClient = redis.createClient(port, host, options);

    // Any subscription messages are the redis_key as the channel and val as the message
    self.subscriptionsClient.on("message", function(redis_key, val) {
        try {
            // The key comes to us as the redis_key, we need to map it back to our own key name
            var key = self.mapRedisKey2Key[redis_key];
            if(key) {
                val = JSON.parse(val);
                self.config[key] = val;
            }
        }
        catch(e) {};
    });
}

RedisConfig.prototype.sync_key = function(key, redis_key, callback) {
    // key = Our js object's key name
    // redis_key = (optional) the name to store the key under in Redis
    // callback = (optional) the function to call after the initial Redis get()
    // Note: calling sync_key() is asynchronous as far as getting the value from Redis initially.
    //       You'll have to use a callback to make sure you have the initial value from Redis.
    var self = this;

    if(! redis_key) { redis_key = key; }

    // Hold on to our mapping of redis_key to key for parsing subscription messages later
    self.mapRedisKey2Key[redis_key] = key;

    // Subscribe to a channel by the name of redis_key
    self.subscriptionsClient.subscribe(redis_key);

    // Setup a getter and setter for this new key property for "this" object
    // The getter returns the config object's value for key
    // The setter pushes the value to Redis via redis.set and publishes the val to the redis_key channel
    Object.defineProperty(
        self,
        key,
        {
            get: function() {
                return self.config[key];
            },
            set: function(val) {
                val = JSON.stringify(val);
                self.config[key] = val;
                self.commandsClient.set(redis_key, val, function(err, ok) {
                    self.commandsClient.publish(redis_key, val);
                });
            }
        }
    );

    // Get the initial value from redis for our key, we call the callback when we have it
    self.commandsClient.get(redis_key, function(err, val) {
        if(!err && val) {
            try {
                val = JSON.parse(val);
                self.config[key] = val;
                if(callback) {
                    callback(null, self.config[key]);
                }
            }
            catch(e) {};
        }
        else if(callback) {
            callback(err, self.config[key]);
        }
    });
};


module.exports = RedisConfig;

