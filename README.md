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
bun server
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
bun client --port 3000 --domain localhost:1234 --subdomain my-subdomain
```

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
