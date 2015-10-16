var database = require("../mongo-client");
var request = require('request');
var glURL = process.env.GITLAB || "https://gitlab.rim.net/api/v3";

function setGL(u, message, tokens, channel){
    var name = u.name;
    if (tokens[1]){
        var projUrl = glURL + "/projects?private_token=" + tokens[1];
        request.get({ url: projUrl }, function(error, response, body){
            if (body && !JSON.parse(body).message){ // if response exists and there's no error message in it

                
                database.findUser(message.user, function(err, user){
                    console.log("USER: " + message.user);
                    console.log("OUTPUT: " + user);
                    if (err){
                        channel.send("ERROR: " + err);
                    }
                    else if (!user){
                        var newUser = {
                            userID: message.user,
                            glToken: tokens[1]
                        }
                        var u = 
                        database.addUser(newUser, function(err, user){
                            console.log("ADDING TO DB");
                            console.log("USER: " + message.user);
                            console.log(tokens[1]);
                            channel.send(name + " (" + user.userID + ") ADDED TO DATABASE\n Token set successfully!");
                        });
                    }
                    else {
                        database.updateGLToken(message.user, tokens[1], function(err, user){
                            if (!user){
                                console.log("USER: " + message.user);
                                console.log(tokens[1]);
                                channel.send("ERROR: user not found for some reason");
                            }
                            else if (user !== null){
                                console.log("USER: " + message.user);
                                console.log(tokens[1]);
                                channel.send("Token set successfully!");
                            }
                        });
                    }
                });

            }
            else if (body){
                var b = JSON.parse(body);
                channel.send("ERROR: Invalid token.");
                return;
            }
            else {
                channel.send("ERROR: No response");
                return;
            }

        });
        
    }
    else {
        channel.send("ERROR: No token specified.")
    }
}

module.exports = {
    setGL: setGL
}