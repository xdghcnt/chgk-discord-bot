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
        localStorage.userId = localStorage.userId || makeId();
        this.socket = io();
        this.socket.on("state", state => {
            this.setState(Object.assign({}, state));
        });
        this.socket.on("message", message => alert(message));
        this.socket.emit("init", localStorage.userId);
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

    playSound() {
        this.socket.emit("play-sound");
    }

    stopSound() {
        this.socket.emit("stop-sound");
    }

    render() {
        if (this.state.inited) {
            return (<div>
                <div className="token" style={{display: this.state.discordClientReady ? "none" : "block"}}>
                    Bot token: <input type="text" id="token" defaultValue={this.state.prevToken}/>
                    <i className="material-icons button" onClick={() => this.submitBotToken()}>
                        send
                    </i>
                </div>
                <div className="params" style={{display: !this.state.discordClientReady || this.state.voiceConnected ? "none" : "block"}}>
                    Server name: <input type="text" id="server" defaultValue={this.state.prevServer}/><br/>
                    Voice channel: <input type="text" id="voice" defaultValue={this.state.prevVoice}/><br/>
                    Text channel: <input type="text" id="text" defaultValue={this.state.prevText}/>
                    <i className="material-icons button" onClick={() => this.submitDiscordParams()}>
                        send
                    </i>
                </div>
                <div className="features" style={{display: !this.state.voiceConnected ? "none" : "block"}}>
                    Send message: <input type="text" id="message"/>
                    <i className="material-icons button" onClick={() => this.sendMessage()}>
                        send
                    </i>
                    <br/>
                    <i className="material-icons button" onClick={() => this.playSound()}>
                        play_arrow
                    </i>
                    <i className="material-icons button" onClick={() => this.stopSound()}>
                        stop
                    </i>
                </div>
                <div className="logout button" style={{display: !this.state.discordClientReady ? "none" : "inline-block"}} onClick={() => this.logoutFromBot()}>
                    <i className="material-icons">
                        exit_to_app
                    </i>Logout
                </div>
            </div>);
        }
        else return (<div/>);
    }
}

ReactDOM.render(<App/>, document.getElementById('root'));
