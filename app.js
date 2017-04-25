const express = require("express"),
  passport = require("passport"),
  bodyParser = require("body-parser"),
  mongoose = require("mongoose"),
  app = express(),
  { Schema } = mongoose,
  { Strategy: LocalStrategy } = require("passport-local"),
  expressSession = require("express-session");

const UserSchema = new Schema({
  username: {
    type: String,
    required: true,
    unique: true
  },
  name: String,
  password: {
    type: String,
    required: true
  }
});

const Users = mongoose.model("Users", UserSchema);

mongoose.connect("mongodb://localhost:27017/auth-demo", (err) => {
  if(err) throw new Error(err);
});

app.set("views", "./views");
app.set("view engine", "pug");

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
  extended: true
}));
app.use(express.static("./public"));

app.use(expressSession({
  secret: 'keyboard cat',
  resave: false,
  saveUninitialized: true
}));

app.use(passport.initialize());
app.use(passport.session());

passport.serializeUser(function(user, done) {
  done(null, user.username);
});

passport.deserializeUser(function(username, done) {
  Users.findOne({ username }, function(err, user) {
    done(err, user);
  });
});

passport.use(new LocalStrategy({
    usernameField: "username",
    passwordField: "password"
  },
  function(username, password, done) {
    Users.findOne({ username }, function(err, user) {
      if (err) { return done(err); }
      if (!user) {
        return done(null, false, { message: 'Incorrect username.' });
      }
      if (user.password !== password) {
        return done(null, false, { message: 'Incorrect password.' });
      }
      return done(null, user);
    });
  }
));

app.get("/", (req, res) => {
  // redirect to '/login' if not authorized
  if(!req.user)
    return res.redirect("/login");

  const { username, name } = req.user;

  console.log(req.user);
  res.render("index", { username, name });
});

app.
  route("/login").
  get((req, res) => {
    // redirect to '/' if authorized

    res.render("login");
  }).
  post(passport.authenticate('local'), (req, res) => {
    // get user and auth
    if(!req.user)
      return res.render("login", { err: "Error" });

    res.redirect("/");
  });

app.
  route("/signup").
  get((req, res) => {
    // redirect to '/' if authorized

    res.render("signup");
  }).
  post((req, res) => {
    // create user and auth
    const { username, name = null, password } = req.body;

    Users.create({
      username, name, password
    }, (err, user) => {
      if(err) {
        let errMessage = null;
        switch(err.code) {
          case 11000:
            errMessage = "User already exist";
            break;
          default:
            errMessage = "Try again";
        }
        res.render("signup", { errMessage });
        return;
      }

      console.log(user);
      req.login(user, (err) => {
        if(err)
          return res.render("signup", { err });

        res.redirect("/");
      })

      
    });
  });

app.get("/logout", (req, res) => {
  if(req.user)
    req.logout();

  res.redirect("/login")
})

app.listen(5000, () => {
  console.log("Listen on 5000");
});
