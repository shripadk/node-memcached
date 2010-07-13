var net = require( 'net' ),
	hashRing = require( './lib/hashring' ).hashRing,
	memcached;

// our memcached class
memcached = function( memcached_servers ){
	
	var servers = [],
		weights = {},
		key;
	
	// To make it easier for users to get started with the memcached client we are going to allow them to send in different
	// server configuration formats. Not everybody requires multiple memcached clusters or even specify weights on the servers
	// so we support the follow formats:	
	
	if( Array.isArray( memcached_servers ) ){
		// var memcache = new memcached( [ '192.168.0.102:11212', '192.168.0.103:11212', '192.168.0.104:11212' ] )
		servers = memcached_servers;
	} else if( typeof memcached_servers == 'string' ){
		// var memcache = new memcached( '192.168.0.102:11212' )
		servers.push( memcached_servers )
	} else {
		// var memcache = new memcached( { '192.168.0.102:11212': 1, '192.168.0.103:11212': 2, '192.168.0.104:11212': 1 }) 
		weights = memcached_servers;
		for( key in weights ){
			servers.push( key );
		}
	}
	
	// This will store and map our net connections
	this.connectionpool = {};
	this.ring = new hashRing( servers, weights );
	this.connect();
};

// It would be utterly pointless if you are going to include a memcached library and not connect 
// servers we just recieved ;)
memcached.prototype = {
	constructor:memcached,
	
	connect: function(){
		var self = this,
			server_split_re = /(.*):(\d+){1,}$/g;
		
		this.ring.nodes.forEach( function( server ){
			// The regexp chunks down the server address for us, splitting host and port so we can set up a connection example chunks:
			// server_split_re.exec("3ffe:6a88:85a3:0:1319:8a2e:0370:7344") => ["3ffe:6a88:85a3:0:1319:8a2e:0370:7344", "3ffe:6a88:85a3:0:1319:8a2e:0370", "7344"]
			// server_split_re.exec("192.168.0.102:11212") => ["192.168.0.102:11212", "192.168.0.102", "11212"]
			
			var chunks = server_split_re.exec( server ),
				connection = new net.createConnection( chunks[2], chunks[1] );
			
			// if the server exists, close the current connection before we overwrite it
			if( self.connectionpool[ server ] && self.connectionpool[ server ].readyState === 'open' )
				self.connectionpool[ server ].close();
			
			// add the connection to the connection pool so we can do quick loops when we get the correct node back from our hashRing
			self.connectionpool[ server ] = connection;
		});
	}
}

exports.client = memcached;