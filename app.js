require('dotenv').config();

var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var cors = require('cors');

// Initialize database
require('./config/database');

var indexRouter = require('./routes/index');
var usersRouter = require('./routes/users');

var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');

// Middleware
app.use(logger('dev'));

// Body parser - skip for Slack routes as ExpressReceiver handles its own parsing
app.use((req, res, next) => {
  if (req.path.startsWith('/slack')) {
    return next();
  }
  express.json()(req, res, next);
});

app.use((req, res, next) => {
  if (req.path.startsWith('/slack')) {
    return next();
  }
  express.urlencoded({ extended: false })(req, res, next);
});

app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
app.use(cors());

// Routes
app.use('/', indexRouter);
app.use('/users', usersRouter);

// API and Slack routes will be added dynamically in bin/www after Socket.IO is initialized

// Export app without error handlers - they will be added in bin/www after routes
module.exports = app;
