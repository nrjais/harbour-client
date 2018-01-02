const http = require('http');
const WebSocket = require('ws');
let port = process.argv[2] || 8000;
let host = process.argv[2] ? 'localhost:' + port : 'exp-sockets.herokuapp.com';
console.log(host);
const ws = new WebSocket('ws://' + host);

ws.on('open', function () {
  console.log('connected to server');
});

ws.on('ping', (stamp) => {
  const client = new WebSocket('ws://' + host);
  client.on('open', function () {
    client.ping(stamp);
    requestSender(client);
  });
});
ws.on('message', function (data) {
  console.log(data);
});

let requestSender = function (server) {
  let options = {
    hostname: 'localhost',
    port: 8888,
    protocol: 'http:'
  }

  let url = (data) => {
    options.path = data;
  }

  let method = (data) => {
    options.method = data;
  }

  let reqTransfer = '';

  let headers = (data) => {
    options.headers = JSON.parse(data);
    delete options.headers.host;
    createRequest();
  };

  let createRequest = function () {
    reqTransfer = http.request(options, function (resp) {
      server.send(resp.statusCode);
      server.ping();
      server.send(JSON.stringify(resp.headers));
      server.ping();
      resp.on('data', (data) => {
        server.send(data);
      });
      resp.on('end', () => {
        server.ping();
        server.close();
      });
    });
    reqTransfer.on('error', (e) => {
      console.error(`problem with request: ${e.message}`);
    });
  }

  let data = (d) => {
    reqTransfer.write(d);
  }

  let end = function () {
    reqTransfer.end();
  }

  let collecters = [method, headers, data];
  let currentCollector = url;

  server.on('message', function (data) {
    currentCollector(data);
  });

  server.on('ping', () => {
    currentCollector = collecters.shift();
    if (!currentCollector) {
      end();
    }
  });
}