import net from "net";

const DEV_PORT = Number(process.env.PORT ?? 3000);

function isPortInUse(port) {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.once("error", () => resolve(true));
    server.once("listening", () => {
      server.close();
      resolve(false);
    });
    server.listen(port, "127.0.0.1");
  });
}

if (await isPortInUse(DEV_PORT)) {
  console.error("");
  console.error("Build blocked: the dev server is still running on port", DEV_PORT + ".");
  console.error("Stop it first (Ctrl+C in the dev terminal), then run `npm run build` again.");
  console.error("Running build while dev is active breaks CSS and JS chunks in the browser.");
  console.error("");
  process.exit(1);
}
