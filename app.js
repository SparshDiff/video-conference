// Contents
// Requiring Modules --------------------------------- Line 14-37
// Connecting to Database & Storing of sessions ------ Line 39-52
// Middlewares --------------------------------------- Line 54-66
// Schemas ------------------------------------------- Line 73-159
// User Auth function -------------------------------- Line 166-177
// Node Mailer function ------------------------------ Line 182-215
// Get Routes ---------------------------------------- Line 221-654
// Post Routes --------------------------------------- Line 659-980
// Sockets ------------------------------------------- Line 986-1068
// Cron scheduler ------------------------------------ Line 1075-1118


const express = require('express');
const app = express();
const bcrypt = require('bcryptjs')
const session = require('express-session');
const mongoDbSession = require('connect-mongodb-session')(session)
const server = require('http').Server(app); //Because we want to reuse the HTTP server for socket.io
const io = require('socket.io')(server);
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const path = require('path');
const {
  v4: uuidV4
} = require('uuid');
const {
  validate: uuidValidate
} = require('uuid');
const {
  ExpressPeerServer
} = require('peer');
const peerServer = ExpressPeerServer(server, {
  debug: true
});
const nodemailer = require("nodemailer")
const cors = require('cors');
const cron = require('node-cron');


// Serve static files from the 'public' directory
app.use('/static', express.static(path.join(__dirname, 'public')));


const uri = 'mongodb+srv://smartsparsh04:ky0BEhKfRNAxzVAK@cluster0.vscgxuk.mongodb.net/?retryWrites=true&w=majority';
mongoose.connect(uri, {
  useNewUrlParser: true,
  useCreateIndex: true,
  useUnifiedTopology: true
});
const store = new mongoDbSession({
  uri: uri, //"mongodb://localhost:27017/touchDB",
  collection: "sessions"
})
const Schema = mongoose.connection;
Schema.once('open', function () {
  console.log('Database Connected!')
});

app.use(bodyParser.urlencoded({
  extended: true
}));

app.use(express.static('static'));
app.use('/peerjs', peerServer);
app.set('view engine', 'ejs');
app.use(cors());
app.use(session({
  secret: "fasdasdf",
  resave: false,
  saveUninitialized: false,
  store: store
}))


// ---------------------------------------------------------------------
// -------------------------------SCHEMAS-------------------------------
// ---------------------------------------------------------------------

let ChatSchema = new mongoose.Schema({
  user: {
    type: String,
    required: true
  },
  text: {
    type: String,
    required: true
  }
})
const Chat = mongoose.model("Chat", ChatSchema);

let MeetSchema = new mongoose.Schema({
  meetname: {
    type: String,
    required: true
  },
  meethost: {
    type: String,
    required: true
  },
  meetdetails: {
    type: String,
    required: true
  },
  startdate: {
    type: String,
    required: true
  },
  starttime: {
    type: String,
    required: true
  },
  enddate: {
    type: String,
    required: true
  },
  endtime: {
    type: String,
    required: true
  },
  status: Number, //Check for the meet is cancelled or not
  reminder: Number, //When the server reminds the users of this meet at the 'starttime' it changes this to 1
  chats: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Chat'
  }]
})
const Meet = mongoose.model("Meet", MeetSchema);

let UserSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
  },
  password: {
    type: String,
    required: true,
  },
  groups: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Group'
  }]
})
const User = mongoose.model("User", UserSchema);

let GroupSchema = new mongoose.Schema({
  groupname: {
    type: String,
    required: true
  },
  groupkey: {
    type: String,
    required: true
  },
  meets: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Meet'
  }],

})
const Group = mongoose.model("Group", GroupSchema);


// ---------------------------------------------------------------------
// -----------------------------USER AUTH-------------------------------
// ---------------------------------------------------------------------
// Function to check if user is logged in or not
const isAuth = function (req, res, next) {
  if (req.session.isAuth) {
    next()
  } else {
    req.session.error = '';
    res.render('login', {
      isAuth: req.session.isAuth,
      message: "You are not logged in!",
      title: "Log In | "
    })
  }
}

