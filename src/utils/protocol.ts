export const JWT_TOKEN_KEY = "secretkeyappearshere123";

export const decode = (code: string) => {
  return JSON.parse(code);
};

export const send = (socket: any, msg: Object) => {
  socket.send(JSON.stringify(msg));
};