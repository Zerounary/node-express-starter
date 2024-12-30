import HyperExpress from 'hyper-express'
import LiveDirectory from 'live-directory';
import path from 'path';
const webserver = new HyperExpress.Server();

import pub_api from '@/router/api/pub'
import api_v1_router from '@/router/api/v1'
import ws_router from '@/router/ws'

webserver.use("/", pub_api);
webserver.use("/api/v1", api_v1_router);
webserver.use("/ws", ws_router);

const LiveAssets = new LiveDirectory('./assets/', {
    // Optional: Configure filters to ignore or include certain files, names, extensions etc etc.
    filter: {
        keep: {
            // Something like below can be used to only serve images, css, js, json files aka. most common web assets ONLY
            extensions: ['css', 'js', 'json', 'png', 'jpg', 'jpeg', 'html', 'htm']
        },
    },
});

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
