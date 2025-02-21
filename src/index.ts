import HyperExpress from 'hyper-express'
import LiveDirectory from 'live-directory';
import path from 'path';
const webserver = new HyperExpress.Server();

import pub_api from '@/router/api/pub'
import api_v1_router from '@/router/api/v1'
import ws_router from '@/router/ws'
import { request } from 'http';
import { response } from 'express';

// 跨域设置
webserver.use((req, res, next) => {
    // 允许所有来源的跨域请求
    res.setHeader('Access-Control-Allow-Origin', '*');
    // 允许的请求方法
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
    // 允许的请求头
    res.setHeader('Access-Control-Allow-Headers', '*');
    // 允许携带凭证（如 cookies）
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    console.log('options');
    
    if (req.method.toLocaleLowerCase() == 'options') {
        res.send('');
    } else {
        next();
    }

});


webserver.use("/", pub_api);
webserver.use("/api/v1", api_v1_router);
webserver.use("/ws", ws_router);

const LiveAssets = new LiveDirectory('./assets/', {
    // Optional: Configure filters to ignore or include certain files, names, extensions etc etc.
    filter: {
        keep: {
            // Something like below can be used to only serve images, css, js, json files aka. most common web assets ONLY
            extensions: ['css', 'js', 'json', 'png', 'jpg', 'jpeg', 'html', 'htm', 'zip']
        },
    },
});

webserver.get('/', (request, response) => {
    return response.redirect('/assets/index.html')
})

// Create static serve route to serve frontend assets
webserver.get('/assets/*', (request, response) => {
    // Strip away '/assets' from the request path to get asset relative path
    // Lookup LiveFile instance from our LiveDirectory instance.
    const path = request.path.replace('/assets', '');
    const file = LiveAssets.get(path);
    
    // Return a 404 if no asset/file exists on the derived path
    if (file === undefined) return response.status(404).send();

    const fileParts = file.path.split(".");
    const extension = fileParts[fileParts.length - 1];

    return response.type(extension).send(file.content);
});

// Activate webserver by calling .listen(port, callback);
const port = 90;
webserver
  .listen(port)
  .then(() => console.log(`Webserver started on port ${port}`))
  .catch(() => console.log(`Failed to start webserver on port ${port}`));
