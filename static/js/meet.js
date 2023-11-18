//*********** Start of code required when deploying ***********
const socket = io('https://web-production-c7bec.up.railway.app');

// const peer = new Peer()
const peer = new Peer(undefined, { //me
  path: '/peerjs', //from index.js
  // host: '/',
  host: 'web-production-c7bec.up.railway.app',
  port: '443'
})
//*********** End of code required when deploying ***********

//*********** Start of code required when running on localhost ***********
// const socket = io("ws://localhost:3000");

// const peer = new Peer(undefined, { //me
//   path: '/peerjs', //from index.js
//   host: '/',
//   port: '443'
// })
//*********** End of code required when running on localhost ***********


//*********** Start of code to handle user connections ***********
let myUserId;         //stores the userid automatically generated by peerjs
let myVideo = document.createElement('video')
myVideo.muted = true; //so that we don't hear us
let myVideoStream;

peer.on('open', function (userId) { //generates my id
  socket.emit('entermeet', MeetId, userId, UserName);
  myUserId = userId;
  socket.emit('ourname', myUserId, UserName);

})
socket.on('ourname', function (userId, userName) { //Gets the name of new joined users
  users.add(userId)     //users & usernames is declared in meet.ejs
  usernames.set(userId, {
    name: userName
  })
})

let overlayBottom;
let overlayWidth, overlayHeight



//This socket listens if any user leaves the room and reorients the grid accordingly
socket.on('leavemeet', function (userId, userName) {
  users.delete(userId)
  var x = $("#" + userId);
  if (x) {
    x.remove()
  }
  checkVideo()  //Resizes the videos
  if (peers[userId]) peers[userId].close()
})



//*********** Start of code to add videoboxes  ***********
//This function adds the video streams
function addVideoStream(video, stream, id) {
  video.srcObject = stream
  video.addEventListener('loadedmetadata', function () {
    video.play()
  })

  video.classList.add('main-video')
  checkVideo()
  let me = document.getElementById(id);
  me.classList.remove("raise");
  do {
    me.getElementsByTagName('h5')[0].innerHTML = usernames.get(id).name
  } while (usernames.get(id) == undefined)
  let audio = document.getElementById('audio')
  audio.play()

}

//This function checks for the proper orientation of videos
function checkVideo() {

  x = document.getElementsByClassName('main-video');

  if (x.length == 1 || x.length == 2) {
    for (let i = 0; i < x.length; i++) {
      document.getElementsByClassName('main-video')[i].style.height = "650px";
      document.getElementsByClassName('main-video')[i].style.width = "450px";
      overlayBottom = "350px";
    }
  } else if (x.length == 3 || x.length == 4) {
    for (let i = 0; i < x.length; i++) {
      document.getElementsByClassName('main-video')[i].style.height = "350px";
      document.getElementsByClassName('main-video')[i].style.width = "500px";
      overlayBottom = "165px";
    }
  } else if (x.length == 5 || x.length == 6) {
    for (let i = 0; i < x.length; i++) {
      document.getElementsByClassName('main-video')[i].style.height = "350px";
      document.getElementsByClassName('main-video')[i].style.width = "300px";
      overlayBottom = "165px";
    }
  } else {
    for (let i = 0; i < x.length; i++) {
      document.getElementsByClassName('main-video')[i].style.height = "250px";
      document.getElementsByClassName('main-video')[i].style.width = "300px";
      overlayBottom = "125px";
    }
  }
  x = document.getElementsByClassName('overlay');
  for (let i = 0; i < x.length; i++) {
    x[i].style.bottom = overlayBottom
  }

}
//*********** End of code to add videoboxes  ***********


//*********** Start of code for handling features ***********
// 1. Chat Feature
let text = $("#chat-message");
$('html').keydown(function (e) {
  if (e.which == 13) {
    if (text.val().length !== 0) {
      socket.emit('message', text.val(), myUserId, UserName);
      text.val('')
    }
  }
});
socket.on("message", function (message, userId, userName) {

  if (myUserId == userId)
    $(".notifications").append(`<li class="message user-message"><small><b>You</b></small><br/>${message}</li>`);
  else {
    $(".notifications").append(`<li class="message"><small><b>${userName}</b></small><br/>${message}</li>`);
    let x = document.getElementById('chat');
    x.style.flex = 0.3;
    x = document.getElementById('participants');
    x.style.flex = 0;
  }
  scrollToBottom()
})
function scrollToBottom() {
  var d = $('.all-notification');
  d.scrollTop(d.prop("scrollHeight"));
}

