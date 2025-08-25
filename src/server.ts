import webserver from "./app";

export function start() {
    const port = 80; //process.env.PORT || 22987;
    webserver.get('/benchmark', async (req, res) => {
      return res.send('ok');
    })
    webserver.get('/benchmark2', (req, res) => {
      return res.send('ok');
    })
    webserver
      .listen(port)
      .then(() => {
        console.log(`Webserver started on port ${port}`);
      })
      .catch(() => console.log(`Failed to start webserver on port ${port}`));
} 