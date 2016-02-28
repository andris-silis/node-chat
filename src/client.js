import readline from "readline";
import createSocketIO from "socket.io-client";
import commandLineArgs from "command-line-args";
import { isEmpty } from "lodash";

import { messages } from "./common";
import { CONNECT_TIMEOUT, RECONNECT_DELAY } from "./client-config";


function getSocketConnection(host, port) {
    return createSocketIO(
        `http://${host}:${port}`,
        {
            reconnectionDelay: CONNECT_TIMEOUT,
            reconnectionDelayMax: RECONNECT_DELAY,
        }
    );
}

function connectToChatSocket(socket, nickname) {
    socket.on("connect", () => {
        socket.emit(messages.JOIN, { nickname });
    });

    socket.on("connect_error", () => {
        console.log("connect_error");
    });

    socket.on("connect_timeout", () => {
        console.log("connect_timeout");
    });

    socket.on("disconnect", () => {
        console.log("Disconnect");
        process.exit(0);
    });

    socket.on("reconnecting", (number) => {
        console.log("Reconnecting. Try", number);
    });

    socket.on("reconnect", (number) => {
        console.log("Reconnected. Try", number);
    });

    socket.on("reconnect_error", () => {
        console.log("reconnect_error");
    });

    socket.on(messages.USER_SENT_MESSAGE, (data) => {
        console.log(`${data.nickname}: ${data.content}`);
    });

    socket.on(messages.USER_JOINED, (data) => {
        if (nickname === data.nickname) {
            return;
        }
        console.log(`User ${data.nickname} joined`);
    });

    socket.on(messages.USER_TIMED_OUT, (data) => {
        console.log(`User ${data.nickname} timed out`);
    });

    socket.on(messages.USER_DISCONNECTED, (data) => {
        console.log(`User ${data.nickname} disconnected`);
    });

    socket.on(messages.NICKNAME_ALREADY_REGISTERED, () => {
        console.log("Nickname already in use. Change nickname parameter. Exiting..");
        process.exit(0);
    });
}

function getReadline() {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
    });

    rl.on("close", () => {
        console.log("Exiting");
        process.exit(0);
    });

    return rl;
}

function connectReadlineToSocket(rl, socket) {
    rl.on("line", (content) => {
        socket.emit(messages.SEND_MESSAGE, { content });
        rl.prompt();
    });

    rl.prompt();
}

function getCommandLineParser() {
    return commandLineArgs([
        { name: "server-address", alias: "a", type: String },
        { name: "port", alias: "p", type: String },
        { name: "nickname", alias: "n", type: String },
    ]);
}

function initApp() {
    const cli = getCommandLineParser();
    const commandLineParams = cli.parse();

    if (isEmpty(commandLineParams)) {
        console.log(cli.getUsage());
        process.exit(0);
        return;
    }

    const {
        "server-address": serverHost,
        port: serverPort,
        nickname,
    } = commandLineParams;

    const socket = getSocketConnection(serverHost, serverPort);
    const rl = getReadline();

    connectToChatSocket(socket, nickname);
    connectReadlineToSocket(rl, socket);
}


initApp();
