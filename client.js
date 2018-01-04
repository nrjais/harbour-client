const http = require('http');
const WebSocket = require('socket.io-client');

const quit = function (message) {
  console.log(message);
  console.log("usage => node tunnel 'host' 'localhost port'");
  console.log("example => node tunnel www.example.com 8000");
  process.exit();
}

let host = process.argv[2] || quit("No host");
let forwardPort = process.argv[3] || quit('No port given for localhost');

const socket = WebSocket('ws://' + host);

socket.on('connect', function () {
  console.log('Connected to ' + host);
});

socket.on('handshake', (id) => {
  const client = WebSocket('ws://' + host);
  client.on('connect', function () {
    client.emit('handshake', id);
    forwardRequest(client);
  });
});

let forwardRequest = function (tunnel) {
  let options = {
    hostname: 'localhost',
    port: forwardPort,
    protocol: 'http:'
  }
  let request = undefined;
  tunnel.on('url', bindArgsTo(setPath, options));
  tunnel.on('method', bindArgsTo(setMethod, options));
  tunnel.on('headers', bindArgsTo(setHeaders, options));
  tunnel.on('headers', () => request = createRequest(options, tunnel));
  tunnel.on('data', data => writeData(request, data));
  tunnel.on('end', () => request.end());
}

const logReq = function(options){
  console.log(`${options.method} ${options.path}`);
}

let createRequest = function (options, tunnel) {
  logReq(options);
  let req = http.request(options, function (res) {
    sendToTunnel(tunnel, res);
  });
  req.on('error', (e) => {
    console.error(`problem with request: ${e.message}`);
    tunnel.emit('err', e.message);
  });
  return req;
}

const sendToTunnel = function (tunnel, res) {
  tunnel.emit('statusCode', res.statusCode);
  tunnel.emit('headers', JSON.stringify(res.headers));
  res.on('data', (data) => {
    tunnel.emit('data', data);
  });
  res.on('end', () => {
    tunnel.emit('end');
    tunnel.close();
  });
}

let bindArgsTo = (fun, ...arg) => fun.bind(null, ...arg);

let writeData = function (req, chunk) {
  req.write(chunk);
}

let setPath = function (options, url) {
  options.path = url;
}

let setMethod = function (options, method) {
  options.method = method;
}

let setHeaders = function (options, headers) {
  options.headers = JSON.parse(headers);
  delete options.headers.host;
};