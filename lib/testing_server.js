
module.exports = function(port){
	port = port || 8171;
	var WebSocketServer = require("websocket").server;
	var http = require("http");

	var server = http.createServer(function(request, response) {
		response.writeHead(404);
		response.end();
	});
	var readyPromise = new Promise(function(resolve){
		server.listen(port, function() {
			resolve();
		});
	});

	var wss = new WebSocketServer({
		httpServer: server,
		autoAcceptConnections: false
	});

	var connections = [];

	wss.on("request", function(request){
		console.log("Received connection to the spy server");
		var connection = request.accept(null, request.origin);
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
					var data = JSON.parse(msg.utf8Data);
					if(data.type === "info") {
						console.log("Spy info:", data.msg);
						return;
					}

					connections.forEach(function(conn){
						conn.removeListener("message", onreply);
					});
					resolve(data);
				};
				console.log("Running tests on", connections.length);
				connections.forEach(function(conn){
					conn.on("message", onreply);
					conn.sendUTF(JSON.stringify(msg));
				});
			});
		}
	};
};
