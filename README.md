# slack-gitlab

a node.js app that uses slack bot integrations to notify users when changes have been made to projects they have access to on gitlab.rim.net

`npm install`

`node index.js`
(mongodb **required**)

# SETTING UP

1. on the slack team, [add a bot integration](https://my.slack.com/services) and place its token in a .env, under var name `SLACKBOT_TOKEN`
> you can use .env.sample as an example to help you get started

2. place a mongodb database link in the .env, under var name `DATABASE_URI`

3. paste in your gitlab domain into the .env, under var name `GITLAB`

4. run the app locally or elsewhere (i.e. heroku) and you can now interact with the bot and use commands

> the app _will clear out all stored projectIDs to monitor on start-up_ in order to avoid errors related to channels already being monitored when trying to poll again

# COMMANDS

- `set <GitLab token>`                
  - // use this to save your GitLab token (found at <your gitlab domain here>/profile/account), you may also use "token", "settoken" and "updatetoken" instead of "set"

- `list`                              
  - // lists all the projects you have access to

- `pollall <channel (optional)>`                         
  - // will begin polling all projects you have access to, as well as look for new projects to poll that you were later given access to. notifications posted to specified channel, or direct message otherwise
  - // best used without the channel option, as anyone with access to the same project can stop monitoring in public channels at any time

- `poll <project name / project ID> <channel (optional)>`  
  - // will begin polling specified project and will post notifications to specified channel, or direct message otherwise
  - // best used without the channel option, as anyone with access to the same project can stop monitoring in public channels at any time

- `stop <project name / project ID> <channel (optional)>`
  - // will stop polling specified project in specified channel, or if no channel is specified it will stop polling in your direct messages for that project if polling is being done
  - // can be called with `cancel` or `clear` as well

# TO DO

- reimplement `stop *` / `stop .` / `stopall` command to find user's available projects and stop monitoring them in DM channel (but don't allow clearing of public channels)

# screenshots

![](https://raw.githubusercontent.com/ggkevinxing/slack-gitlab/master/screenshots/2.png?token=AHlqmwDPaiVjnSwfoJlAjFN2KsLJ2i96ks5WKm07wA%3D%3D) 