// ---------------------------------------------------------------------
// -------------------------------NODE MAILER---------------------------
// ---------------------------------------------------------------------
function mail(from, to, meet, type) {
  let mailTransporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true, // use TLS
    auth: {
      user: '20ucs199@lnmiit.ac.in',
      pass: process.env.PASSWORD
    }
  });
  let message = ""
  if (type == "reminder") {
    message += `Dear ` + to.username + `<br>This mail is to remind you about the meet ` + meet.meetname + ` .<br>` + meet.meetdetails + `<br>Timings: ` + meet.startdate + ` ` + meet.starttime + `<br> <a href="https://engage-keep-in-touch.herokuapp.com/meet/` + meet._id + `/` + meet.meetname + `">MeetLink</a><br>Regards <br>` + meet.meethost
  } else if (type == "invite") {
    message += `Dear ` + to.username + `<br>This mail is to invite you about the meet ` + meet.meetname + ` .<br>` + meet.meetdetails + `<br>Timings: ` + meet.startdate + ` ` + meet.starttime + `<br> <a href="https://engage-keep-in-touch.herokuapp.com/meet/` + meet._id + `/` + meet.meetname + `">MeetLink</a><br> Regards <br>` + meet.meethost
  } else if (type == "cancel") {
    message += `Dear ` + to.username + `<br>This is to inform you with regret that the meet ` + meet.meetname + ` is cancelled.<br> Regards <br>` + from.username
  } else if (type == "undocancel") {
    message += `Dear ` + to.username + `<br>This is to inform you that the event ` + meet.meetname + ` is not cancelled. <br>` + meet.meetdetails + `<br>Timings: ` + meet.startdate + ` ` + meet.starttime + `<br> <a href="https://engage-keep-in-touch.herokuapp.com/meet/` + meet._id + `/` + meet.meetname + `">MeetLink</a><br> Regards <br>` + from.username
  }
  let mailDetails = {
    to: to.email,
    subject: 'KEEP IN TOUCH | ' + meet.meetname,
    html: message
  };

  mailTransporter.sendMail(mailDetails, function (err, data) {
    if (err) {
      console.log(err);
    }
  });
}

// ---------------------------------------------------------------------
// -----------------------------GET ROUTES------------------------------
// ---------------------------------------------------------------------

app.get('/', function (req, res) {
  req.session.error = '';
  res.render('home', {
    isAuth: req.session.isAuth,
    title: ''
  });
});

// ${uuidV4} generates an uuid.
app.get('/hostmeet', function (req, res) {
  req.session.error = '';
  res.redirect(`/hostmeet/${uuidV4()}`);
});
app.get('/hostmeet/:meet', function (req, res) {
  if (uuidValidate(req.params.meet)) { //validates if used a proper uuidV4
    req.session.error = '';
    res.render('hostmeet', {
      meetId: req.params.meet,
      isAuth: req.session.isAuth,
      title: 'Host | '
    });
  } else {
    req.session.error = '';
    res.redirect(`/hostmeet/${uuidV4()}`)
  }
})

app.get('/joinmeet', function (req, res) {
  req.session.error = '';
  res.render('joinmeet', {
    isAuth: req.session.isAuth,
    message: "",
    title: "Join | "
  });
})

app.get('/whiteboard/:meet', function (req, res) {
  res.render('whiteboard', {
    meetId: req.params.meet,
    isAuth: req.session.isAuth,
    title: "Collab | "
  });
})

// Screen sharing routes one for the person sharing and other for the audience
app.get('/share/:meet', function (req, res) {
  res.render('sharescreen', {
    title: "Screen | ",
    meetId: req.params.meet,
    isAuth: req.session.isAuth,
  });
})
app.get('/display/:meet', function (req, res) {
  res.render('displayscreen', {
    meetId: req.params.meet,
    isAuth: req.session.isAuth,
    title: "Screen | "
  });
})

app.get('/login', function (req, res) {
  if (req.session.isAuth) { //if user is already logged in redirects to the dashboard
    req.session.error = '';
    res.redirect('/dashboard')
  } else {
    res.render('login', {
      isAuth: req.session.isAuth,
      message: req.session.error,
      title: "Log In |"
    });
  }
})
app.get('/signup', function (req, res) {
  if (req.session.isAuth) { //if user is already logged in redirects to the dashboard
    req.session.error = '';
    res.redirect('/dashboard')
  } else {
    res.render('signup', {
      isAuth: req.session.isAuth,
      message: req.session.error,
      title: "Sign Up | "
    })
  }
})

