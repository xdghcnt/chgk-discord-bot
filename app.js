const
    Discord = require("discord.js"),
    fs = require("fs"),
    gm = require("gm"),
    express = require('express'),
    socketIo = require("socket.io");

const
    discordClients = {},
    sessions = {};

// Server part
const app = express();

app.use('/', express.static(`${__dirname}/public`));

app.get('/chgk', function (req, res) {
    res.sendFile(`${__dirname}/public/app.html`);
});

const server = app.listen(1499);

const io = socketIo(server);

io.on("connection", socket => {
    let discordClient, state, textChannel, voiceChannel, voiceConnection, user, voiceDispatcher;
    const update = () => socket.emit("state", state);
    socket.use((packet, next) => {
        if (packet[0] === "init" || state)
            return next();
        else
            socket.disconnect(true);
    });
    socket.on("init", (userId) => {
        user = userId;
        sessions[userId] = sessions[userId] || {};
        state = sessions[userId];
        if (!state.inited) {
            discordClient = discordClients[userId] = new Discord.Client();
            state.inited = true;
        }
        update();
    });
    socket.on("bot-token", (token) => {
        state.prevToken = token;
        if (discordClient)
            discordClient.login(token).then(() => {
                state.discordClientReady = true;
                update();
            }).catch((error) => socket.emit("message", error.message));
    });
    socket.on("logout-bot", () => {
        state.discordClientReady = false;
        state.voiceConnected = false;
        if (discordClient)
            discordClient.destroy();
        discordClient = discordClients[user] = new Discord.Client();
        update();
    });
    socket.on("send-message", (message) => {
        if (textChannel)
            textChannel.send(message);
    });
    socket.on("play-sound", () => {
        if (voiceConnection)
            voiceDispatcher = voiceConnection.playFile(`./middle2.mp3`, {seek: 0, volume: 0.3, passes: 1});
    });
    socket.on("stop-sound", () => {
        if (voiceConnection && voiceDispatcher)
            voiceDispatcher.end();
    });
    socket.on("discord-params", (params) => {
        state.prevServer = params.server;
        state.prevText = params.text;
        state.prevVoice = params.voice;
        if (state.discordClientReady && discordClient) {
            const guild = discordClient.guilds && discordClient.guilds.find("name", params.server);
            if (guild) {
                textChannel = guild.channels.find(channel => channel.name === params.text && channel.type === "text");
                voiceChannel = guild.channels.find(channel => channel.name === params.voice && channel.type === "voice");
                if (!textChannel || !voiceChannel)
                    socket.emit("message", "Text or voice channel not found");
                else
                    voiceChannel.join().then((connection) => {
                        voiceConnection = connection;
                        state.voiceConnected = true;
                        update();
                    }).catch((error) => socket.emit("message", error.message))
            } else socket.emit("message", "Server not found");
        } else {
            state.discordClientReady = false;
            discordClient = discordClients[user] = new Discord.Client();
            update();
        }
    })
});