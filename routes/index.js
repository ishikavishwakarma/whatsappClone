var express = require("express");
var router = express.Router();
var passport = require("passport");
const users = require("../models/userModel");
var localStrategy = require("passport-local");
const mongoose = require("mongoose");
var multer = require("multer");
const axios = require("axios");


const { render } = require("ejs");
var crypto = require("crypto");
const path = require("path");
const fs = require("fs");
var GoogleStrategy = require("passport-google-oidc");
const userModel = require("../models/userModel");
const chatModel = require("../models/chatModel");
const groupModel = require("../models/groupModel")
const storyModel = require("../models/storyModel");
require("dotenv").config();
passport.use(new localStrategy(users.authenticate()));

mongoose
  .connect(process.env.Mongo)
  .then(() => {
    console.log("connected to db");
  })
  .catch((err) => {
    console.log(err);
  });

  const storage = multer.diskStorage({
    destination: function (req, file, cb) {
      cb(null, './public/images/uploads')
    },
    filename: function (req, file, cb) {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9) + path.extname(file.originalname)
      cb(null, uniqueSuffix)
    }
  })
  function fileFilter(req, file, cb) {
    const filetypes = /jpg|jpeg|png|mp4|avif/;
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = filetypes.test(file.mimetype);
    console.log((path.extname(file.originalname).toLowerCase()))
    console.log((file.mimetype))
    // console.log((req.files.file))
    if (mimetype && extname) {
      cb(null, true)
    } else {
      cb(new Error('please upload right file'))
  
    }
  }
  const upload = multer({ storage, fileFilter, limits: { fileSize: 20000000 } })
  
  
/* GET home page. */
passport.use(
  new GoogleStrategy(
    {
      clientID: process.env["GOOGLE_CLIENT_ID"],
      clientSecret: process.env["GOOGLE_CLIENT_SECRET"],
      callbackURL: "/oauth2/redirect/google",
      scope: ["profile", "email"],
    },
    async function verify(issuer, profile, cb) {
      try {
        console.log(profile);
        let User = await userModel.findOne({ email: profile.emails[0].value });
        if (User) {
          return cb(null, User);
        }

        let newUser = await userModel.create({
          username: profile.displayName,
          email: profile.emails[0].value,
        });
        // console.log(newUser);
        return cb(null, newUser);
      } catch (err) {
        console.log(err);
        return cb(err);
      }
    }
  )
);
/* GET home page. */
router.post('/post', isLoggedIn, upload.single("imageOrVideo"),function (req, res, next) {
  userModel.findOne({ username: req.session.passport.user })
    .then(function (founduser) {
      storyModel.create({
        userid: founduser._id,
        storyimage: req.file ? req.file.filename:null,
        data:req.body.storydata
      })
        .then(function (createdpost) {
          console.log(createdpost)
          founduser.stories.push(createdpost._id)
          console.log(createdpost._id)
          founduser.save()
          .then(function () {
              console.log(founduser)
              console.log("uploaded")
              res.redirect("back")
            })
        })
    });
});
router.post('/upload', isLoggedIn, upload.single("image"), function (req, res, next) {
  userModel.findOne({ username: req.session.passport.user })
    .then(function (founduser) {
      // console.log(founduser)
      if (founduser.image !== 'userimg.jpeg') {
        fs.unlinkSync(`./public/images/uploads/${founduser.image}`)
      }
      founduser.image = req.file.filename;
      // console.log(req.file.filename)
      founduser.save()
        .then(function ( founduser) {
          // console.log(founduser)
          res.redirect("back");
        })
    })
});

router.get("/profile",isLoggedIn, function (req, res, next) {
  userModel
  .findOne({ username: req.session.passport.user })
  .then(function (founduser) {
    console.log(founduser);
    res.render("profile", { founduser });
  });
  
});
router.post('/save-chat',async (req,res)=>{
try{
 var Chat =  new chatModel({
    sender_id:req.body.sender_id,
    receiver_id:req.body.receiver_id,
    message:req.body.message,
  })
  console.log(Chat)
  var newChat = await Chat.save();
 res.status(200).send({success:true,msg:'chat inserted',data:newChat})

}catch(err){
 console.log(err)
}
})
router.get("/",isLoggedIn, function (req, res, next) {
  // userModel.findOne({username:req.session.passport.user})
  // .then(function (onlyuser) {
  userModel
      .find({ username: { $nin:[req.session.passport.user]} })
     
      .then(function (founduser) {
        console.log(founduser);
        res.render("index", { founduser, onlyuser:req.user });
         
      });
  });
// });
router.get("/stories/:id", isLoggedIn, function (req, res, next) {
  userModel
    .findOne({ _id: req.params.id })
    .populate({
      path: "stories",
      match: { date: { $gt: new Date(Date.now() - 24 * 60 * 60 * 1000) } },
    })
    .then(function (user) {
      if (!user) {
        return res.status(404).send("User not found");
      }
      const onlyuser = req.user;
      console.log(onlyuser)
      const userstory = user.stories;
      // userstory.views.push(onlyuser_id)
      // userstory.save()
      // console.log(userstory[0])
      if (!userstory || userstory.length === 0) {
        return res.status(404).send("User has no recent stories");
      }

      res.render("stories", { userstory, user });
    })
    .catch(function (err) {
      console.error(err);
      res.status(500).send("Internal Server Error");
    });
});
router.get("/status",isLoggedIn, function (req, res) {
  userModel
      .find({ username: { $nin:[req.session.passport.user]} })
     
      .then(function (founduser) {
        console.log(founduser);
        storyModel.find({date:{
        $gt:new Date(Date.now()-24*60*60*1000),
        }})
        .populate("userid")
        .then(function(allstories){

          res.render("status", { founduser,onlyuser:req.user,allstories });
        })
      });
  });


