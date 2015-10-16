var database = require("../mongo-client");
var request = require('request');
var glURL = process.env.GITLAB || "https://gitlab.rim.net/api/v3";

function listProj(message, channel){
	database.findUser(message.user, function(err, user){
        console.log("OUTPUT: " + user);
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
					var projs = "Accessible Projects:\n";
					if (len > 0){
						for (var i = 0; i < len; i++){
							projs = projs + b[i].name + " | " + b[i].id + " | " + b[i].web_url + "\n";
						}	
						channel.send(projs);
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

module.exports = {
    listProj: listProj
}