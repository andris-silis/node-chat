import readline from "readline";
import createSocketIO from "socket.io-client";
import yargs from "yargs";
import { isInteger, isString } from "lodash";

import { messages } from "./common";
import { CONNECT_TIMEOUT, RECONNECT_DELAY } from "./client-config";


function getParsedCommandLineArgs() {
    return yargs
        .describe("server-address", "Chat server address")
        .alias("server-address", "a")
        .string("server-address")
        .demand("server-address")
        .describe("port", "Chat server port")
        .alias("port", "p")
        .number("port")
        .demand("port")
        .describe("nickname", "Chat user nickname")
        .alias("nickname", "n")
        .string("nickname")
        .demand("nickname")
        .strict()
        .check((argv) => {
            if (!isInteger(argv.port) || argv.port < 1 || argv.port > 65535) {
                throw("Invalid port number");
            }
            if (!isString(argv.nickname) || argv.nickname.length === 0) {
                throw("Invalid or empty nickname");
            }
            if (!isString(argv["server-address"]) || argv["server-address"].length === 0) {
                throw("Invalid or server address");
            }
            return true;
        })
        .argv;
}

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

function initApp() {
    const {
        "server-address": serverHost,
        port: serverPort,
        nickname,
    } = getParsedCommandLineArgs();

    const socket = getSocketConnection(serverHost, serverPort);
    const rl = getReadline();

    connectToChatSocket(socket, nickname);
    connectReadlineToSocket(rl, socket);
}


initApp();
