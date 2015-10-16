var database = require("../mongo-client");
var request = require('request');
var Slack = require('node-slack');
var glURL = process.env.GITLAB || "https://gitlab.rim.net/api/v3";

function pollAll(message, channel){
  channel.send("Beginning to monitor all projects accessible to " + message.user + "...");
  database.findUser(message.user, function(err, user){
    if (err){
      channel.send("ERROR: " + err);
    }
    else if (!user){
      channel.send("ERROR: No token set in database. Use \"set <GitLab token>\" to add your token to the database.\nGet your token here: https://gitlab.rim.net/profile/account")
    }
    else {
      var projUrl = glURL + "/projects?private_token=" + user.glToken;
            
      request.get({ url: projUrl }, function(error, response, body){
        if (body && !JSON.parse(body).message){ // if response exists and there's no error message in it
          var b = JSON.parse(body);
          var len = b.length;
          var projArray = [];
          if (len > 0){
            for (var i = 0; i < len; i++){
              projArray.push(b[i].id);
            } 
            for (var j = 0; j < projArray.length; j++){
              pollOne(message, projArray[j].toString(), channel);
            }
          }
          else {
            channel.send("ERROR: No accessible projects found!")
          }
        }
        else if (body){
          var b = JSON.parse(body);
          channel.send("ERROR: " + b.message);
          return;
        }
        else {
          channel.send("ERROR: No response");
          return;
        }

      });

      }
  });
}

function pollOne(message, projectID, channel){

  database.findUser(message.user, function(err, user){
    if (err){
      channel.send("ERROR: " + err);
    }
    else if (!user){
      channel.send("ERROR: No token set in database. Use \"set <GitLab token>\" to add your token to the database.\nGet your token here: https://gitlab.rim.net/profile/account")
    }
    else { 
      var projUrl = glURL + "/projects?private_token=" + user.glToken; // GET ALL PROJECTS
      var token = user.glToken;
      var userID = user.userID;
      request.get({ url: projUrl }, function(error, response, body){
        if (body && !JSON.parse(body).message){
          var b = JSON.parse(body);
          var len = b.length;
          for (var i = 0; i < len; i++){
            if (b[i].id.toString() === projectID || b[i].name === projectID){

              console.log("got project");
              channel.send("Project " + b[i].name + " (" + b[i].id + ") found! Adding to database...");
              // database function
              database.updatePolls(b[i].id, channel, function(err, user, altMsg){
                if (err){
                  channel.send("ERROR: " + err);
                } else if (!user){
                  channel.send("ERROR: User not found");
                } else {
                  if (altMsg){
                    channel.send(altMsg); // already monitoring channel message
                  } else {
                    //channel.send("Database entry update complete, monitoring " + b[i].name + " (" + b[i].id + ") in channel " + channel.name);
                    pollProject(true, userID, b[i].id, token, channel);
                  }
                }
              }); // database function
              return;
            }
          } // for loop end
          channel.send("ERROR: " + projectID + " not found.");
        } // first if statement end


        else if (body){
          var b = JSON.parse(body);
          console.log("ERROR: " + b.message);
          channel.send("ERROR: " + b.message);
          return;
        }
        else {
          console.log("ERROR: no response");
          channel.send("ERROR: no response");
          return;
        }

      });
        
    }
  });
}

function stopPollChannel(message, projectID, channel){
  database.findUser(message.user, function(err, user){
    if (err){
      channel.send("ERROR: " + err);
    }
    else if (!user){
      channel.send("ERROR: No token set in database. Use \"set <GitLab token>\" to add your token to the database.\nGet your token here: https://gitlab.rim.net/profile/account")
    }
    else { // AUTHENTICATION IS DONE SO THAT YOU CAN'T HAVE RANDOM PEOPLE STOPPING POLLING IF THEY DON'T HAVE ACCESS TO THE PROJECT
      var projUrl = glURL + "/projects?private_token=" + user.glToken; // GET ALL PROJECTS
      var token = user.glToken;
      var userID = user.userID;

      request.get({ url: projUrl }, function(error, response, body){
        if (body && !JSON.parse(body).message){
          var b = JSON.parse(body);
          var len = b.length;
          for (var i = 0; i < len; i++){
            if (b[i].id.toString() === projectID || b[i].name === projectID){

              console.log("got project");
              //channel.send("Project " + b[i].name + " (" + b[i].id + ") found! Stopping polling in channel...");
              // database function
              database.removePollChannel(b[i].id.toString(), channel, function(err, user){
                if (err){
                  channel.send("ERROR: " + err);
                } else if (!user){
                  channel.send("ERROR: User not found");
                } else {
                  //channel.send("Database entry update complete, stopping monitor of " + b[i].name + " (" + b[i].id + ") in channel " + channel.name);
                }
              }); // database function
              return;
            }
          } // for loop end
          channel.send("ERROR: " + projectID + " not found.");
        } // first if statement end


        else if (body){
          var b = JSON.parse(body);
          console.log("ERROR: " + b.message);
          channel.send("ERROR: " + b.message);
          return;
        }
        else {
          console.log("ERROR: no response");
          channel.send("ERROR: no response");
          return;
        }

      });
        
    }
  });
}

