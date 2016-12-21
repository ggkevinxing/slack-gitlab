var Slack = require('slack-client');
var Kefir = require('kefir');
var request = require('request');
var chalk = require('chalk');

var set = require('./commands/setGL');
var list = require('./commands/listProj');
var poll = require ('./commands/poll');
var database = require ('./mongo-client');

// Credentials/Config
// use .env.sample as an example to put in your own token, then drop it in as .env to use it (shoutout to @plemarquand)
var slackBotToken = process.env.SLACKBOT_TOKEN;
var autoReconnect, autoMark;

var slack = new Slack(slackBotToken, autoReconnect = true, autoMark = true); // rtm

// initial connect
slack.on('open', function () {
    var channels = Object.keys(slack.channels)
        .map(function (k) { return slack.channels[k]; })
        .filter(function (c) { return c.is_member; })
        .map(function (c) { return c.name; });
    console.log(chalk.cyan('Connected to Slack'));
    console.log("id:\t\t" + chalk.green(slack.self.id));
    console.log("bot name:\t" + chalk.green(slack.self.name));
    console.log("team name:\t" + chalk.green(slack.team.name));
    console.log("channels:\t" + chalk.green(channels));

    database.removeAllPolls();
});


// utility functions
function makeMention(userId) {
    return '<@' + userId + '>';
}

function isDirect(userId, messageText) {
    var userTag = makeMention(userId);
    return messageText &&
        messageText.length >= userTag.length &&
        messageText.substr(0, userTag.length) === userTag;
}

function checkChannel(channel, channelName, next){
    var channels = Object.keys(slack.channels).map(function (k) { return slack.channels[k]; })
        .filter(function (c) { return c.is_member && c.name === channelName; });
    if (channels[0]){
        console.log(channelName + " found");
        //channel.send(channelName + " found. Proceeding...")
        next(channels[0]);
        return;
    }
    else {
        console.log(channelName + " NOT found");
        next(null);
        return;
    }
}


// command functions
function startPollAll(message, channel, tokens){
    if (tokens[1]){
        checkChannel(channel, tokens[1], function(ch){
            poll.pollAll(message, ch);
        });
    }
    else {
       slack.openDM(message.user, function(res){
            if (res){
                var dmChannel = slack.getChannelGroupOrDMByID(res.channel.id);
                poll.pollAll(message, dmChannel);
            }
            else { // if somehow direct message channel couldn't be found, post in the channel command was executed in
                poll.pollAll(message, channel); 
            }
        }); 
    }
}

function startPollOne(message, channel, tokens){
    if (tokens[1]){
        if (tokens[2]){
            checkChannel(channel, tokens[2], function(ch){
                if (ch !== null){
                    poll.pollOne(message, tokens[1], ch);
                }
                else {
                    channel.send(channelName + " not found. Are you sure you typed in the correct channel name?");
                }
            });
        }
        else {
            channel.send("Channel not specified, defaulting results to direct message.");
            slack.openDM(message.user, function(res){
                if (res){
                    var dmChannel = slack.getChannelGroupOrDMByID(res.channel.id);
                    poll.pollOne(message, tokens[1], dmChannel);
                }
                else {
                    channel.send("ERROR: Couldn't find direct message channel");
                }
            });
        }
    }
    else {
        channel.send("ERROR: Project not specified.")
    }
}

function stopPoll(message, channel, tokens){
    if (tokens[1]){
        if (tokens[2]){
            console.log("CHECKING CHANNEL");
            checkChannel(channel, tokens[2], function(ch){
                if (ch !== null){
                    poll.stopPollChannel(message, tokens[1], ch);
                }
                else {
                    channel.send("ERROR: Couldn't find specified channel.");
                }
            });
        }
        else {
            console.log("FINDING DM");
            channel.send("No channel specified, defaulting to direct message channel...");
            slack.openDM(message.user, function(res){
                if (res){
                    console.log("FOUND DM");
                    var dmChannel = slack.getChannelGroupOrDMByID(res.channel.id);
                    poll.stopPollChannel(message, tokens[1], dmChannel);
                }
                else {
                    channel.send("ERROR: Couldn't find direct message channel");
                }
            });
        }
    }
    else {
        channel.send("ERROR: Project not specified.");
    }
}



// message reaction
slack.on('message', function (message) {
    var channel = slack.getChannelGroupOrDMByID(message.channel);
    var user = slack.getUserByID(message.user);
    if (message.type === 'message') {
        var input = message.text;
        var tokens;
        var channelIsDirect = message.channel[0] === 'D';

        // input parsing BEGIN
        if (channelIsDirect) {
            tokens = input ? input.match(/\S+/g) : [];
        }
        else {
            var mention = makeMention(slack.self.id);
            var mentionLoc = input ? input.indexOf(mention) : 0;
            if (mentionLoc >= 0) {
                console.log("message to self:", mention);
                tokens = input ? input.substring(mentionLoc + mention.length).match(/\S+/g) : [];
            }
            else {
                console.log("message not to self", input && input.substring(0, mention.length));
                return;
            }
        }
        if (tokens[0] === ':' && channelIsDirect === false) {
            tokens.shift(); // skip colon in public channels
        }
        //input parsing END

        console.log(chalk.cyan('got command') + " " + chalk.green(tokens.join(' ')) + " from " + chalk.green(message.user) + " in " + chalk.green(message.channel));
        switch(tokens[0]){
        case "set":
        case "token":
        case "settoken":
        case "updatetoken":
            set.setGL(user, message, tokens, channel);
        	break;
        case "list":
        case "projects":
            list.listProj(message, channel);
            break;
        case "pollall":
    	case "monitorall":
            startPollAll(message, channel, tokens);
    		break;
        case "poll":
		case "monitor":
            startPollOne(message, channel, tokens);
			//poll.pollOne();
			break;
        case "stop":
        case "clear":
        case "cancel":
            stopPoll(message, channel, tokens);
            break;
		default:
			channel.send("Command \"" + tokens.join(' ') + "\" not recognized. \nhttps://gitlab.rim.net/kxing/slack-gitlab/blob/master/README.md");
			break;
        }
    }
    else {
        console.log('ignoring message of type ', message.type);
    }
});


slack.login();