//This is the room route for signed up users as these meets have a title and require stored chats
app.get('/meet/:meet/:title', isAuth, function (req, res) {
  let meetId = req.params.meet
  let title = req.params.title + " | "
  let user = req.session.user
  let video = true
  let audio = true
  //'Not' checking if the user is part of the group to allow other logged in users to the meet
  User.findOne({
    _id: user
  }, function (err, foundUser) {
    if (err) {
      req.session.destroy((err) => {
        res.render('login', {
          isAuth: req.session.isAuth,
          message: "You are not logged in!",
          title: "Log In |"
        });
      })
    } else {
      Meet.findOne({
        _id: meetId
      }).populate('chats').exec(function (err, meet) { //Fetches chats
        if (err) {
          res.redirect('/dashboard');
        } else {
          res.render('meet', {
            meet: meet,
            chats: meet.chats,
            meetId: meetId,
            title: title,
            userName: foundUser.username,
            video: video,
            audio: audio,
            isAuth: req.session.isAuth,
          })
        }
      })
    }
  })
})
app.get('/hangup', function (req, res) {
  if (req.session.user) { //If logged in redirects to dashboard
    res.redirect('/dashboard')
  } else { //Else to the join page
    res.redirect('/joinmeet')
  }
})
app.get('/dashboard', isAuth, function (req, res) {
  User.findOne({ // Fetches all groups this user is a part of
    _id: req.session.user
  }).populate('groups').exec(function (err, user) {
    if (err) {
      res.render('login', {
        isAuth: req.session.isAuth,
        message: "You are not logged in!",
        title: "Log In | "
      })
    } else {
      let message = req.session.error;
      req.session.error = ""
      res.render('dashboard', {
        groups: user.groups,
        thisgroup: '',
        meets: [],
        members: [],
        user: user,
        message: message,
        isAuth: req.session.isAuth,
        title: 'Dashboard | '
      })
    }
  })

})
app.get('/dashboard/:group', isAuth, async function (req, res) { //Group's Dashboard
  let groups = [];
  let members = await User.find({ //fetches members of this group
    groups: req.params.group
  }, function (err, members) {
    if (!members) {
      req.session.error = "Group doesn't exists!"
      return res.redirect('/dashboard');
    }
  });


  User.findOne({ // Fetches all groups this user is a part of
    _id: req.session.user,
    groups: req.params.group
  }).populate('groups').exec(function (err, user) { //Fetches groups of this user
    if (!user) { //If user is accessing this group wrongfully
      req.session.error = 'Your are not part of this group!'
      return res.redirect('/dashboard');
    } else {
      groups = user.groups;
      Group.findOne({ //Fetches all the meets of this particular group
        _id: req.params.group
      }).populate('meets').exec(function (err, group) {
        if (err || !group) {
          res.redirect('/dashboard');
        } else {
          let message = req.session.error;
          req.session.error = "";
          res.render('dashboard', {
            groups: groups,
            thisgroup: group,
            user: req.session.user,
            meets: group.meets,
            message: message,
            members: members,
            isAuth: req.session.isAuth,
            title: group.groupname + " | "
          })
        }
      })
    }
  });
})
app.get('/chat/:group/:meet', isAuth, function (req, res) { //Chat page of a meet
  User.findOne({
    _id: req.session.user,
    groups: req.params.group
  }).populate('groups').exec(function (err, user) {
    if (!user) { //If the user is accessing a group wrongfully
      req.session.error = "You are not part of this group!"
      return res.redirect('/dashboard');
    } else {
      groups = user.groups;
      userName = user.username;
      Meet.findOne({ //Checks if the meet exists
        _id: req.params.meet
      }).populate('chats').exec(function (err, meet) {
        if (err) {
          req.session.error = "Meet does not exist!"
          res.redirect('/dashboard');
        } else {
          res.render('chat', {
            groups: groups,
            thisgroup: '',
            userName: userName,
            meet: meet,
            message: "",
            chats: meet.chats,
            isAuth: req.session.isAuth,
            title: meet.meetname + " | "
          })
        }
      })
    }
  })
})
app.get('/reminder/:group/:meet', isAuth, async function (req, res) { //reminder route
  let meet = await Meet.findOne({ //Checks if the meetid is proper
    _id: req.params.meet
  }, function (err, meet) {
    if (!meet) {
      req.session.error = "Meet does not exist!"
      return res.redirect("/dashboard/" + req.params.group);
    }
  })

  let user = await User.findOne({ //Checks if the user is the part of this meet
    _id: req.session.user,
    groups: req.params.group
  }, function (err, meet) {
    if (!meet) {
      req.session.error = "You are not part of this group!"
      return res.redirect('/dashboard');
    }
  })
  User.find({ //Finds all users of this group
    groups: req.params.group
  }, function (err, members) {

    members.forEach(function (member) { //Mails each one of them
      mail(user, member, meet, "reminder")
    })

    res.redirect('/dashboard/' + req.params.group)
  })

})

