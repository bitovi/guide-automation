
module.exports = function(port){
	port = port || 8171;
	var WebSocketServer = require("websocket").server;
	var http = require("http");

	var server = http.createServer(function(request, response) {
	});
	var readyPromise = new Promise(function(resolve){
		server.listen(port, function() {
			resolve();
		});
	});

	var wss = new WebSocketServer({
		httpServer: server,
		autoAcceptConnections: true
	});

	var connections = [];

	wss.on("request", function(request){
		var connection = request.accept("echo-protocol", request.origin);
		connections.push(connection);
		connection.on("close", function(){
			// Remove this connection from the list of connections
			connections.splice(connections.indexOf(connection), 1);
		});
	});

	return {
		ready: readyPromise,
		wss: wss,

		runTest: function(data){
			var msg = { scripts: [data] };

			return new Promise(function(resolve){
				var onreply = function(msg){
					connections.forEach(function(conn){
						conn.removeListener("message", onreply);
					});
					var data = JSON.parse(msg.utf8Data);
					resolve(data);
				};
				connections.forEach(function(conn){
					conn.on("message", onreply);
					conn.sendUTF(msg);
				});
			});
		}
	};
};
