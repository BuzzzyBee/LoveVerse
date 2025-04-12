require( 'dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const path = require('path');
const bodyParser = require('body-parser');
const app = express();

// === Middleware === //
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
      mongoUrl: process.env.MONGO_URI || 'mongodb://localhost:27017/loveverse',
      ttl: 60 * 60 // session expiry in seconds (1 hour)
    }),
    cookie: {
      maxAge: 1000 * 60 * 60 // 1 hour
    }
  }));

// === MongoDB Connection === //
mongoose.connect(process.env.MONGO_URI,  {
    useNewUrlParser: true,
    useUnifiedTopology: true
})
.then(() => console.log('Connected to MongoDB'))
.catch(err => console.error('mongodb connection error:', err));

// === User Schema & Model === //
const userSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true }
});

const User = mongoose.model('User', userSchema);

// === Routes === //

// Landing Page
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Login Page
app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

// Dashboard (after login)
app.get('/dashboard', (req, res) => {
    if (!req.session.user) {
        return res.redirect('/login');
    }
    res.send(`<h1>Welcome to LoveVerse, ${req.session.user.username}!</h1>`);
});

// Login Handler
app.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        const user = await User.findOne({ username });

        if (!user) {
            return res.status(400).send('<h1>Username not found. Try again.</h1>');
        }

        const isMatch = await bcrypt.compare(password, user.password);

        if (isMatch) {
            req.session.user = user;
            res.redirect('/dashboard');
        } else {
            res.status(400).send('<h1>Invalid password. Try again.</h1>');
        }
    } catch (err) {
        console.error(err);
        res.status(500).send('<h1>Internal Server Error</h1>');
    }
});

// Registration Handler
app.post('/register', async (req, res) => {
    try {
        const { username, password } = req.body;
        const existingUser = await User.findOne({ username });

        if (existingUser) {
            return res.status(400).send('<h1>Username already taken. Choose another one.</h1>');
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = new User({ username, password: hashedPassword });

        await newUser.save();
        res.send('<h1>User registered successfully. You can now log in.</h1>');
    } catch (err) {
        console.error(err);
        res.status(500).send('<h1>Internal Server Error</h1>');
    }
});

// Logout Route
app.get('/logout', (req, res) => {
    req.session.destroy(() => {
        res.redirect('/');
    });
});

// === Start the Server === //
const PORT = process.env.PORT || 1993
;
app.listen(PORT, () => {
    console.log(`LoveVerse server is live on http://localhost:1993`);
});