app.get('/group', isAuth, function (req, res) { //Group creating route
  res.render('creategroup', {
    isAuth: req.session.isAuth,
    message: '',
    title: "Create Group | "
  })
})
app.get('/joingroup', isAuth, function (req, res) { //Group joining route
  res.render('joingroup', {
    isAuth: req.session.isAuth,
    message: '',
    title: 'Join Group | '
  })
})

app.get("/leave/:group", isAuth, function (req, res) { //Group leaving route
  const group = req.params.group;
  const user = req.session.user;
  User.findOneAndUpdate({
    _id: user
  }, {
    $pull: {
      groups: group
    }
  },
    function (err, foundList) {
      if (!err) {
        res.redirect("/dashboard");
      } else {
        req.session.destroy((err) => {
          res.render('login', {
            isAuth: req.session.isAuth,
            message: "You are not logged in!",
            title: "Log In |"
          });
        })
      }
    });
});

app.get('/createmeet/:group', isAuth, async function (req, res) { //Meet creating route
  let user = await User.findOne({ //Checks if the user is part of this group
    _id: req.session.user,
    groups: req.params.group
  }, function (err, user) {
    if (!user) {
      req.session.error = "You are not part of this group!"
      return res.redirect('/dashboard');
    }
  })
  let message = req.session.error;
  req.session.error = ""
  res.render('createmeet', {
    isAuth: req.session.isAuth,
    groupid: req.params.group,
    message: message,
    title: "Create Meet | "
  });

})
app.get('/cancelmeet/:group/:meet', isAuth, async function (req, res) { //Cancels meet
  let meet = await Meet.findOne({ //Checks if the meet exists
    _id: req.params.meet
  }, function (err, meet) {
    if (!meet) {
      req.session.error = "Meet does not exist!"
      return res.redirect("/dashboard/" + req.params.group);
    }
  })

  let user = await User.findOne({ //Checks if the user is part of this group
    _id: req.session.user,
    groups: req.params.group
  }, function (err, user) {
    if (!user) {
      req.session.error = "You are not part of this group!"
      return res.redirect('/dashboard');
    }
  })

  Meet.updateOne({ //Sets status to one
    _id: req.params.meet
  }, {
    $set: {
      status: 1
    }
  }, function (err, foundMeet) {
    if (!err) {
      User.find({
        groups: req.params.group
      }, function (err, users) {
        users.forEach(function (subuser) {
          mail(user, subuser, meet, "cancel")
        })
        req.session.error = "";
        res.redirect('/dashboard/' + req.params.group)
      })
    }
  })
})
app.get('/undomeet/:group/:meet', isAuth, async function (req, res) { //Undo cancel meet
  let meet = await Meet.findOne({ //Checks if the meet exist
    _id: req.params.meet
  }, function (err, meet) {
    if (!meet) {
      req.session.error = "Meet does not exist!"
      return res.redirect("/dashboard/" + req.params.group);
    }
  })

  let user = await User.findOne({ //Checks if the user is part of this meet
    _id: req.session.user,
    groups: req.params.group
  }, function (err, user) {
    if (!user) {
      req.session.error = "You are not part of this group!"
      return res.redirect('/dashboard');
    }
  })

  Meet.updateOne({ //Set status to 0
    _id: req.params.meet
  }, {
    $set: {
      status: 0
    }
  }, function (err, foundMeet) {
    if (!err) {
      User.find({
        groups: req.params.group
      }, function (err, users) {
        users.forEach(function (subuser) {
          mail(user, subuser, meet, "undocancel")
        })
        req.session.error = "";
        res.redirect('/dashboard/' + req.params.group)
      })
    }
  })
})

app.get('/help', function (req, res) {
  res.render('help', {
    isAuth: req.session.isAuth,
    title: "Help | "
  })
})
app.get('/contactus', function (req, res) {
  res.render('contactus', {
    isAuth: req.session.isAuth,
    message: "",
    title: "Contact Us | "
  })
})
app.get('/logout', function (req, res) {
  req.session.destroy((err) => {
    if (err) throw err;
    res.render('logout', {
      isAuth: false,
      title: 'Log Out | '
    })
  })
})


