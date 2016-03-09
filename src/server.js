import createSocketIO from "socket.io";
import { partial, some, isInteger, isString } from "lodash";
import yargs from "yargs";

import { IDLE_TIMEOUT } from "./server-config";
import { messages, isUserMessageValid, isNicknameValid } from "./common";


function log(...logMessages) {
    const date = Date();
    console.log(`${date}:`, ...logMessages);
}


function getParsedCommandLineArgs() {
    return yargs
        .describe("port", "Port number to listen")
        .alias("port", "p")
        .number("port")
        .demand("port")
        .strict()
        .check((argv) => {
            if (!isInteger(argv.port) || argv.port < 1 || argv.port > 65535) {
                throw new Error("Invalid port number");
            }
            return true;
        })
        .argv;
}


function removeUserIdleTimeout(user) {
    clearTimeout(user.timeoutTimer);
}

function setUserIdleTimeout(user, cb) {
    user.timeoutTimer = setTimeout(cb, IDLE_TIMEOUT);
}

function resetUserIdleTimeout(user, cb) {
    removeUserIdleTimeout(user);
    setUserIdleTimeout(user, cb);
}


function registerUserConnection(userStorage, userId) {
    const user = {
        id: userId,
    };
    userStorage[userId] = user;

    return user;
}

function unregisterUserConnection(userStorage, user) {
    delete userStorage[user.id];
}

function isNicknameRegistered(userStorage, nickname) {
    return some(userStorage, (user) => user.nickname === nickname);
}

function removeUserData(userStorage, user) {
    removeUserIdleTimeout(user);
    unregisterUserConnection(userStorage, user);
}


function onUserDisconnect(ioServer, userStorage, user) {
    log(
        `User ${user.nickname ? `${user.nickname} ` : ""}`
        + `disconnected${user.timedOut ? " after timeout" : ""}`
    );
    if (!user.timedOut && isString(user.nickname)) {
        // Don't send disconnected message if user:
        //  - timed out
        //  - was disconnected because of nickname conflicts
        ioServer.emit(messages.USER_DISCONNECTED, { nickname: user.nickname });
    }
    removeUserData(userStorage, user);
}

function onUserIdle(ioServer, userSocket, user) {
    user.timedOut = true;
    userSocket.emit(messages.TIMED_OUT);
    userSocket.disconnect();
    ioServer.emit(messages.USER_TIMED_OUT, { nickname: user.nickname });
    log(`User ${user.nickname} timed out`);
}

function onUserMessage(ioServer, userSocket, user, data) {
    log(`Incoming message. ${user.nickname}: ${data.content}`);
    resetUserIdleTimeout(user, partial(onUserIdle, ioServer, userSocket, user));

    const message = data.content;

    if (!isUserMessageValid(message)) {
        log(`Invalid user message. ${user.nickname}: ${data.content}`);
        return;
    }

    ioServer.emit(
        messages.USER_SENT_MESSAGE,
        {
            nickname: user.nickname,
            content: message,
        }
    );
}

function onUserJoin(ioServer, userStorage, userSocket, user, data) {
    resetUserIdleTimeout(user, partial(onUserIdle, ioServer, userSocket, user));

    if (isNicknameRegistered(userStorage, data.nickname)) {
        userSocket.emit(messages.NICKNAME_ALREADY_REGISTERED);
        return;
    }

    if (!isNicknameValid(data.nickname)) {
        userSocket.emit(messages.INVALID_NICKNAME);
        return;
    }

    user.nickname = data.nickname;

    log(`User ${user.nickname} joined`);
    ioServer.emit(messages.USER_JOINED, { nickname: user.nickname });
}


function onUserConnection(ioServer, userStorage, userSocket) {
    log(`User with session id ${userSocket.conn.id} connected`);

    const user = registerUserConnection(
        userStorage,
        userSocket.conn.id
    );

    setUserIdleTimeout(user, partial(onUserIdle, ioServer, userSocket, user));

    userSocket.on(messages.JOIN, partial(onUserJoin, ioServer, userStorage, userSocket, user));
    userSocket.on(messages.SEND_MESSAGE, partial(onUserMessage, ioServer, userSocket, user));
    userSocket.on("disconnect", partial(onUserDisconnect, ioServer, userStorage, user));
}

function onTCPTimeout(socket) {
    log("TCP connection timed out");
    socket.end();
}

function onTCPConnection(socket) {
    log("Incoming TCP connection");
    socket.setTimeout(IDLE_TIMEOUT, partial(onTCPTimeout, socket));
}


function initApp() {
    const { port } = getParsedCommandLineArgs();
    const userStorage = {};

    const io = createSocketIO();
    io.on("connection", partial(onUserConnection, io, userStorage));
    io.listen(port);
    io.httpServer.on("connection", onTCPConnection);

    log(`Listening on port ${port}`);
}


initApp();