// 2. Video On/Off Feature
function videoStop() {
  const enabled = myVideoStream.getVideoTracks()[0].enabled;
  if (enabled) {
    Video = false
    let button = document.getElementsByClassName('media-right')[0].getElementsByTagName('button')[1];
    button.getElementsByTagName('i')[0].classList.remove('fa-video')
    button.getElementsByTagName('i')[0].classList.add('fa-video-slash')
    button.setAttribute('title', 'Start Video')
    myVideoStream.getVideoTracks()[0].enabled = false;
    socket.emit('stopvideo', myUserId, UserName)
  } else {
    Video = true
    let button = document.getElementsByClassName('media-right')[0].getElementsByTagName('button')[1];
    button.getElementsByTagName('i')[0].classList.add('fa-video')
    button.getElementsByTagName('i')[0].classList.remove('fa-video-slash')
    button.setAttribute('title', 'Stop Video')
    myVideoStream.getVideoTracks()[0].enabled = true;
    socket.emit('startvideo', myUserId, UserName)
  }
}
socket.on('stopvideo', function (userId, userName) {
  if (userId == myUserId) {
    userId = "undefined"
  }
  userName += ' '
  let me = document.getElementById(userId);
  if (me.getElementsByTagName('h1')[0])
    me.getElementsByTagName('h1')[0].remove()
  let des = document.createElement('h1');
  let initials = userName.split(' ');
  for (let i = 0; i < initials.length; i++) {
    if (/^[a-zA-Z()]$/.test(initials[i][0]))
      des.innerHTML += initials[i][0].toUpperCase();
    else if (initials[i][0]) {
      des.innerHTML += initials[i][0]
    }
  }
  des.classList.add('overlay')
  me.append(des);
  x = document.getElementsByClassName('overlay');
  for (let i = 0; i < x.length; i++) {
    x[i].style.bottom = overlayBottom;
  }
})
socket.on('startvideo', function (userId, userName) {
  if (userId == myUserId) {
    userId = "undefined"
  }
  let me = document.getElementById(userId).getElementsByTagName('h1');
  if (me[0]) {
    me[0].remove()
  }
})

// 3. Audio On/Off Feature
function audioStop() {
  const enabled = myVideoStream.getAudioTracks()[0].enabled;
  if (enabled) {
    Audio = false;
    let button = document.getElementsByClassName('media-right')[0].getElementsByTagName('button')[2];
    button.getElementsByTagName('i')[0].classList.remove('fa-microphone')
    button.getElementsByTagName('i')[0].classList.add('fa-microphone-slash')
    button.setAttribute('title', 'Unmute Audio')
    myVideoStream.getAudioTracks()[0].enabled = false;

  } else {
    Audio = true;
    let button = document.getElementsByClassName('media-right')[0].getElementsByTagName('button')[2];
    button.getElementsByTagName('i')[0].classList.add('fa-microphone')
    button.getElementsByTagName('i')[0].classList.remove('fa-microphone-slash')
    button.setAttribute('title', 'Mute Audio')
    myVideoStream.getAudioTracks()[0].enabled = true;
  }
}

// 4. Raise/Lower Hand Feature
let Hand = false;
function raiseHand() {
  if (Hand == false) {
    Hand = true
    let button = document.getElementsByClassName('media-right')[0].getElementsByTagName('button')[4];
    button.getElementsByTagName('i')[0].classList.remove('fa-hand-paper')
    button.getElementsByTagName('i')[0].classList.add('fa-hand-rock')
    button.setAttribute('title', 'Lower Hand')
    socket.emit('raiseHand', myUserId, UserName)
  } else {
    Hand = false
    let button = document.getElementsByClassName('media-right')[0].getElementsByTagName('button')[4];
    button.getElementsByTagName('i')[0].classList.add('fa-hand-paper')
    button.getElementsByTagName('i')[0].classList.remove('fa-hand-rock')
    button.setAttribute('title', 'Raise Hand')
    socket.emit('lowerHand', myUserId, UserName)
  }
}
socket.on('raiseHand', function (userId, userName) {
  if (userId == myUserId) {
    userId = "undefined"
  }
  let me = document.getElementById(userId);
  me.classList.add("raise");
  me.getElementsByTagName('h5')[0].innerHTML = userName + '&#x270B '
})
socket.on('lowerHand', function (userId, userName) {
  if (userId == myUserId) {
    userId = "undefined"
  }
  let me = document.getElementById(userId);
  me.classList.remove("raise");
  me.getElementsByTagName('h5')[0].innerHTML = userName
})

// 5. Mute other users feature
function muteOthers() {
  socket.emit('muteOthers', myUserId, UserName)
}
socket.on('muteOthers', function (userId, userName) {
  if (myUserId != userId && Audio == true)
    audioStop();
})

