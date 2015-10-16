var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var userSchema = new Schema({
    userID: String,
    glToken: String
});

var pollSchema = new Schema({
    projectID: String,
    channels: []
});

var User = mongoose.model('User', userSchema, 'users');
var Poll = mongoose.model('Poll', pollSchema, 'polls');


// ADDING
function addUser(user, next){
  var newUser = new User({ userID: user.userID, glToken: user.glToken });

  newUser.save(function(err) {
    if (err) {
      return next(err, newUser);
    }
    next(null, newUser);
  });
}

function addPoll(poll, next){
    var newPoll = new Poll({ projectID: poll.projectID, channels: poll.channels });

    newPoll.save(function(err){
        if (err){
            return next(err, newPoll);
        }
        next(null, newPoll);
    });
}


// FINDING
function findUser(userID, next){
    User.findOne({userID: userID}, function(err, user) {
       next(err, user);    
    });
}

function findPoll(projectID, next){
    Poll.findOne({projectID: projectID}, function(err, poll) {
       next(err, poll);    
    });
}


// UPDATING
function updateGLToken(userID, token, next){
    User.findOne({userID: userID}, function(err, user) {
        if (err) {
          next(err, null);
        } else {
          if (!user) {
              //console.log ("mongo-client::user doesn't exist");
              next(null, null);
              return;
          } else {
            user.glToken = token;
            User.update({userID:userID}, {glToken : token}, function(err) {
              if (err) {
                next (err, null);
              } else {
                next (null, user);
              }
            });
          }
        }
    });
}

function updatePolls(projectID, channel, next){
    Poll.findOne({projectID: projectID}, function(err, poll){
        if (err){
            next(err, null);
        }
        else {
            if (!poll){ // no poll, adding poll
                console.log("ATTEMPTING TO PUSH NEW POLL");
                var newPoll = { projectID: projectID, channels: [channel.id] };

                addPoll(newPoll, function(err, poll){
                    if (err){
                        return next(err, null);
                    }
                    next(null, poll);
                });
                return;
            }
            else { // there is a poll, adding channels
                console.log(poll);
                console.log("ATTEMPTING TO PUSH NEW CHANNEL");
                for (var i = 0; i < poll.channels.length; i++){
                    if (poll.channels[i] === channel.id){
                        console.log("Channel already being monitored!");
                        next(null, poll, "Channel already being monitored!");
                        return;
                    }
                }

                Poll.update({"projectID":projectID},
                { $push: { "channels": channel.id } }, function (err, poll){
                    if (err){
                        next(err, null);
                        return;
                    }
                    else {
                        next(null, poll);
                        return;
                    }
                });
                return;
            }
        }
    });
}


// REMOVING
function removePollChannel(projectID, channel, next){
    Poll.findOne({projectID: projectID}, function(err, poll){
        if (err){
            next(err, null);
        }
        else {
            if (!poll){
                console.log("mongo-client::poll doesn't exist");
                next(null,null);
                return;
            }
            else {
                console.log(poll);
                console.log("ATTEMPTING TO REMOVE CHANNEL");
                console.log(channel.id);
                for (var i = 0; i < poll.channels.length; i++){
                    console.log("LOOKING AT: " + poll.channels[i]);
                    if (poll.channels[i] === channel.id){
                        Poll.update({"projectID":projectID },
                        { $pull: { "channels": channel.id } }, function (err, poll){
                            if (err){
                                next(err, null);
                                return;
                            }
                            else {
                                console.log("CHANNEL PULLED");
                                //var altMsg = "Channel removed from project polling. (" + projectID + ")";
                                next(null, poll);
                                return;
                            }
                        });
                    }
                }
                next(null, poll, "Channel wasn't even being monitored!");
                return;
            }
        } // outmost else statement end
    });
}

function removeAllPolls(){
    Poll.remove({}, function(err){
        if (err){
            console.log(err);
        }
        else {
            console.log("REMOVED ALL PROJECTS STORED IN DATABASE")
        }
    });
}



// GETTING
function getGLToken(userID, next){
    User.findOne ({userID: userID}, function(err, user) {
        if (err) {
            next(err, null);
            return;
        } else {
            if (user == null) {     //user not exist
                next(null, null);
                return;
            }
            if (user.glToken == null) {
                console.log ('no token stored yet');
                next(null, null);
            } else {
                next(null, user.glToken);
            }
        }
    });
}

module.exports = {
    User: User,
    addUser: addUser,
    addPoll: addPoll,
    findUser: findUser,
    findPoll: findPoll,
    updatePolls: updatePolls,
    updateGLToken: updateGLToken,
    removePollChannel: removePollChannel,
    removeAllPolls: removeAllPolls,
    getGLToken: getGLToken
};