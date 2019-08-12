//import React from "react";
//import ReactDOM from "react-dom"
//import io from "socket.io"
function makeId() {
    let text = "";
    const possible = "abcdefghijklmnopqrstuvwxyz0123456789";

    for (let i = 0; i < 5; i++)
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    return text;
}

class App extends React.Component {
    componentDidMount() {
        const initArgs = {};
        localStorage.userId = localStorage.userId || makeId();
        if (!location.hash)
            location.hash = makeId();
        initArgs.roomId = location.hash.substr(1);
        initArgs.userId = localStorage.userId;
        this.socket = io();
        this.socket.on("state", state => {
            this.setState(Object.assign({}, state));
        });
        this.socket.on("message", message => alert(message));
        this.socket.on("disconnect", () => {
            this.setState(Object.assign({}, {inited: false}));
        });
        this.socket.emit("init", initArgs);
    }

    constructor() {
        super();
        this.state = {
            inited: false
        };
    }

    submitBotToken() {
        this.socket.emit("bot-token", document.getElementById("token").value);
    }

    submitDiscordParams() {
        this.socket.emit("discord-params", {
            server: document.getElementById("server").value,
            voice: document.getElementById("voice").value,
            text: document.getElementById("text").value
        });
    }

    logoutFromBot() {
        this.socket.emit("logout-bot");
    }

    sendMessage() {
        this.socket.emit("send-message", document.getElementById("message").value);
        document.getElementById("message").value = "";
    }

    playSequence(name) {
        this.socket.emit("play-sequence", name);
    }

    setScore() {
        this.socket.emit("set-score", prompt("Experts"), prompt("Viewers"));
    }

    startTimer() {
        this.socket.emit("start-timer");
    }

    startTimerShort() {
        this.socket.emit("start-timer-short");
    }

    resetTimer() {
        this.socket.emit("reset-timer");
    }

    setTimer() {
        this.socket.emit("set-timer", prompt("Timer seconds"));
    }

    stopSound() {
        this.socket.emit("stop-sound");
    }

    render() {
        clearTimeout(this.timeOut);
        if (this.state.inited) {
            const timerSecondDiff = ((this.state.timer % 100) || 100);
            if (this.state.timer - timerSecondDiff > 0) {
                let timeStart = new Date();
                this.timeOut = setTimeout(() => {
                    if (this.state.timer)
                        this.setState(Object.assign({}, this.state, {timer: this.state.timer - (new Date() - timeStart)}));
                }, timerSecondDiff);
            }
            return (<div>
                <div className="token" style={{display: this.state.discordClientReady ? "none" : "block"}}>
                    Bot token: <input type="text" id="token" defaultValue={this.state.token}/>
                    <i className="material-icons button" onClick={() => this.submitBotToken()}>
                        send
                    </i>
                </div>
                <div className="params"
                     style={{display: !this.state.discordClientReady || this.state.voiceConnected ? "none" : "block"}}>
                    <span>Server name:</span><input type="text" id="server" defaultValue={this.state.server}/><br/>
                    <span>Voice channel:</span><input type="text" id="voice" defaultValue={this.state.voice}/><br/>
                    <span>Text channel:</span><input type="text" id="text" defaultValue={this.state.text}/>
                    <i className="material-icons button" onClick={() => this.submitDiscordParams()}>
                        send
                    </i>
                </div>
                <div className="features" style={{display: !this.state.voiceConnected ? "none" : "block"}}>
                    Send message: <input type="text" id="message"/>
                    <div className="material-icons button" onClick={() => this.sendMessage()}>
                        send
                    </div>
                    <hr/>
                    <div className="sounds">
                        <div className="button" onClick={() => this.playSequence("intro")}>
                            Intro
                        </div>
                        <div className="button" onClick={() => this.playSequence("horse")}>
                            Horse
                        </div>
                        <div className="button" onClick={() => this.playSequence("black-box")}>
                            Black box
                        </div>
                        <div className="button" onClick={() => this.playSequence("13-sector")}>
                            13 sector
                        </div>
                        <div className="button" onClick={() => this.playSequence("pause")}>
                            Pause
                        </div>
                        <div className="button" onClick={() => this.playSequence("sych")}>
                            Sych
                        </div>
                    </div>
                    <div className="score">
                        <div className="score-number experts">{this.state.expertsScore}</div>
                        <div className="score-number viewers">{this.state.viewersScore}</div>
                        <div className="score-buttons">
                            <i className="material-icons button score-button"
                               onClick={() => this.playSequence("win-round")}>
                                add_box
                            </i>
                            <i className="material-icons button score-button"
                               onClick={() => this.playSequence("lose-round")}>
                                add_box
                            </i>
                        </div>
                    </div>
                    <div className="sounds-right">
                        <div className="button" onClick={() => this.playSequence("gong")}>
                            Gong
                        </div>
                        <div className="button" onClick={() => this.startTimer()}>
                            Start timer
                        </div>
                        <div className="button" onClick={() => this.startTimerShort()}>
                            Start short timer
                        </div>
                        <div className="button" onClick={() => this.setTimer()}>
                            Set timer
                        </div>
                        <div className="button" onClick={() => this.setScore()}>
                            Set score
                        </div>
                    </div>
                    {this.state.timer ? (<div className="timer">
                        {this.state.timer && (new Date(this.state.timer)).toUTCString().match(/(\d\d:\d\d )/)[0].trim()}
                        <div className="material-icons button timer-reset" onClick={() => this.resetTimer()}>
                            close
                        </div>
                    </div>) : ""}
                    <hr/>
                    <div>
                        Playing: <span>{
                        this.state.stopping ? "fading" : (this.state.playing ? this.state.playingFile : "nothing")
                    }</span>
                    </div>
                    {this.state.playing ? (<div className="button" onClick={() => this.stopSound()}>
                        <i className="material-icons">
                            stop
                        </i>Stop
                    </div>) : ""}
                    <hr/>
                </div>
                <div className="footer">
                    <div className="logout button"
                         style={{display: !this.state.discordClientReady ? "none" : "inline-block"}}
                         onClick={() => this.logoutFromBot()}>
                        <i className="material-icons">
                            exit_to_app
                        </i>Logout
                    </div>
                    <div className="status" style={{display: !this.state.voiceConnected ? "none" : "block"}}>
                        {this.state.server} / {this.state.text} / {this.state.voice}
                    </div>
                </div>

            </div>);
        }
        else return (<div>Disconnected</div>);
    }
}

ReactDOM.render(<App/>, document.getElementById('root'));
