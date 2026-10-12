import test from "node:test";
import assert from "node:assert/strict";
import worker from "../src/index.js";
function fakeKV() {
    const m = new Map();
    return {
        async put(k, v) { m.set(k, v); },
        async get(k, type) {
            const v = m.get(k);
            if (v === undefined) return null;
            return type === "json" ? JSON.parse(v) : v;
        },
        async list({ prefix }) {
            return {
                keys: [...m.keys()].filter((k) => k.startsWith(prefix)).map((name) =>
                    ({ name }))
            };
        },
    };
}
const call = (method, body, env = { NOTES: fakeKV() }) =>
    worker.fetch(
        new Request("http://x/notes", { method, body }),
        env
    );
test("POST invalid JSON returns 400", async () => {
    assert.equal((await call("POST", "{bukan json")).status, 400);
});
test("POST empty text returns 400", async () => {
    assert.equal((await call("POST", JSON.stringify({ text: " " }))).status, 400);
});
test("POST then GET returns created note", async () => {
    const env = { NOTES: fakeKV() };
    const created = await call("POST", JSON.stringify({ text: "halo" }), env);
    assert.equal(created.status, 201);
    const list = await (await call("GET", undefined, env)).json();
    assert.equal(list.length, 1);
    assert.equal(list[0].text, "halo");
});
test("DELETE returns 405", async () => {
    assert.equal((await call("DELETE")).status, 405);
});