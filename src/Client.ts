import * as http from 'http';
import * as https from 'https';

export enum Protocol {
  HTTP = 'http',
  HTTPS = 'https'
}

enum HTTP_METHOD {
  GET = 'GET',
  POST = 'POST',
  PUT = 'PUT',
  DELETE = 'DELETE'
}
enum ResponseType {
  JSON = 'application/json',
  XML = 'application/xml',
  XML_TEXT = 'text/xml',
  HTML = 'text/html',
  SCRIPT = 'script'
}

export interface IOptions {
  baseUrl?: string;
  protocol: Protocol; // Whether to use https or regular http
  encoding: string; // Character encoding for received result
  port?: number; // Port of remote server
  error: (error: Error) => void; // Function to run on error with request
  headers: http.OutgoingHttpHeaders;
}

const defaultOptions: IOptions = {
  protocol: Protocol.HTTP,
  encoding: 'utf8',
  error: error => console.error(error),
  baseUrl: '',
  headers: {}
};

export class Client {
  private static isErrorStatus(response: http.IncomingMessage) {
    return response.statusCode >= 400 && response.statusCode < 600;
  }

  private static prepareData(data: string | {}) {
    if (data) {
      if (typeof data === 'object')
        return JSON.stringify(data);
      return data.toString();
    }
    return null;
  }

  private _options: IOptions; // Data type to be sent with query

  public constructor(url: string, options: Partial<IOptions> = defaultOptions) {
    this.parseOptions(options);
    this._options.baseUrl = url;
  }

  private parseOptions(options: Partial<IOptions>) {
    this._options = {
      ...defaultOptions,
      ...options
    };
  }

  private parseResponseData(type: ResponseType, data: string) {
    switch (type) {
      case ResponseType.JSON:
        return JSON.parse(data);

      case ResponseType.XML:
      case ResponseType.XML_TEXT:
      case ResponseType.HTML:
      case ResponseType.SCRIPT:
        return data;

      default:
        throw new Error(`Unsupported content-type for http response received: ${type}`);
    }
  }

  private createRequestFn(protocol: Protocol) {
    if (protocol === Protocol.HTTP)
        return http.request;
    else if (protocol === Protocol.HTTPS)
        return https.request;
    else
        throw new Error(`Unsupported protocol: ${protocol}`);
  }

  private responseHandler(response: http.IncomingMessage) {
    let data = '';
    let type: ResponseType;

    if (response.headers && response.headers['content-type'])
      type = response.headers['content-type'].split(';')[0] as ResponseType;

    response.on('data', chunkData => data += chunkData);

    return new Promise((resolve, reject) => {
      response.on('end', () => {
        try {
          const parsedData = this.parseResponseData(type, data);
          if (Client.isErrorStatus(response)) {
            this.options.error(new Error(parsedData));
            return reject(parsedData);
          }
          return resolve(parsedData);
        }
        catch (ex) {
          this.options.error(ex);
          return reject(ex);
        }
      });
    });
  }

  private request(type: HTTP_METHOD, path: string, data: string | {}) {
    const requestFn = this.createRequestFn(this._options.protocol);

    const { baseUrl, port, headers, protocol } = this._options;

    const preparedData = Client.prepareData(data);
    if (preparedData) {
      headers['content-length'] = preparedData.length;
    }

    const requestOptions: http.RequestOptions = {
      hostname: baseUrl,
      port,
      path,
      method: type,
      headers,
      protocol: `${protocol}:`
    };

    return new Promise((resolve, reject) => {
      const request = requestFn(requestOptions, async res => {
        try {
          const parsedResponse = await this.responseHandler(res);
          return resolve(parsedResponse);
        } catch (ex) {
          return reject(ex);
        }
      });

      request.on('error', error => {
        this._options.error(error);
        return reject(error);
      });

      if (preparedData) request.write(preparedData);
      request.end();
    });
  }

  public async get(path: string) {
    return this.request(HTTP_METHOD.GET, path, null);
  }

  public async post(path: string, data: string | {} = null) {
    return this.request(HTTP_METHOD.POST, path, data);
  }

  public async put(path: string, data: string | {} = null) {
    return this.request(HTTP_METHOD.PUT, path, data);
  }

  public async delete(path: string, data: string | {} = null) {
    return this.request(HTTP_METHOD.DELETE, path, data);
  }

  public get options() {
    return this._options;
  }
}
