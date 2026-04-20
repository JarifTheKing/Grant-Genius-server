const https = require('https');

const options = {
  hostname: 'grant-genius-server-one.vercel.app',
  path: '/users',
  method: 'OPTIONS',
  headers: {
    'Origin': 'https://grant-genius-client.vercel.app',
    'Access-Control-Request-Method': 'GET',
    'Access-Control-Request-Headers': 'content-type'
  }
};

const req = https.request(options, (res) => {
  console.log('Status Code:', res.statusCode);
  console.log('Headers:', JSON.stringify(res.headers, null, 2));
});

req.on('error', (e) => {
  console.error(e);
});

req.end();
