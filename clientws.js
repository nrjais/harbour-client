const http = require('http');
const WebSocket = require('socket.io-client');

let host = process.argv[2] || process.exit();
let forwardPort = process.argv[3] || process.exit();

console.log(host);
const ws = WebSocket('ws://' + host);

ws.on('connect', function () {
  console.log('connected to server');
});

ws.on('handshake', (stamp) => {
  const client = WebSocket('ws://' + host);
  client.on('connect', function () {
    // console.log('req start');
    client.emit('handshake', stamp);
    forwardRequest(client);
  });
});

let forwardRequest = function (server) {
  let options = {
    hostname: 'localhost',
    port: forwardPort,
    protocol: 'http:'
  }
  let reqTransfer = undefined;

  let createRequest = function () {
    reqTransfer = http.request(options, function (resp) {
      server.emit('statuscode', resp.statusCode);
      server.emit('headers', JSON.stringify(resp.headers));
      resp.on('data', (data) => {
        server.emit('data', data);
      });
      resp.on('end', () => {
        server.emit('end');
        server.close();
      });
    });
    reqTransfer.on('error', (e) => {
      console.error(`problem with request: ${e.message}`);
    });
  }

  server.on('url', bindArgsTo(url, options));
  server.on('method', bindArgsTo(method, options));
  server.on('headers', bindArgsTo(headers, options));
  server.on('headers', createRequest);
  server.on('data', data => writeData(reqTransfer,data));
  server.on('end',()=>end(reqTransfer));
}

let bindArgsTo = (fun, ...arg) => fun.bind(null, ...arg);

let writeData = function (req, chunk) {
  req.write(chunk);
}

let end = function (req) {
  req.end();
}

let url = function (options, url) {
  console.log(url);
  options.path = url;
}

let method = function (options, method) {
  options.method = method;
}

let headers = function (options, headers) {
  options.headers = JSON.parse(headers);
  delete options.headers.host;
};