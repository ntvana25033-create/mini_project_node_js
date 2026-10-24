const express = require('express');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const helmet = require('helmet');
const { connectDatabase, MONGODB_URI } = require('./config/database');
const appConfig = require('../app.config.cjs');
const csrfProtection = require('./middleware/csrf');

const app = express();
const PORT = Number(process.env.PORT || appConfig.backend.port);
const HOST = process.env.HOST || appConfig.backend.host;
const isProduction = process.env.NODE_ENV === 'production';
const sessionSecret = process.env.SESSION_SECRET || (isProduction ? '' : 'local-development-session-secret-change-before-deploy');
const allowedOrigins = (process.env.FRONTEND_ORIGIN || `http://${appConfig.frontend.host}:${appConfig.frontend.port}`).split(',').map((origin) => origin.trim());
const cookieSameSite = process.env.SESSION_COOKIE_SAME_SITE || appConfig.session.cookieSameSite;

if (!sessionSecret) throw new Error('Set SESSION_SECRET before starting in production.');
if (!['lax', 'strict', 'none'].includes(cookieSameSite)) throw new Error('SESSION_COOKIE_SAME_SITE must be lax, strict, or none.');
if (isProduction) app.set('trust proxy', 1);

app.use((req, res, next) => {
  const origin = req.get('origin');
  if (origin && allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Vary', 'Origin');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-CSRF-Token');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, PUT, DELETE, OPTIONS');
  }
  if (req.method === 'OPTIONS') return res.sendStatus(origin && !allowedOrigins.includes(origin) ? 403 : 204);
  next();
});
app.use(helmet({
  contentSecurityPolicy: {
    directives: { 'img-src': ["'self'", 'data:', 'https:'] }
  }
}));
app.use(express.json({ limit: '32kb' }));
app.use(session({
  name: 'bookportal.sid',
  secret: sessionSecret,
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({ mongoUrl: MONGODB_URI, collectionName: 'sessions' }),
  cookie: { httpOnly: true, sameSite: cookieSameSite, secure: isProduction || cookieSameSite === 'none', maxAge: 8 * 60 * 60 * 1000 }
}));
app.use(csrfProtection);
app.use('/api', require('./routes/apiRoutes'));

app.get('/health', (req, res) => res.json({ status: 'ok' }));

app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found.' });
});

app.use((error, req, res, next) => {
  console.error(error);
  if (res.headersSent) return next(error);
  res.status(500).json({ error: 'Something went wrong.' });
});

connectDatabase()
  .then(() => app.listen(PORT, HOST, () => console.log(`Book Review Portal running at http://${HOST}:${PORT}`)))
  .catch((error) => {
    console.error('Could not connect to MongoDB:', error.message);
    process.exit(1);
  });