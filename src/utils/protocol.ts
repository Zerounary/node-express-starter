import { createVerifier, createSigner } from "fast-jwt";

export const JWT_TOKEN_KEY = "secretkeyappearshere123";

export const verifySync = createVerifier({ key: JWT_TOKEN_KEY, cache: true });

// 时间规则  https://www.npmjs.com/package/ms
export const signSyc = createSigner({ key: JWT_TOKEN_KEY, expiresIn: "24h"})

export const decode = (code: string) => {
  return JSON.parse(code);
};

export const send = (socket: any, msg: Object) => {
  socket.send(JSON.stringify(msg));
};