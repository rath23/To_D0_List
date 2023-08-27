const express = require("express");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
//const date = require(__dirname + "/date.js");
const _ = require("lodash");
require('dotenv').config();

const session = require("express-session");
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");

const app = express();


console.log(typeof(process.env.SECRET));

app.use(express.static("public"));
app.set("view engine", "ejs");
app.use(bodyParser.urlencoded({ extended: true }));

app.use(
  session({
    secret: process.env.SECRET,
    resave: false,
    saveUninitialized: false,
  })
);

app.use(passport.initialize());
app.use(passport.session());

main().catch((err) => console.log(err));

async function main() {
  await mongoose.connect("mongodb+srv://syyed_muneer_ahmad:"+process.env.MONGOOSE_PASS+"@cluster0.b57z4hq.mongodb.net/todolistDB");
  console.log("Data Base server started");
}

const itemSchema = new mongoose.Schema({
  name: String,
});
const Item = mongoose.model("Item", itemSchema);

const item1 = new Item({
  name: "Welcome to our ToDo-List!",
});

const item2 = new Item({
  name: "Hit + button to add a new item.",
});

const item3 = new Item({
  name: "<-- Hit to delete a item.",
});

const userSchema = new mongoose.Schema({
  email: String,
  password: String,
  userName: String,
  items: [itemSchema],
});

userSchema.plugin(passportLocalMongoose, { usernameField: "email" });

const User = mongoose.model("User", userSchema);

passport.use(User.createStrategy());
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

app.get("/", (req, res) => {
  res.render("home");
});

app.get("/login", (req, res) => {
  const loginFailed = req.query.login_failed;
  const reason = req.query.reason;

  let message = "";
  if (loginFailed && reason === "user_not_found") {
    message = "User was not found. Please check your credentials or register.";
  }

  res.render("login", { message });
});

app.get("/register", (req, res) => {
  res.render("register");
});

app.get("/:customListName", async function (req, res) {
  const customListName = _.capitalize(req.params.customListName);
  if (req.isAuthenticated()) {
    try {
      const foundUser = await User.findOne({ userName: customListName }).exec();
      if (foundUser) {
        if (foundUser.items.length === 0) {
          foundUser.items.push(item1);
          foundUser.items.push(item2);
          foundUser.items.push(item3);
          await foundUser.save();
          res.render("list", {
            listTitle: customListName,
            newListItems: foundUser.items,
          });
        } else {
          res.render("list", {
            listTitle: customListName,
            newListItems: foundUser.items,
          });
        }
      } else {
        res.redirect("/register");
      }
    } catch (err) {
      console.log(err);
    }
  } else {
    res.redirect("/login");
  }
});

app.post("/list", async function (req, res) {
  if (req.isAuthenticated()) {
    const itemName = req.body.newItem;
    const listTitle = req.body.list;

    const newItem = new Item({
      name: itemName,
    });

    try {
      const foundUser = await User.findOne({ userName: listTitle }).exec();
      console.log(foundUser);
      foundUser.items.push(newItem);
      await foundUser.save();
      res.redirect("/" + foundUser.userName);
    } catch (err) {
      res.send(err);
    }
  } else {
    res.send("failed");
  }
});

app.post("/delete", async function (req, res) {
  // there is also a await Model.findByIdAndRemove(id) to delete a doc that matches the id note we don't need ({_id:id})

  const deletingItem = req.body.checkbox;
  const listName = req.body.listName;
  console.log(deletingItem);
  try {
    await User.findOneAndUpdate(
      { userName: listName },
      { $pull: { items: { _id: deletingItem } } }
    );
    res.redirect("/" + listName);
  } catch (err) {
    console.log(err);
  }
});

app.post("/register", function (req, res) {
  const userName = _.capitalize(req.body.userName);
  const { email, password } = req.body;
  const user = new User({ userName, email });
  User.register(user, password, function (err, user) {
    if (err) {
      console.log(err);
      res.redirect("/register");
    } else {
      passport.authenticate("local")(req, res, function () {
        res.redirect("/" + userName);
      });
    }
  });
});

//Bellow code didn't redirect to register route

/*app.post("/login", async (req, res) => {
  const user = new User({
    email: req.body.email,
    password: req.body.password,
  });
  req.login(user, function (err) {
    if (err) {
      console.log(err);
    } else {
      passport.authenticate("local")(req, res, async function () {
        const userName = req.user.userName;
        res.redirect("/" + userName);
        
      });
    }
  });
});*/

app.post("/login", async (req, res, next) => {
  const user = new User({
    email: req.body.email,
    password: req.body.password,
  });

  req.login(user, async function (err) {
    if (err) {
      console.log(err);
      return res.status(500).send("Internal Server Error");
    } else {
      passport.authenticate("local", function (err, user, info) {
        if (err) {
          console.log(err);
          return res.status(500).send("Internal Server Error");
        }

        if (!user) {
          // Redirect to the register route if user is not found
          return res.redirect("/login?login_failed=true&reason=user_not_found");
        }

        req.logIn(user, function (err) {
          if (err) {
            console.log(err);
            return res.status(500).send("Internal Server Error");
          }

          const userName = req.user.userName;
          return res.redirect("/" + userName);
        });
      })(req, res, next);
    }
  });
});

app.post("/logout", function (req, res) {
  req.logout(function (err) {
    if (err) {
      console.log(err);
    } else {
      res.redirect("/");
    }
  });
});

app.listen(3000, function () {
  console.log("Server started on port 3000");
});
