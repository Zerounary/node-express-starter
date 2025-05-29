import LiveDirectory from "live-directory";

const LiveAssets = new LiveDirectory("./assets/", {
  // Optional: Configure filters to ignore or include certain files, names, extensions etc etc.
  cache: {
    max_file_size: 1024 * 1024 * 300, // 300MB
  },
  filter: {
    // keep: {
    // Something like below can be used to only serve images, css, js, json files aka. most common web assets ONLY
    // extensions: ['css', 'js', 'json', 'png', 'jpg', 'jpeg', 'html', 'htm', 'zip', '']
    // },
  },
});

export const initAssets = (webserver) => {
  webserver.get("/", (request, response) => {
    return response.redirect("/assets/index.html");
  });

  // Create static serve route to serve frontend assets
  webserver.get("/assets/*", (request, response) => {
    // Strip away '/assets' from the request path to get asset relative path
    // Lookup LiveFile instance from our LiveDirectory instance.
    const path = request.path.replace("/assets", "");
    // Retrieve the LiveFile instance for this asset
    const asset = LiveAssets.get(path);
    if (!asset) return response.status(404).send("Not Found");

    const fileParts = asset.path.split(".");
    const extension = fileParts[fileParts.length - 1];
    response.type(extension);

    // Send the asset content as response depending on if the file is cached
    if (asset.cached) {
      // Simply send the Buffer returned by asset.content as the response
      // You can convert a Buffer to a string using Buffer.toString() if your webserver requires string response body
      return response.send(asset.content);
    } else {
      // For files that are not cached, you must create a stream and pipe it as the response for memory efficiency
      const readable = asset.stream();
      return readable.pipe(response);
    }
  });
};
