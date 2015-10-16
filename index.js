var express = require('express');
var path = require('path');
//var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
//var Slack = require('node-slack'); // incoming webhook

var routes = require('./routes/index');
var users = require('./routes/users');

var mongoose = require('mongoose');

var app = express();
require('dotenv').load();


app.set('port', (process.env.PORT || 9001));
var databaseUri = process.env.DATABASE_URI || "mongodb://localhost:27017/bbgitlab";
mongoose.connect(databaseUri);

// views is directory for all template files
app.set('views', __dirname + '/views');
app.set('view engine', 'ejs');

app.get('/', function(request, response) {
  response.render('pages/index');
});

app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', routes);
app.use('/users', users);



app.listen(app.get('port'), function() {
  console.log('Node app is running on port', app.get('port'));
});

require('./src/rtm-client');