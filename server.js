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
var log = SimpleNodeLogger.createSimpleLogger(opts);

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
        	const req_payload = JSON.parse(message.utf8Data);
        	console.log('Received Message: ' + message.utf8Data);

        	let res_payload = {};
        	//After connecting make reference between username and the connection
        	switch(req_payload.command) {
        		case 'first':
	        		console.log('FIRST');
					recipientsObj[req_payload.username] = connection;
				break;
        		case 'send':
	        		res_payload = {
	        			command: 'send',
		    			message: {
		    				id: Math.floor(Math.random() * 100000000) + 1,
		        			sender: req_payload.username,
		        			content: req_payload.inputMessage
		    			}
		    		};	        		
		            console.log('SECOND Received Message: ' + message.utf8Data);
		            log.info(message.utf8Data);
		            checkLogFileSize(opts);
		            if(typeof recipientsObj[req_payload.recipient] !== 'undefined') {
		            	recipientsObj[req_payload.recipient].sendUTF(JSON.stringify(res_payload));
		        	} else {
		        		console.log('This recipient is not in the List');
		        	}		        	
		        break;
		        case 'sendAll':
			        res_payload = {
			        		command: 'send',
			    			message: {
			    				id: Math.floor(Math.random() * 100000000) + 1,
			        			sender: req_payload.username,
			        			content: req_payload.inputMessage
			    			}
		    		};			        	
		            console.log('THIRD Received Message: ' + message.utf8Data);
		            log.info(message.utf8Data);
		            checkLogFileSize(opts);
		            //Send to everyone exept the sender
		            Object.entries(recipientsObj).forEach(elem => {
		            	if(elem[0] !== req_payload.username) {
		            		elem[1].sendUTF(JSON.stringify(res_payload));
		            	}
		            });		         
		        break;
		        case 'sendReceipt':
		        	res_payload = {
			    		command: 'seen'
		    		};			        	
		            console.log('FOURTH Received Message: ' + message.utf8Data);
		            		            
		            if(typeof recipientsObj[req_payload.recipient] !== 'undefined') {
		            	recipientsObj[req_payload.recipient].sendUTF(JSON.stringify(res_payload));
		        	} else {
		        		console.log('This recipient is not in the List');
		        	}	
		        break;
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

		console.log('fileSizeInBytes: ',fileSizeInBytes);

		if(fileSizeInBytes > (100 * 1024) ){
			if(fs.existsSync(`${opts.logFilePath}.old`)) {
				fs.unlinkSync(`${opts.logFilePath}.old`);
			}
			fs.renameSync(`${opts.logFilePath}`,`${opts.logFilePath}.old`);
			log = SimpleNodeLogger.createSimpleLogger(opts);
		}
	} catch(err) {
		console.error(err);
	}
}