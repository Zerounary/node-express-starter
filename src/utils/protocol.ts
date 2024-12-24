const decode = (code: string) => {
  return JSON.parse(code);
};

const send = (socket: any, msg: Object) => {
  socket.send(JSON.stringify(msg));
};

module.exports = {
  decode,
  send,
};
