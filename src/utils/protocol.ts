export const decode = (code: string) => {
  return JSON.parse(code);
};

export const send = (socket: any, msg: Object) => {
  socket.send(JSON.stringify(msg));
};