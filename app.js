const
    Discord = require("discord.js"),
    gm = require("gm"),
    fs = require("fs"),
    randomFile = require('select-random-file'),
    express = require('express'),
    socketIo = require("socket.io");

const
    rooms = {},
    states = {},
    playSettings = {
        seek: 0,
        volume: 0.3,
        bitrate: 96,
        passes: 1
    },
    saveSettings = () => {
        const settings = {};
        Object.keys(rooms).forEach((id) => {
            settings[id] = {
                token: rooms[id].token,
                server: rooms[id].server,
                voice: rooms[id].voice,
                text: rooms[id].text,
                timerLength: rooms[id].timerLength
            };
        });
        fs.writeFile(`${__dirname}/settings.json`, JSON.stringify(settings), () => {
        });
    },
    settings = JSON.parse(fs.readFileSync(`${__dirname}/settings.json`, "utf8"));

// Server part
const app = express();

app.use('/', express.static(`${__dirname}/public`));

app.get('/chgk', function (req, res) {
    res.sendFile(`${__dirname}/public/app.html`);
});

const server = app.listen(1499);

const io = socketIo(server);
io.on("connection", socket => {
    let room, state;
    const
        update = () => io.to(room.roomId).emit("state", room),
        playSoundConnection = (file, loop) => {
            room.playing = false;
            state.voiceDispatcher = state.voiceConnection.playFile(`${__dirname}/resources/sounds/${file}`, playSettings);
            room.playingFile = file;
            room.playing = true;
            room.stopping = false;
            update();
            state.voiceDispatcher.on("end", () => {
                if (loop && room.playing)
                    state.voiceDispatcher = state.voiceConnection.playFile(`${__dirname}/resources/sounds/${file}`, playSettings);
                else {
                    room.playing = false;
                    state.voiceChannel.leave();
                    state.voiceConnection = null;
                    update();
                }
            });
        },
        playSound = (file, loop) => {
            if (state.voiceDispatcher)
                state.voiceDispatcher.destroy();
            if (state.voiceConnection)
                playSoundConnection(file, loop);
            else
                state.voiceChannel.join().then((connection) => {
                    state.voiceConnection = connection;
                    playSoundConnection(file, loop);
                })
        },
        stopSound = () => {
            room.playing = false;
            update();
            if (state.voiceConnection && state.voiceDispatcher) {
                room.stopping = true;
                update();
                const
                    startVolume = state.voiceDispatcher.volume,
                    interval = setInterval(() => {
                        if (room.stopping) {
                            state.voiceDispatcher.setVolume(state.voiceDispatcher.volume - startVolume / 20);
                            if (state.voiceDispatcher.volume < 0) {
                                clearInterval(interval);
                                room.playing = false;
                                room.stopping = false;
                                state.voiceDispatcher.end();
                                update();
                            }
                        } else clearInterval(interval);
                    }, 100)
            }
        },
        sendMessage = (message, opts) => {
            if (state.textChannel)
                state.textChannel.send(message, opts);
        },
        sendImage = (image) => sendMessage("", {files: [`${__dirname}/resources/images/${image}`]}),
        sendScore = () => {
            gm(280, 230, "rgb(134, 185, 254)")
                .fill("rgb(48, 65, 171)")
                .drawRectangle(140, 0, 280, 230)
                .font(`${__dirname}/resources/Arial Bold.ttf`, 188)
                .drawText(15, 180, room.expertsScore)
                .fill("rgb(134, 185, 254)")
                .drawText(160, 180, room.viewersScore)
                .write(`${__dirname}/resources/images/score.png`, () => sendImage("score.png"));
        },
        gameEnd = () => {
            playSound("ending.mp3");
            if (room.expertsScore === 6)
                randomFile(`${__dirname}/resources/images/win`, (err, file) => sendImage(`win/${file}`));
            else
                randomFile(`${__dirname}/resources/images/lose`, (err, file) => sendImage(`lose/${file}`));
        },
        startTimer = (isShort) => {
            clearInterval(state.timer);
            room.timer = (isShort ? 20 : room.timerLength) * 1000;
            playSound("signal-main.ogg");
            let time = new Date();
            state.timer = setInterval(() => {
                room.timer -= new Date() - time;
                time = new Date();
                if (!isShort && room.timer <= (11 * 1000) && room.timer > (10 * 1000))
                    playSound("signal-warn.ogg");
                else if (room.timer <= 0) {
                    endTimer(isShort);
                    update();
                }
            }, 1000);
        },
        endTimer = (isShort) => {
            room.timer = null;
            clearInterval(state.timer);
            playSound(!isShort ? "signal-main.ogg" : "signal-blitz.ogg")
        };
    socket.use((packet, next) => {
        if (packet[0] === "init" || room)
            return next();
        else
            socket.disconnect(true);
    });
    socket.on("init", (initArgs) => {
        states[initArgs.roomId] = states[initArgs.roomId] || {};
        rooms[initArgs.roomId] = rooms[initArgs.roomId] || Object.assign({
            inited: false,
            roomId: initArgs.roomId,
            expertsScore: 0,
            viewersScore: 0,
            timerLength: 60
        }, settings[initArgs.roomId] || {});
        room = rooms[initArgs.roomId];
        state = states[initArgs.roomId];
        if (!room.inited) {
            state.discordClient = new Discord.Client();
            room.inited = true;
        }
        socket.join(initArgs.roomId);
        update();
    });
    socket.on("bot-token", (token) => {
        room.token = token;
        if (state.discordClient)
            state.discordClient.login(token).then(() => {
                room.discordClientReady = true;
                saveSettings();
                update();
            }).catch((error) => socket.emit("message", error.message));
    });
    socket.on("logout-bot", () => {
        room.discordClientReady = false;
        room.voiceConnected = false;
        if (state.discordClient)
            state.discordClient.destroy();
        state.discordClient = new Discord.Client();
        update();
    });
    socket.on("send-message", (message) => {
        sendMessage(message);
    });
    socket.on("play-sequence", (name) => {
        if (name === "intro") {
            sendImage("logo.png");
            playSound("intro.mp3");
        } else if (name === "ambient") {
            playSound("ambient.mp3");
        } else if (name === "horse") {
            playSound("horse.mp3");
            sendImage("volchok.jpg");
        } else if (name === "black-box") {
            playSound("box.mp3");
            sendImage("blackbox.jpg");
        } else if (name === "sych") {
            playSound("sych.mp3");
        } else if (name === "pause") {
            playSound("pause.mp3", true);
            sendImage("music.png");
        } else if (name === "13-sector") {
            playSound("13sector.mp3");
            sendImage("13sector.jpg");
        } else if (name === "win-round") {
            room.expertsScore++;
            if (room.expertsScore === 6)
                gameEnd();
            else {
                randomFile(`${__dirname}/resources/sounds/win-round`, (err, file) => playSound(`win-round/${file}`, true));
                randomFile(`${__dirname}/resources/images/win`, (err, file) => sendImage(`win/${file}`));
            }
            update();
            sendScore();
        } else if (name === "lose-round") {
            room.viewersScore++;
            if (room.viewersScore === 6)
                gameEnd();
            else {
                randomFile(`${__dirname}/resources/sounds/lose-round`, (err, file) => playSound(`lose-round/${file}`, true));
                randomFile(`${__dirname}/resources/images/lose`, (err, file) => sendImage(`lose/${file}`));
            }
            update();
            sendScore();
        } else if (name === "gong") {
            if (room.viewersScore === 0 && room.expertsScore === 0)
                playSound("gong-start.mp3");
            else if (room.viewersScore === 6 || room.expertsScore === 6)
                playSound("gong-end.mp3");
            else
                randomFile(`${__dirname}/resources/sounds/gong`, (err, file) => playSound(`gong/${file}`));
            update();
        }
    });
    socket.on("start-timer", () => {
        startTimer();
        update();
    });
    socket.on("start-timer-short", () => {
        startTimer(true);
        update();
    });
    socket.on("reset-timer", () => {
        clearInterval(state.timer);
        room.timer = null;
        update();
    });
    socket.on("set-timer", (timerLength) => {
        if (!isNaN(timerLength))
            room.timerLength = timerLength;
        saveSettings();
        update();
    });
    socket.on("stop-sound", () => {
        stopSound();
    });
    socket.on("set-score", (experts, viewers) => {
        room.expertsScore = parseInt(experts) || 0;
        room.viewersScore = parseInt(viewers) || 0;
        sendScore();
        update();
    });
    socket.on("discord-params", (params) => {
        room.server = params.server;
        room.text = params.text;
        room.voice = params.voice;
        if (room.discordClientReady && state.discordClient) {
            const guild = state.discordClient.guilds && state.discordClient.guilds.find("name", params.server);
            if (guild) {
                state.textChannel = guild.channels.find(channel => channel.name === params.text && channel.type === "text");
                state.voiceChannel = guild.channels.find(channel => channel.name === params.voice && channel.type === "voice");
                if (!state.textChannel || !state.voiceChannel)
                    socket.emit("message", "Text or voice channel not found");
                else
                    state.voiceChannel.join().then(() => {
                        saveSettings();
                        state.voiceChannel.leave();
                        room.voiceConnected = true;
                        update();
                    }).catch((error) => socket.emit("message", error.message))
            } else socket.emit("message", "Server not found");
        } else {
            room.discordClientReady = false;
            state.discordClient = new Discord.Client();
            update();
        }
    })
});