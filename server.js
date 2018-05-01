const express = require('express');
const app = express();
const habitat = require('habitat');

habitat.load('.env');

app.use(express.static(__dirname + '/dist'));

app.get('/', (req, res) => {
   res.sendfile(__dirname + '/public/index.html');
});

app.listen(process.env.PORT);
console.log('Listening on port ' + process.env.PORT);