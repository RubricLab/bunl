# bunl

## A Bun WebSocket re-write of LocalTunnel

### Usage

To try it:

```bash
bun x bunl -p 3000 -d dev.rubric.me -s my-name
```

### Development

To install dependencies:

```bash
bun i
```

To run the server:

```bash
bun dev:server
```

(Optional) to run a dummy process on localhost:3000:

```bash
bun demo
```

To run the client:

```bash
bun client -p 3000
```

With full args:

```bash
bun client --port 3000 --domain example.so --subdomain my-subdomain --open
```

Or in shortform:

```bash
bun client -p 3000 -d example.so -s my-subdomain -o
```

The options:

- `port` / `p` the localhost port to expose eg. **3000**
- `domain` / `d` the hostname of the server Bunl is running on eg. **example.so**
- `subdomain` / `s` the public URL to request eg. **my-subdomain**.example.so
- `open` / `o` to auto-open your public URL in the browser

### [WIP] Deployment

To build the client code:

```bash
bun run build
```

To deploy the server, for example on [Fly](https://fly.io):

```bash
fly launch && fly deploy
```

Making sure to set `DOMAIN` to your domain:

```bash
fly secrets set DOMAIN=example.so
```

Open to PRs!
