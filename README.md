# httpclient

HTTP Client for node.js, using node.js own `http` and `https` library. Zero dependencies!

## Getting Started

```
npm install @fu/httpclient
```

### Installing

To setup your own development environment: 

Install dev-dependencies

```
npm install --dev
```

Run tests

```
npm test
```


## Deployment

To use in your own project

```ts
import {Client} from '@fu/httpclient';
const client = new Client('localhost', {
    port: 80
});

const response = await client.get('/hello-world');
```

`new Client(hostname, options)`

Available options

    - `baseUrl` - hostname, uses the hostname parameter from the constructor
    - `protocol` - http or https
    - `encoding` - Character encoding 
    - `port` - Port to use for hostname, default 80 for http, 443 for https
    - `error` - Function to call when an error occurs
    - `headers` - HTTP headers for all requests

## Versioning

We use [SemVer](http://semver.org/) for versioning. For the versions available, see the [tags on this repository](https://github.com/your/project/tags). 


## License

This project is licensed under the MIT License - see the [LICENSE.md](LICENSE.md) file for details