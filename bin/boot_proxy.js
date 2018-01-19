#!/usr/bin/env node

var spawn = require('child_process').spawn;
var http = require('http');
var httpProxy = require('http-proxy');


var USE_BOOT_PROXY = (['1', 'true', 'yes', 1].indexOf((process.env.USE_BOOT_PROXY || '').toLowerCase()) !== -1);

var PORT = process.env.PORT || 3000;
var SUBPROCESS_PORT = parseInt(process.env.SUBPROCESS_PORT) || 3030;
var PING_PATH = process.env.PING_PATH || '/';
var PING_INTERVAL = parseInt(process.env.PING_PATH) || 1;
var BOOT_TIMEOUT = parseInt(process.env.BOOT_TIMEOUT) || 60 * 60;


var ROOT_URL = process.env.ROOT_URL;
var HEROKU_APP_NAME = process.env.HEROKU_APP_NAME;

if (!ROOT_URL && HEROKU_APP_NAME) {
  ROOT_URL = 'https://' + HEROKU_APP_NAME + '.herokuapp.com';
} else {
  ROOT_URL = 'http://localhost';
}


var child;
function start_subprocess() {
  var command = process.argv.splice(2).join(' ');
  var env = Object.assign({}, process.env);

  env.ROOT_URL = ROOT_URL;
  if (USE_BOOT_PROXY) {
    env.PORT = SUBPROCESS_PORT;
  }

  child = spawn(command, {
    stdio: 'inherit',
    shell: true,
    env: env,
  });


  child.on('close', function (code) {
    process.exit(code);
  });

  child.on('error', function (err) {
    console.error(`Failed to run: ${command}`);
    console.error(err);
    process.exit(127);
  });


  return child;
}



start_subprocess();

if (USE_BOOT_PROXY) {
  var booted = false;

  var pinger = setInterval(function () {
    var options = {
      port: SUBPROCESS_PORT,
      method: 'GET',
      path: PING_PATH,
      timeout: (1000*PING_INTERVAL) / 2,
    };

    var req = http.request(options, function (res) {
      if (res.statusCode !== 200) {
        return;
      } else {
        console.log('Application booted');
        clearInterval(pinger);
        booted = true;
      }
    });

    req.on('error', function (e) {
      // Silence is golden...
      // console.error(`problem with request: ${e.message}`);
    });
    req.end();
  }, 1000*PING_INTERVAL);



  var proxy = new httpProxy.createProxyServer({
    target: {
      port: SUBPROCESS_PORT,
    },
    ws: true,
  });

  var proxyServer = http.createServer(function (req, res) {
    if (booted) {
      proxy.web(req, res);
    } else {
      res.writeHead(200, { 'Content-Type': 'text/plain' });
      res.end('Waiting for app to boot...');
    }
  });

  proxyServer.on('upgrade', function (req, socket, head) {
    proxy.ws(req, socket, head);
  });

  proxyServer.listen(PORT);

  setTimeout(function () {
    if (!booted) {
      console.error('Application not booted after ' + BOOT_TIMEOUT + ' seconds. Quitting...');
      child.kill();
      process.exit(64);
    }
  }, BOOT_TIMEOUT*1000);
}


// Dummy interval to keep main loop busy so we don't exit early.
setInterval(function () { }, 1000)
