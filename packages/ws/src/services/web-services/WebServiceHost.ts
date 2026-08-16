/*
 * Copyright (C) 2017, 2022-2026 Team FESTIVAL
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

import ParadiseService from '@/ParadiseService';
import { Log } from '@/utils';
import bodyParser from 'body-parser';
import bodyParserXml from 'body-parser-xml';
import express, { type Express } from 'express';
import * as http from 'http';
import status from 'http-status';
import morgan from 'morgan';
import type { AddressInfo } from 'net';
import type BaseWebService from './BaseWebService';
import WebServiceRouter, { ServiceVersions } from './WebServiceRouter';

export default class WebServiceHost {
  readonly port: number;
  readonly expressApp: Express;
  readonly serviceRouter: WebServiceRouter = new WebServiceRouter();

  private listener?: http.Server;

  constructor(port: number = 8080) {
    this.port = port;

    this.expressApp = express();
    this.expressApp.disable('x-powered-by');
    this.expressApp.disable('etag');
    this.expressApp.set('json spaces', 2);
    this.expressApp.set('trust proxy', true);

    this.expressApp.use(
      morgan(
        `[WebServiceHost] :remote-addr ":method :url HTTP/:http-version" :status (:req[Content-Length]/:res[content-length] bytes)`,
        {
          stream: {
            write: (message) => Log.debug(message.trim())
          }
        }
      )
    );

    bodyParserXml(bodyParser);

    this.expressApp.use(express.urlencoded({ extended: true }));
    this.expressApp.use(
      bodyParser.xml({
        verify(req, res, buf, encoding) {
          Log.debug(buf.toString('utf-8'));
        }
      })
    );

    this.expressApp.use((req, res, next) => {
      res.set('X-Powered-By', 'Hamsterwheel/1.0');
      res.set('Server', 'Microsoft-HTTPAPI/2.0');

      return next();
    });

    this.expressApp.use(this.serviceRouter.routes);

    this.expressApp.use((req, res, next) => {
      res.status(status.NOT_FOUND)
        .send(`<!DOCTYPE HTML PUBLIC "-//W3C//DTD HTML 4.01//EN""http://www.w3.org/TR/html4/strict.dtd">
<HTML>

<HEAD>
\t<TITLE>Not Found</TITLE>
\t<META HTTP-EQUIV="Content-Type" Content="text/html; charset=us-ascii">
</HEAD>

<BODY>
\t<h2>Not Found</h2>
\t<hr>
\t<p>HTTP Error 404. The requested resource is not found.</p>
</BODY>

</HTML>`);
    });
  }

  async start(): Promise<void> {
    Log.info('Starting Web Service server...');

    return new Promise((resolve, reject) => {
      try {
        this.listener = this.expressApp.listen(
          this.port,
          ParadiseService.Instance.ServiceSettings.Hostname ?? '0.0.0.0',
          () => {
            for (const [serviceVersion, services] of Object.entries(ServiceVersions) as [
              string,
              (typeof BaseWebService)[]
            ][]) {
              Log.debug(
                `${serviceVersion} => ${Object.values(services)
                  .map((_) => _.ServiceName)
                  .join(', ')}`
              );
            }

            try {
              const address: AddressInfo = this.listener?.address() as AddressInfo;
              Log.info(`Web Service server listening on ${address.address}:${address.port}.`);

              resolve();
            } catch (error: any) {
              reject(error);
            }
          }
        );
      } catch (error: any) {
        reject(error);
      }
    });
  }

  stop(): void {
    Log.info('Stopping Web Service server...');

    this.listener?.close();
    this.listener = undefined;
  }
}
