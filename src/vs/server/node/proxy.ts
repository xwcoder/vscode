/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as http from 'http';
import * as url from 'url';
import httpProxy from 'http-proxy';
import * as net from 'net';

const proxy = httpProxy.createProxyServer({ ws: true });

proxy.on('error', (e, req, res) => {
	if (typeof (res as any).writeHead === 'function') {
		(res as any).writeHead(500);
		res.end(e.message);
	} else {
		res.end(`HTTP/1.1 500 ${e.message}\r\n\r\n`);
	}
});

const reg = /\/proxy\/(?<port>\d+)(?<path>(?:\/|$|\?|#)[^\?#]*)\??(?<query>[^#]*)/;

export const isProxyRoute = (pathname: string) => reg.test(pathname);

export const handle = (req: http.IncomingMessage, res: http.ServerResponse | net.Socket, parsedUrl: url.UrlWithParsedQuery) => {
	const pathname = parsedUrl.path!;
	const match = reg.exec(pathname);

	if (match === null) {
		(res as any).writeHead(404);
		res.end('It\'s not a proxy route');
		return;
	}

	const { groups: { port, path, query } = {} } = match;
	const target = `http://0.0.0.0:${port}${path}${query ? `?${query}` : ''}`;

	if (req.headers.upgrade && req.headers.upgrade.toLowerCase() === 'websocket') {
		proxy.ws(req, res as net.Socket, req.headers, {
			ignorePath: true,
			target
		});
	} else {
		proxy.web(req, res as http.ServerResponse, {
			ignorePath: true,
			target
		});
	}
};
