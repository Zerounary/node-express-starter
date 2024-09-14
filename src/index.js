const HyperExpress = require('hyper-express');
const webserver = new HyperExpress.Server();

const pino = require('pino')
const dest = pino.destination('./logs.log')
const logger = pino(dest)

const api_v1_router = new HyperExpress.Router();
const api_v2_router = new HyperExpress.Router();

// Create GET route to serve 'Hello World'
api_v1_router.get('/', (request, response) => {
    response.send('version1');
})


api_v2_router.get('/', (request, response) => {
    response.send('version2');
})

api_v2_router.get('/hi', (request, response) => {
    response.send('hi2');
    logger.info({
        message: 'hi2',
        client: 'abc',
        page: '/pages/home/index',
    })
})

webserver.use('/api/v1', api_v1_router);
webserver.use('/api/v2', api_v2_router);

// Activate webserver by calling .listen(port, callback);
const port = 90;
webserver.listen(port)
.then((socket) => console.log(`Webserver started on port ${port}`))
.catch((error) => console.log(`Failed to start webserver on port ${port}`));