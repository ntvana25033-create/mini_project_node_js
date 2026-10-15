const express = require('express');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const helmet = require('helmet');
const path = require('path');
const { connectDatabase, MONGODB_URI } = require('./config/database');
const csrfProtection = require('./middleware/csrf');

const app = express();
const PORT = process.env.PORT || 3000;
const isProduction = process.env.NODE_ENV === 'production';
const sessionSecret = process.env.SESSION_SECRET || (isProduction ? '' : 'local-development-session-secret-change-before-deploy');

if (!sessionSecret) throw new Error('Set SESSION_SECRET before starting in production.');
if (isProduction) app.set('trust proxy', 1);

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(helmet({
  contentSecurityPolicy: {
    directives: { 'img-src': ["'self'", 'data:', 'https:'] }
  }
}));
app.use(express.urlencoded({ extended: false }));
app.use(express.json({ limit: '32kb' }));
app.use(express.static(path.join(__dirname, 'public')));
app.use(session({
  name: 'bookportal.sid',
  secret: sessionSecret,
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({ mongoUrl: MONGODB_URI, collectionName: 'sessions' }),
  cookie: { httpOnly: true, sameSite: 'lax', secure: isProduction, maxAge: 8 * 60 * 60 * 1000 }
}));

app.use((req, res, next) => {
  res.locals.currentUser = req.session.user || null;
  next();
});

app.use(csrfProtection);
app.use(require('./routes/authRoutes'));
app.use(require('./routes/bookRoutes'));
app.use('/admin', require('./routes/adminRoutes'));
app.use('/api', require('./routes/apiRoutes'));

app.get('/health', (req, res) => res.json({ status: 'ok' }));

app.use((req, res) => {
  if (req.originalUrl.startsWith('/api/')) return res.status(404).json({ error: 'Endpoint not found.' });
  res.status(404).render('error', { title: 'Page not found', message: 'The page you are looking for does not exist.' });
});

app.use((error, req, res, next) => {
  console.error(error);
  if (res.headersSent) return next(error);
  if (req.originalUrl.startsWith('/api/')) return res.status(500).json({ error: 'Something went wrong.' });
  res.status(500).render('error', { title: 'Something went wrong', message: 'Please try again in a moment.' });
});

connectDatabase()
  .then(() => app.listen(PORT, () => console.log(`Book Review Portal running at http://localhost:${PORT}`)))
  .catch((error) => {
    console.error('Could not connect to MongoDB:', error.message);
    process.exit(1);
  });