function pollProject(pollStatus, userID, projectID, token, channel, bodyParam, last, current){
  var b, dat, commit, branch, branchUrl, before, after;
  var pollAgain = pollStatus;
  if (pollAgain === false){ return; }
  if (bodyParam){ b = bodyParam; }
  if (last){ before = last; }
  if (current){ after = current; }
  var eventUrl = glURL + "/projects/" + projectID + "/events?private_token=" + token; // GET EVENTS IN SPECIFIC PROJECT
  //console.log("POLLING");
  database.findUser(userID, function(err, user){
    if(err){
      channel.send("ERROR: " + err);
      return;
    }  else if(!user){
      channel.send("ERROR: No token set in database. Use \"set <GitLab token>\" to add your token to the database.\nGet your token here: https://gitlab.rim.net/profile/account")
      return;
    } else {
      database.findPoll(projectID, function(err, poll){
        if (err){
          channel.send("ERROR: " + err);
          return;
        } else if (!poll){
          console.log("NO POLL FOUND");
          return;
        } else {
          pollAgain = false;
          for (var n = 0; n < poll.channels.length; n++){
            if (poll.channels[n] === channel.id){
              pollAgain = true;
            }
          }
          if (pollAgain === true){
            request.get({
                  url: eventUrl
              }, function (error, response, body){
                //console.log("REQUESTING GITLAB CALL");
                  if (body && !JSON.parse(body).message){
                    if (b){
                      b = JSON.parse(body);
                      dat = b[0].data;
                      after = dat.after;
                      if (before !== after){
                        // console output
                        console.log("CHANGES DETECTED IN " + projectID + " | " + dat.repository.name + " | " + dat.repository.homepage);
                        console.log("NEW COMMIT ID: " + after);

                        for (var i = 0; b[i].data.after !== before; i++){
                          console.log("COMMIT TRAVERSING | " + b[i].data.after);
                          commit = b[i].data.commits;
                          branch = b[i].data.ref;
                          branch = branch.slice(branch.lastIndexOf("/") + 1);
                          branchUrl = dat.repository.homepage + "/commits/" + branch;
                          
                          for (var j = 0; j < commit.length; j++){ // is there a way to avoid this for loop in a for loop?
                            // console output
                            console.log(commit[j].id);
                            console.log(commit[j].author.name + " | " + commit[j].author.email);
                            console.log(commit[j].timestamp);
                            console.log("BRANCH: " + branch);
                            console.log("MESSAGE: \"" + commit[j].message + "\"");
                            console.log(commit[j].url + "\n \n \n");

                            // slack output

                            channel.send(commit[j].author.name + " (" + commit[j].author.email + ") pushed to branch " + branch + " at " + dat.repository.name + "\nMessage: \"" + commit[j].message + "\"\n" + commit[j].timestamp +"\n" + commit[j].url);
                          }
                        }
                      }
                      before = after; // the new becomes old once more
                    }
                    else { // first run through
                      //console.log(body);
                      b = JSON.parse(body);
                      dat = b[0].data;
                      before = dat.after;

                      // console output
                      console.log("POLL START - " + projectID + " | " + dat.repository.name + " | " + dat.repository.homepage);
                      console.log("CURRENT COMMIT ID: " + before);

                      // slack output
                      channel.send("POLL START - " + dat.repository.name + " | " + projectID + "\n" + dat.repository.homepage);
                    }
                  }
                  else if (body){
                    console.log("ERROR: Project events not found");
                    channel.send("ERROR: " + JSON.parse(body).message);
                    pollAgain = false;
                  }
                  else {
                    console.log("SOMETHING REALLY BROKE");
                    pollAgain = false;
                  }

                  if(pollAgain === true){
                    setTimeout(function(){ pollProject(true, userID, projectID, token, channel, b, before, after); }, 10000);
                  } else {
                    channel.send("ALERT: Project " + projectID + " no longer queued for polling in " + channel.name + ". Stopping poll");
                    setTimeout(function(){ pollProject(false, userID, projectID, token, channel, b, before, after); }, 1);
                  }
            });
          } else {
              channel.send("ALERT: Project " + projectID + " no longer queued for polling in " + channel.name + ". Stopping poll");
              setTimeout(function(){ pollProject(false, userID, projectID, token, channel, b, before, after); }, 1);
            }
          }
      });
    }

  });
    
}

module.exports = {
    pollAll: pollAll,
    pollOne: pollOne,
    stopPollChannel: stopPollChannel
};