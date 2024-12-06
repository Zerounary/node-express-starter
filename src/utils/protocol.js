const decode = (code) => {
  return JSON.parse(code);
};

const send = (socket, msg) => {
  socket.send(JSON.stringify(msg));
};

module.exports = {
  decode,
  send,
};