// ---------------------------------------------------------------------
// -----------------------------POST ROUTES------------------------------
// ---------------------------------------------------------------------
app.post('/joinmeet', function (req, res) {
  let meetId = req.body.meetid;
  if (uuidValidate(meetId)) { //validates if used a proper uuidV4
    let userName = req.body.name;
    let video = req.body.video;
    let audio = req.body.audio;
    if (video == 'on') {
      video = true;
    } else {
      video = false;
    }
    if (audio == 'on') {
      audio = true;
    } else {
      audio = false;
    }
    if (!userName) {
      userName = 'Imposter'
    }
    res.render('meet', {
      meetId: meetId,
      title: '',
      userName: userName,
      video: video,
      chats: [],
      audio: audio,
      isAuth: req.session.isAuth,
      title: 'Create Meet | '
    })
  } else {
    res.render('joinmeet', {
      isAuth: req.session.isAuth,
      message: "Invalid meetId!!",
      title: "Join | "
    });
  }
  // res.redirect('/meet/' + meetId);
})
app.post('/hostmeet/:meet', function (req, res) {
  let meetId = req.params.meet;
  if (uuidValidate(meetId)) { //validates if used a proper uuidV4
    let userName = req.body.name;
    let video = req.body.video;
    let audio = req.body.audio;
    if (video == 'on') {
      video = true;
    } else {
      video = false;
    }
    if (audio == 'on') {
      audio = true;
    } else {
      audio = false;
    }
    if (!userName) {
      userName = 'Host'
    }
    res.render('meet', {
      meetId: meetId,
      title: '',
      chats: [],
      userName: userName,
      video: video,
      audio: audio,
      isAuth: req.session.isAuth,
      title: "Meet | "
    })
  } else {
    res.redirect('/hostmeet')
  }
})

app.post('/joingroup', isAuth, async function (req, res) {
  let name = req.body.name;
  let key = req.body.key;
  let group = await Group.findOne({ //Checks if the entered data matches
    groupname: name,
    groupkey: key
  }, function (err, group) {
    if (!group) {
      req.session.error = "";
      return res.render('joingroup', {
        isAuth: req.session.isAuth,
        message: "Recheck name and key!",
        title: "Join Group | "
      })
    }
  });

  let ispart = await User.findOne({ //If user is already part of the group
    _id: req.session.user,
    groups: group._id
  }, function (err, ispart) {
    if (ispart) {
      req.session.error = "You are already in the group!";
      return res.redirect('/dashboard/' + group._id)
    }
  })

  User.findOne({ //Else adds it to his/her groups list
    _id: req.session.user,
  }, function (err, foundUser) {
    if (err) {
      return res.redirect('/joingroup');
    }
    foundUser.groups.push(group._id);
    foundUser.save();
    req.session.error = "";
    res.redirect('/dashboard/' + group._id)
  })

})
app.post('/group', isAuth, function (req, res) {
  let name = req.body.name;
  let key = req.body.key;

  Group.findOne({ //Checks if the groupname is already taken or not
    groupname: name
  }, function (err, foundGroup) {
    if (foundGroup) {
      req.session.error = ""
      return res.render('creategroup', {
        isAuth: req.session.isAuth,
        message: "Sorry! Group Name already taken!",
        title: "Create Group | "
      });
    } else {
      if (name == "" || key == "") {
        req.session.error = ""
        return res.render('creategroup', {
          isAuth: req.session.isAuth,
          message: "Please Input all Data",
          title: "Create Group | "
        });
      } else {
        User.findOne({
          _id: req.session.user
        }, function (err, foundUser) {
          if (err) {
            req.session.error = "User logged out!"
            res.redirect('/login');
          } else {
            const group = new Group({
              groupname: name,
              groupkey: key
            });
            group.save();
            foundUser.groups.push(group._id);
            foundUser.save();
            res.redirect('/dashboard/' + group._id)
          }
        })
      }
    }
  });


})

