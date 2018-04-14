import 'mocha';
import { Client, Protocol } from '../src/Client';
import { expect, should, use, spy } from 'chai';
import * as spies from 'chai-spies';
import * as http from 'http';
import { isNullOrUndefined } from 'util';
var ServerMock = require('mock-http-server');

use(spies);

describe('Client', () => {
    var server = new ServerMock({ host: 'localhost', port: 9000 });

    server.on({
        method: '*',
        path: '/error',
        reply: {
            status: 404,
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ hello: 'world' })
        }
    });

    server.on({
        method: '*',
        path: '/exception',
        reply: {
            status: 404,
            headers: { 'content-type': 'application/json' },
            body: (req: http.IncomingMessage) => { req.socket.destroy(); }
        }
    });

    server.on({
        method: '*',
        path: '/errorjson',
        reply: {
            status: 200,
            headers: { 'content-type': 'application/json' },
            body: req => {
                return '{\"hello:world\",123[]}';
            }
        }
    });

    server.on({
        method: '*',
        path: '/method',
        reply: {
            status: 200,
            headers: { 'content-type': 'application/json; charset=utf-8' },
            body: req => {
                return JSON.stringify({ method: req.method });
            }
        }
    });

    server.on({
        method: '*',
        path: '/xml',
        reply: {
            status: 200,
            headers: { 'content-type': 'application/xml' },
            body: req => {
                return '<xml></xml>';
            }
        }
    });

    before(done => {
        console.log('before');
        server.start(done);
    });

    after(done => {
        console.log('after');
        server.stop(done);
    });

    it('should use default options', () => {
        const client = new Client('localhost');

        expect(typeof client.options.error).to.equal('function');
        expect(client.options.protocol).to.equal(Protocol.HTTP);
        expect(client.options.encoding).to.equal('utf8');
        expect(client.options.baseUrl).to.equal('localhost');
        expect(client.options.headers).to.deep.equal({});
    });

    it('should parse data', () => {
        const client = new Client('localhost');
        const jsonData = client['parseResponseData']('application/json' as any, '{"test":1}');
        const xmlData = client['parseResponseData']('application/xml' as any, '<xml></xml>');
        const xmlTextData = client['parseResponseData']('text/xml' as any, '<xml></xml>');
        const htmlData = client['parseResponseData']('text/html' as any, '<h1>hello world</h1>');
        const script = client['parseResponseData']('script' as any, 'myscript');

        expect(jsonData).to.deep.equal({ test: 1 });
        expect(xmlData).to.equal('<xml></xml>');
        expect(xmlTextData).to.equal('<xml></xml>');
        expect(htmlData).to.equal('<h1>hello world</h1>');
        expect(script).to.equal('myscript');

        expect(() => client['parseResponseData']('unknown' as any, 'unknown data')).to.throw('Unsupported content-type for http response received: unknown');
    });

    it('should return request method', () => {
        const client = new Client('localhost');
        const httpFn = client['createRequestFn'](Protocol.HTTP);
        const httpsFn = client['createRequestFn'](Protocol.HTTPS);

        expect(typeof httpFn).to.equal('function');
        expect(typeof httpsFn).to.equal('function');
        expect(() => client['createRequestFn']('unknown' as any)).to.throw('Unsupported protocol: unknown');
    });

    it('should return true for error-status', () => {
        const res = new http.IncomingMessage(null);
        res.statusCode = 400;
        expect(Client['isErrorStatus'](res)).to.be.true;

        res.statusCode = 450;
        expect(Client['isErrorStatus'](res)).to.be.true;

        res.statusCode = 500;
        expect(Client['isErrorStatus'](res)).to.be.true;

        res.statusCode = 599;
        expect(Client['isErrorStatus'](res)).to.be.true;
    });

    it('should return false for error-status', () => {
        const res = new http.IncomingMessage(null);
        res.statusCode = 200;
        expect(Client['isErrorStatus'](res)).to.be.false;

        res.statusCode = 204;
        expect(Client['isErrorStatus'](res)).to.be.false;

        res.statusCode = 100;
        expect(Client['isErrorStatus'](res)).to.be.false;

        res.statusCode = 600;
        expect(Client['isErrorStatus'](res)).to.be.false;
    });

    it('should prepare data for http-request', () => {

        const regularString = Client['prepareData']('hello world');
        const stringifiedObject = Client['prepareData']({ hello: 'world' });
        const strNumber = Client['prepareData'](123);
        const empty = Client['prepareData'](null);

        expect(regularString).to.equal('hello world');
        expect(stringifiedObject).to.equal('{\"hello\":\"world\"}');
        expect(strNumber).to.equal('123');
        expect(empty).to.be.null;

    });

    it('should parse request from mock server', async () => {
        const client = new Client('localhost', { port: 9000 });

        const getResponse = await client.get('/method');
        const putResponse = await client.put('/method');
        const postResponse = await client.post('/method');
        const deleteResponse = await client.delete('/method');
        const postResponseData = await client.post('/method', { hello: 'world' });

        expect(putResponse).to.deep.equal({ method: 'PUT' });
        expect(postResponse).to.deep.equal({ method: 'POST' });
        expect(deleteResponse).to.deep.equal({ method: 'DELETE' });
        expect(postResponseData).to.deep.equal({ method: 'POST' });

    });

    it('should trigger default error function on request', async () => {
        console.error = spy((...any) => {

        });

        const client = new Client('localhost', { port: 9000 });
        let errorException = null;
        let errorResponse = null;
        try {
            errorResponse = await client.get('/error');
        }
        catch (ex) {
            errorException = ex;
        }
        expect(errorException).to.not.be.null;
        expect(errorException).to.deep.equal({ hello: 'world' });
        expect(errorResponse).to.be.null;

        errorException = null;
        errorResponse = null;
        try {
            errorResponse = await client.get('/errorjson');
        } catch (ex) {
            errorException = ex;
        }
        expect(errorException).to.not.be.null;
        expect(errorResponse).to.be.null;

        errorException = null;
        errorResponse = null;
        try {
            errorResponse = await client.get('/exception');
        } catch (ex) {
            errorException = ex;
        }
        expect(errorException).to.not.be.null;
        expect(console.error).to.have.been.called.exactly(3);
    });

});