// router.get("/chat/:username",isLoggedIn, function (req, res, next) {
//   userModel.findOne({username:req.session.passport.user})
//   .then(function (onlyuser) {
//   userModel
//     .find({ username: { $nin:[req.session.passport.user]} })
//     .then(function (founduser) {
//       console.log(founduser);
//       userModel
//     .findOne({ username: req.params.username})
//     .then(function (founduser) {
//       console.log(founduser);
//       res.render("chat", {founduser});
     
//         });
//       res.render("chat", { founduser,onlyuser });
//     });
//   });
// });
router.get("/chat/:username", isLoggedIn, function (req, res) {
  const loggedInUser = req.session.passport.user;
  const requestedUsername = req.params.username;

  userModel.findOne({ username: requestedUsername }).then(function (founduser) {
    if (!founduser) {
      // Handle case where the requested user isn't found
      return res.status(404).send("User not found");
    }

    userModel.find({ 
      username: { 
        $nin: [loggedInUser, requestedUsername]
      } 
    }).then(function (foundusers) {
      console.log(foundusers);
      res.render("chat", { founduser, foundusers, onlyuser: req.user });
    }).catch(function (error) {
      // Handle the error
      console.error(error);
      res.status(500).send("Internal Server Error");
    });
  }).catch(function (error) {
    // Handle the error
    console.error(error);
    res.status(500).send("Internal Server Error");
  });
});

router.get("/username/:username", async function (req, res, next) {
  const regex = new RegExp(`^${req.params.username}`,'i');
  const users = await userModel.find({username:regex});
res.json(users);
});

router.get("/logiin", function (req, res, next) {
  res.render("logiin");
});
router.get("/group",isLoggedIn, async function (req, res, next) {
  try {
   const groupData = await groupModel.find({creator_id:req.user._id})
   
    res.render("group",{groupData});
  } catch (error) {
    console.log(error)
  }
});
router.get("/createGroup",isLoggedIn, async function (req, res, next) {
  try {
   const groupData = await groupModel.find({creator_id:req.user._id})
   
    res.render("createGroup",{groupData});
  } catch (error) {
    console.log(error)
  }
});
router.post("/group",isLoggedIn, async function (req, res, next) {
  try {
   var group =  new groupModel({
      creator_id:req.user._id,
      groupName:req.body.groupName,
      limit:req.body.limit,
    })
    await group.save()
    console.log(group)
    const groupData = await groupModel.find({creator_id:req.user._id})
    res.render("group",{message:req.body.groupName+"group created successfully",groupData});
  } catch (error) {
    console.log(error)
  }
});

router.post("/get-members ",isLoggedIn, async function(req, res, next) {
  try { 
   var users = await userModel.find()
   consoler.log(users)
      res.status(200).send({ success:true,data:users });
  } catch (error) {
    res.status(400).send({ success:false,msg:error.message });
    
  }
})
router.get("/story",  function (req, res, next) {
  res.render("stories");
});
router.get("/login", isLogout,  function (req, res, next) {
  res.render("login");
});

router.get("/register", function (req, res, next) {
  res.render("register");
});
router.post("/register", function (req, res, next) {
  userModel
    .findOne({ username: req.params.username })
    .then(function (userDetails) {
      if (userDetails) res.send("username are exist");
      else {
        var userDetails = new userModel({
          username: req.body.username,
          email: req.body.email,
          about: req.body.about,
          contact: req.body.contact,
        });

        userModel.register(userDetails, req.body.password).then(function (u) {
          passport.authenticate("local")(req, res, function () {
            res.cookie('user', JSON.stringify(userDetails));
            res.redirect("/");
          });
        });
      }
    });
});
router.post(
  "/login",  isLogout,
  function(req, res, next) {
    passport.authenticate("local", function(err, user, info) {
      if (!user) {
        return res.redirect("/logiin"); // Adjust the redirection as needed
      }
      req.logIn(user, function(err) {
        if (err) {
          console.error(err);
          return res.status(500).send("Login error");
        }
        console.log("Authenticated user:", req.user);
        res.cookie('user', JSON.stringify(req.user), { /* cookie options */ });
      
        res.redirect("/");
        // res.json({message:"success"})
      });
    })(req, res, next);
  }
);
router.get("/login/federated/google", passport.authenticate("google"));

router.get(
  "/oauth2/redirect/google",
  passport.authenticate("google", {
    successRedirect: "/",
    failureRedirect: "/login",
  })
);
router.get("/logout",isLoggedIn, function (req, res, next) {
  req.logout(function (err) {
    if (err) return next(err);
 res.clearCookie('user')
    res.redirect("/login");
  });
});

function isLoggedIn(req, res, next) {
  if (req.isAuthenticated()) {
    return next();
  } else {
    res.redirect("/login");
  }
}
function isLogout(req, res, next){

  try {
      
      if(req.user){
          res.redirect('/');
      }
      next();
  } catch (error) {
      console.log(error.message);
  }

}


module.exports = router;
