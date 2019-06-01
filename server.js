#!/usr/bin/env node
const WebSocketServer = require('websocket').server;
const http = require('http');
const fs = require('fs'); 
const SimpleNodeLogger = require('simple-node-logger');
const opts = {
	logFilePath:`./messages.log`,
	timestampFormat:'YYYY-MM-DD HH:mm:ss'
};
const recipientsObj = {};

//Create logger object
const log = SimpleNodeLogger.createSimpleLogger(opts);

var server = http.createServer(function(request, response) {
    console.log((new Date()) + ' Received request for ' + request.url);
    response.writeHead(404);
    response.end();
});
server.listen(8080, function() {
    console.log((new Date()) + ' Server is listening on port 8080');
});
 
wsServer = new WebSocketServer({
    httpServer: server,
    // You should not use autoAcceptConnections for production
    // applications, as it defeats all standard cross-origin protection
    // facilities built into the protocol and the browser.  You should
    // *always* verify the connection's origin and decide whether or not
    // to accept it.
    autoAcceptConnections: false
});
 
function originIsAllowed(origin) {
  // put logic here to detect whether the specified origin is allowed.
  return true;
}
 
wsServer.on('request', function(request) {
    if (!originIsAllowed(request.origin)) {
      // Make sure we only accept requests from an allowed origin
      request.reject();
      console.log((new Date()) + ' Connection from origin ' + request.origin + ' rejected.');
      return;
    }
    
    var connection = request.accept('echo-protocol', request.origin);
    console.log((new Date()) + ' Connection accepted.');
    connection.on('message', function(message) {
        if (message.type === 'utf8') {
        	const payload = JSON.parse(message.utf8Data);
        	console.log('Received Message: ' + message.utf8Data);
        	//After connecting make reference between username and the connection
        	if(payload.first) {
        		console.log('FIRST');
				recipientsObj[payload.username] = connection;
        	} else {
	            console.log('SECOND Received Message: ' + payload);
	            log.info(message.utf8Data);
	            // checkLogFileSize(opts);
	            if(typeof recipientsObj[payload.recipient] !== 'undefined') {
	            	recipientsObj[payload.recipient].sendUTF(message.utf8Data);
	        	} else {
	        		console.log('This recipient is not in the List');
	        	}
        	}
        }
        else if (message.type === 'binary') {
            console.log('Received Binary Message of ' + message.binaryData.length + ' bytes');
            connection.sendBytes(message.binaryData);
        }
    });
    connection.on('close', function(reasonCode, description) {
        console.log((new Date()) + ' Peer ' + connection.remoteAddress + ' disconnected.');
    });
});

checkLogFileSize = (opts) => {
	try {
		const stats = fs.statSync(opts.logFilePath);
		const fileSizeInBytes = stats.size;

		if(fileSizeInBytes > 100) {
			if(fs.existsSync(`${opts.logFilePath}.old`)) {
				fs.unlinkSync(`${opts.logFilePath}.old`);
			}
			fs.renameSync(`${opts.logFilePath}`,`${opts.logFilePath}.old`);
		}
	} catch(err) {
		console.error(err);
	}
}