app.post('/createmeet/:group', isAuth, async function (req, res) {
  let groupid = req.params.group;
  let name = req.body.name;
  let details = req.body.details;
  let start = req.body.start;
  let end = req.body.end;

  if (name == "" || details == "") { //Checks if nothing is blank
    return res.redirect('/createmeet/' + groupid);
  }
  let members = await User.find({ //Checks if there are any members
    groups: req.params.group
  }, function (err, members) {
    if (!members) {
      req.session.error = "Group does not exist!";
      return res.redirect("/dashboard")
    }

  })

  let group = await Group.findOne({ //Checks if the group exists
    _id: groupid
  }, function (err, group) {
    if (!group) {
      req.session.error = "Group does not exist!";
      return res.redirect("/dashboard")
    }
  })

  User.findOne({ //If the user is part of this group
    _id: req.session.user,
    groups: groupid
  }).populate('groups').exec(function (err, user) {
    if (!user) {
      return res.redirect('/dashboard' + groupid)
    } else if (err) {
      return res.redirect("/dashboard");
    }
    const meet = new Meet({
      meetname: name,
      meethost: user.username,
      meetdetails: details,
      startdate: start.slice(0, 10),
      starttime: start.slice(11, 16),
      enddate: end.slice(0, 10),
      endtime: end.slice(11, 16),
      status: 0,
      reminder: 0,

    })
    meet.save()
    group.meets.push(meet._id);
    group.save();

    members.forEach(function (member) { //Sends an invite mail to each user
      mail(user, member, meet, "invite")
    })
    req.session.error = "New Meet Created!"
    res.redirect('/dashboard/' + group._id)
  })

})
app.post('/contactus', function (req, res) {
  let mailTransporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true, // use TLS
    auth: {
      user: 'engagekeepintouch@gmail.com',
      pass: process.env.PASSWORD
    }
  });

  let mailDetails = {
    to: 'engagekeepintouch@gmail.com',
    subject: req.body.subject,
    html: req.body.feedback
  };

  mailTransporter.sendMail(mailDetails, function (err, data) {
    if (err) {
      console.log(err);
    }
  });
  req.session.error = "";
  res.render('contactus', {
    isAuth: req.session.isAuth,
    message: "Your Email has been Received! Thank You for your Feedback!",
    title: "Contact Us | "
  })
})
app.post('/signup', async function (req, res) {
  let email = req.body.email;
  let username = req.body.username;
  let password = req.body.password;
  let repassword = req.body.repassword;
  if (email == "" || username == "" || password == "") { //Input cannot be blank
    return res.render('signup', {
      isAuth: req.session.isAuth,
      message: "Please Input Every Data!",
      title: 'Sign Up | '
    })
  }
  if (password != repassword) { //Equate the two passwords
    return res.render('signup', {
      isAuth: req.session.isAuth,
      message: "Passwords do not match.",
      title: 'Sign Up | '
    })
  }
  let foundUser = await User.findOne({ //Shouldn't be an existing user
    email: email
  });
  if (foundUser) {
    req.session.error = ""
    return res.render('signup', {
      isAuth: req.session.isAuth,
      message: "User Already Exists!",
      title: 'Sign Up | '
    });
  }
  const hashedPsw = await bcrypt.hash(password, 5); //hashing

  const user = new User({
    email: email,
    username: username,
    password: hashedPsw
  });
  await user.save();
  req.session.isAuth = true;
  req.session.user = user._id;
  req.session.error = "Welcome " + username + " !"
  res.redirect('/dashboard');
})
app.post('/login', async function (req, res) {
  let email = req.body.email;
  let password = req.body.password;
  let user = await User.findOne({ //Checks if the user exists
    email: email
  }, function (err, user) {
    if (!user) {
      req.session.error = "";
      return res.render("signup", {
        isAuth: req.session.isAuth,
        message: "User Does Not Exist",
        title: "Sign Up | "
      });
    }
  })

  const isMatch = await bcrypt.compare(password, user.password)
  if (isMatch) {
    req.session.isAuth = true;
    req.session.user = user._id;
    req.session.error = "Welcome " + user.username + " !"
    res.redirect('/dashboard');
  } else {
    req.session.error = "";
    res.render("login", {
      isAuth: req.session.isAuth,
      message: 'Incorrect Password',
      title: 'Log In |'
    });
  }
})


