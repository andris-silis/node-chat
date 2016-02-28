import createSocketIO from "socket.io";
import { partial, some, isInteger } from "lodash";
import yargs from "yargs";

import { IDLE_TIMEOUT } from "./server-config";
import { messages } from "./common";


function log(...logMessages) {
    console.log(Date.now(), ...logMessages);
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
                throw("Invalid port number");
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
    if (!user.timedOut) {
        ioServer.emit(messages.USER_DISCONNECTED, { nickname: user.nickname });
    }
    removeUserData(userStorage, user);
}

function onUserIdle(ioServer, userSocket, user) {
// return;
    log(`User ${user.nickname} timed out`);
    ioServer.emit(messages.USER_TIMED_OUT, { nickname: user.nickname });
    user.timedOut = true;
    userSocket.disconnect();
}

function onUserMessage(ioServer, userSocket, user, data) {
    log(`Incoming message. ${user.nickname}: ${data.content}`);
    resetUserIdleTimeout(user, partial(onUserIdle, ioServer, userSocket, user));

    ioServer.emit(
        messages.USER_SENT_MESSAGE,
        {
            nickname: user.nickname,
            content: data.content,
        }
    );
}

function onUserJoin(ioServer, userStorage, userSocket, user, data) {
    if (isNicknameRegistered(userStorage, data.nickname)) {
        userSocket.emit(messages.NICKNAME_ALREADY_REGISTERED);
        return;
    }

    user.nickname = data.nickname;

    log(`User ${user.nickname} joined`);
    setUserIdleTimeout(user, partial(onUserIdle, ioServer, userSocket, user));
    ioServer.emit(messages.USER_JOINED, { nickname: user.nickname });
}


function onUserConnection(ioServer, userStorage, userSocket) {
    log(`User with session id ${userSocket.conn.id} connected`);

    const user = registerUserConnection(
        userStorage,
        userSocket.conn.id
    );

    userSocket.on(messages.JOIN, partial(onUserJoin, ioServer, userStorage, userSocket, user));
    userSocket.on(messages.SEND_MESSAGE, partial(onUserMessage, ioServer, userSocket, user));
    userSocket.on("disconnect", partial(onUserDisconnect, ioServer, userStorage, user));
}


function initApp() {
    const { port } = getParsedCommandLineArgs();
    const userStorage = {};

    const io = createSocketIO();
    io.on("connection", partial(onUserConnection, io, userStorage));
    io.listen(port);

    log(`Listening on port ${port}`);
}


initApp();
