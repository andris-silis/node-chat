import test from "tape";
import { isUserMessageValid, isNicknameValid } from "../src/common";


test("isUserMessageValid", (t) => {
    t.equal(
        isUserMessageValid(1),
        false,
        "should return false when called with non-string parameter (integer)"
    );

    t.equal(
        isUserMessageValid(true),
        false,
        "should return false when called with non-string parameter (boolean)"
    );

    t.equal(
        isUserMessageValid(NaN),
        false,
        "should return false when called with non-string parameter (NaN)"
    );

    t.equal(
        isUserMessageValid(""),
        false,
        "should return false when called with empty string parameter"
    );

    t.equal(
        isUserMessageValid("test message"),
        true,
        "should return true when called with valid message"
    );

    t.end();
});


test("isNicknameValid", (t) => {
    t.equal(
        isNicknameValid(1),
        false,
        "should return false when called with non-string parameter (integer)"
    );

    t.equal(
        isNicknameValid(true),
        false,
        "should return false when called with non-string parameter (boolean)"
    );

    t.equal(
        isNicknameValid(NaN),
        false,
        "should return false when called with non-string parameter (NaN)"
    );

    t.equal(
        isNicknameValid(""),
        false,
        "should return false when called with empty string parameter"
    );

    t.equal(
        isNicknameValid("test message"),
        true,
        "should return true when called with valid nickname"
    );

    t.end();
});