// ---------------------------------------------------------------------
// -----------------------------SOCKET----------------------------------
// ---------------------------------------------------------------------
// All connections for the meet
io.on('connection', socket => {
  socket.on('entermeet', function (meetId, userId, userName) {
    socket.join(meetId); //join this meet
    socket.to(meetId).emit('entermeet', userId, userName);
    socket.on('displayscreen', function (userId, display) {
      socket.to(meetId).emit('displayscreen', userId, display);
    })
    //To implement the chat feature
    socket.on('message', (message, userId, userName) => {
      const chat = new Chat({
        user: userName,
        text: message
      })
      chat.save()
      Meet.findOne({
        _id: meetId,
      }, function (err, meet) {
        if (!err) {
          meet.chats.push(chat._id)
          meet.save()
        }
      })
      io.to(meetId).emit('message', message, userId, userName)
    });
    //To stop a user's video from being shared
    socket.on('stopvideo', function (userId, userName) {
      io.to(meetId).emit('stopvideo', userId, userName);
    })
    //To share a user's video
    socket.on('startvideo', function (userId, userName) {
      io.to(meetId).emit('startvideo', userId, userName);
    })
    //To share that user is raising their hand
    socket.on('raiseHand', function (userId, userName) {
      io.to(meetId).emit('raiseHand', userId, userName);
    })
    //To stop sharing that user is raising their hand
    socket.on('lowerHand', function (userId, userName) {
      io.to(meetId).emit('lowerHand', userId, userName);
    })
    //To mute all users except the one called for this
    socket.on('muteOthers', function (userId, userName) {
      io.to(meetId).emit('muteOthers', userId, userName);
    })

    socket.on('screenshare', function (userId, userName) {
      io.to(meetId).emit('screenshare', userId, userName);
    })
    //To notify that a user is sharing screen
    socket.on('startdisplay', function (userId, userName) {
      io.to(meetId).emit('startdisplay', userId, userName);
    })
    //To share name and get name of all users
    socket.on('ourname', function (userId, userName) {
      io.to(meetId).emit('ourname', userId, userName);
    })
    //Shares that a user has disconnected
    socket.on('disconnect', function () {
      socket.to(meetId).emit('leavemeet', userId, userName)
    })
  });
})
// All connectios for the drawing meet
io.on('connection', socket => {
  socket.on('enter', function (meetId) {
    socket.join(meetId)
    socket.to(meetId).emit('enter');
    socket.on('drawing', function (data) {
      io.to(meetId).emit('drawing', data);
    })
    socket.on('refresh', function () {
      io.to(meetId).emit('refresh');
    })
  })
});
// All Connections for the screensharing meet
io.on('connection', socket => {
  socket.on('display', function (meetId, userId, userName) { //Second
    socket.join(meetId); //join this meet
    socket.to(meetId).emit('display', userId, userName);
  });
});


// ---------------------------------------------------------------------
// -----------------------------NODE-CRON-------------------------------
// ---------------------------------------------------------------------
// This cron scheduler checks every minute if any meet is starting and send a
// reminder mail to the users.
cron.schedule('*/1 * * * *', function () {
  let today = new Date()
  let todayOffset = today.getTimezoneOffset();
  let ISTOffset = 330;
  let ISTTime = new Date(today.getTime() + (ISTOffset + todayOffset) * 60000);
  today = ISTTime.getFullYear() + "-" + String(ISTTime.getMonth() + 1).padStart(2, '0') + "-" + String(ISTTime.getDate()).padStart(2, '0');
  let time = String(ISTTime.getHours()).padStart(2, '0') + ":" + String(ISTTime.getMinutes()).padStart(2, '0');
  console.log(today + " " + time);
  let meets = Meet.find({ //This finds every meet which are yet to begin and are not cancelled
    reminder: 0,
    status: 0
  }, function (err, meets) {
    if (err)
      return;
    meets.forEach(function (meet) {
      // For each meet we check if it's scheduled now, if yes we update
      // the reminder to 1 that means the meeting has begun and we remind all
      // members of that group about the meeting.
      if (today == meet.startdate && time == meet.starttime) {
        console.log('A');
        Meet.updateOne({
          _id: meet._id
        }, {
          $set: {
            reminder: 1
          }
        }, function (err, m) {
          Group.findOne({
            meets: meet._id
          }, function (err, group) {
            User.find({
              groups: group._id
            }, function (err, users) {
              users.forEach(function (user) {
                mail('', user, meet, "reminder")
              })
            })
          })
        })
      }
    })
  });
})

server.listen(process.env.PORT || 3000, function () {
  console.log('Server started at port 3000')
})
