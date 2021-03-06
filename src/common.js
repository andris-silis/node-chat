import { isString } from "lodash";


export const messages = {
    // Client emitted events
    SEND_MESSAGE: "send-message",
    JOIN: "join",
    // Server emitted events
    USER_SENT_MESSAGE: "user-sent-message",
    USER_JOINED: "user-joined",
    USER_TIMED_OUT: "user-timed-out",
    USER_DISCONNECTED: "user-disconnected",
    NICKNAME_ALREADY_REGISTERED: "nickname-already-registered",
    INVALID_NICKNAME: "invalid-nickname",
    TIMED_OUT: "timed-out",
};

export function isUserMessageValid(message) {
    return isString(message) && message.length > 0;
}

export function isNicknameValid(nickname) {
    return isString(nickname) && nickname.length > 0;
}