// 6. Screensharing Feature
function screenShare() {
  // window.open('http://localhost:3000/share/' + MeetId)
  window.open('https://web-production-c7bec.up.railway.app/share/' + MeetId)
  socket.emit('startdisplay', myUserId, UserName)
}
socket.on('startdisplay', function (userId, userName) {
  let link = document.getElementById('link');

  link.innerHTML = "<a onclick='display();'>Click here to watch " + userName + "'s screen.</a>"
})
function display() {
  // window.open('http://localhost:3000/display/' + MeetId)
  window.open('https://web-production-c7bec.up.railway.app/display/' + MeetId)
}

// 7. Collab feature
function whiteboard() {
  // window.open('http://localhost:3000/whiteboard/' + MeetId)
  window.open('https://web-production-c7bec.up.railway.app/whiteboard/' + MeetId)
}

// Chat and Participants Display Handlers
//This function opens the participant box and adds all the user names
function participants() {
  let x = document.getElementById('participants');
  x.style.flex = 0.3;
  x.style.display = "flex";
  x = document.getElementById('chat');
  x.style.flex = 0;
  $('.users').empty()
  let y = document.getElementsByClassName('users')[0];
  for (let item of users.keys()) {
    $('.users').append("<li>" + usernames.get(item).name); // + "<span style='float:right;'><a onclick='audioRequest('"+item+"');' class='fas fa-microphone-slash'></a><a class='fas fa-video-slash'></a></span></li>")
  }
}
//This function opens the chat box
function sendmessage() {
  let x = document.getElementById('chat');
  x.style.flex = 0.3;
  x.style.display = "flex";
  x = document.getElementById('participants');
  x.style.flex = 0;
  scrollToBottom()
}
//On clicking on the participant list or chat part of the screen it hides them
document.getElementsByClassName('media-left')[0].addEventListener("click", function () {
  let x = document.getElementById('chat');
  x.style.flex = 0;
  x = document.getElementById('participants');
  x.style.flex = 0;
});
//*********** End of code for handling features ***********

navigator.mediaDevices.getUserMedia({
  video: true,
  audio: true
}).then(stream => {

  // Package will contain the video and user's name. It's 'id'
  // is user's id so that we can search a specific users package.
  const package = document.createElement('div');
  package.setAttribute('id', myUserId)
  package.append(myVideo);

  const name = document.createElement('h5')
  name.classList.add("hide");
  name.innerHTML = UserName
  package.append(name)

  // users.add(myUserId)
  usernames.set(myUserId, {
    name: UserName
  })
  myVideoStream = stream;

  const videoGrid = $('#video-grid').append(package)

  //This socket listens to the entering of new users and connect them.
  socket.on('entermeet', function (userId, userName) {
    //Shares our name with all other users
    socket.emit('ourname', myUserId, UserName);

    // Adding the user's details
    users.add(userId)
    usernames.set(userId, {
      name: userName
    })

    connectToNewUser(userId, stream, userName)
  })

  // This shares the new users' name with existing ones


  addVideoStream(myVideo, stream, myUserId)

  peer.on('call', function (call) { //set listeners when somebody calls u
    call.answer(stream)            //this sends our stream to the caller

    //package element contains everything of a single user, i.e video, id, name and overlays
    const package = document.createElement('div');
    package.setAttribute('id', call.peer)

    const video = document.createElement('video')
    package.append(video)

    const name = document.createElement('h5')
    name.classList.add("hide")
    package.append(name)

    const videoGrid = $('#video-grid').append(package)

    call.on('stream', function (userVideoStream) {
      addVideoStream(video, userVideoStream, call.peer)
    })
  })

  function connectToNewUser(userId, stream, userName) {

    const call = peer.call(userId, stream)
    let video = document.createElement('video')

    let package = document.createElement('div')
    package.setAttribute('id', userId)
    package.append(video);

    const name = document.createElement('h5')
    name.classList.add("hide");
    name.innerHTML = userName
    package.append(name)

    let videoGrid = document.getElementById('video-grid')
    videoGrid.append(package)

    call.on('stream', function (userVideoStream) {
      console.log(userVideoStream);
      addVideoStream(video, userVideoStream, call.peer)
    })

    call.on('close', () => {
      video.remove()
      checkVideo()
    })

    //If the user is already raising his/her hand this will share it with the new user
    if (Hand == true) {
      socket.emit('raiseHand', myUserId, UserName)
    }

    //If the user's video is turned off this will share it with the new user
    if (Video == false) {
      socket.emit('stopvideo', myUserId, UserName)
    }

    peers[userId] = call
  }

  //These are to hide video and mute if unticked before entering
  if (Video == false) {
    videoStop();
  }
  if (Audio == false) {
    audioStop();
  }

})
//*********** End of code to handle user connections ***********
