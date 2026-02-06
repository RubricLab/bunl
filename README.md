# bunl

Expose localhost to the world. Bun-native WebSocket tunnel.

```bash
bun x bunl -p 3000
```

## Options

| Flag | Short | Default | Description |
| --- | --- | --- | --- |
| `--port` | `-p` | `3000` | Local port to expose |
| `--domain` | `-d` | `bunl.sh` | Tunnel server |
| `--subdomain` | `-s` | random | Requested subdomain |
| `--open` | `-o` | `false` | Open URL in browser |

## Development

```bash
bun i
bun dev:server   # tunnel server on :1234
bun demo         # demo app on :3000
bun client       # connect demo to server
bun test:e2e     # end-to-end tests
```
