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
import { Log, SOAPResponse } from '@/utils';
import { Router } from 'express';
import status from 'http-status';

import * as CurrentServices from './current';
import * as LegacyServices from './legacy';

export const ServiceVersions: { [key: string]: any } = {
  // '1.0.1': OldLegacyServices,
  '1.0.2': LegacyServices,
  '2.0': CurrentServices
};

export default class WebServiceRouter {
  readonly routes: Router = Router();

  constructor() {
    this.routes.use(
      new RegExp(
        `^/(([0-9].)+[0-9])/${ParadiseService.Instance.ServiceSettings.WebServicePrefix}(.+)${ParadiseService.Instance.ServiceSettings.WebServiceSuffix}$`
      ),
      async (req, res, next): Promise<any> => {
        const serviceVersionId = req.params[0];
        const serviceVersion = ServiceVersions[serviceVersionId!];
        if (!serviceVersion) return res.status(status.BAD_REQUEST).send('');

        const serviceId = req.params[2];
        const service = serviceVersion[serviceId!];

        if (!req.headers.soapaction) return res.status(status.INTERNAL_SERVER_ERROR).send(SOAPResponse.createFault());
        const soapAction = new URL((req.headers.soapaction as string).replace(/"/g, '')).pathname
          .substring(1)
          .split('/');

        const method = soapAction[1];

        if (!service) {
          Log.error(`Failed to handle ${serviceId}(${serviceVersionId}):${method}: Service not found`);
          return res.status(status.BAD_REQUEST).send('');
        }

        if (req.headers['content-type'] !== 'text/xml; charset=utf-8') {
          res.statusMessage = `Cannot process the message because the content type '${req.headers['content-type']}' was not the expected type 'text/xml; charset=utf-8'.`;
          return res.status(status.UNSUPPORTED_MEDIA_TYPE).send();
        }

        if (!req.body || !Object.keys(req.body).length) return res.status(status.BAD_REQUEST).send('');

        if (service.ServiceInterface !== soapAction[0])
          return res.status(status.INTERNAL_SERVER_ERROR).send(SOAPResponse.createFault(req.headers.soapaction));

        const body = req.body['s:Envelope']['s:Body'][0];
        const bodyMethod = Object.keys(body)[0];
        const bodyData = body[bodyMethod!][0].data[0];

        if (bodyMethod !== method)
          return res.status(status.INTERNAL_SERVER_ERROR).send(SOAPResponse.createFault(req.headers.soapaction));

        if (!service[method!]) {
          Log.error(`Failed to handle ${serviceId}(${serviceVersionId}):${method}: Not implemented`);
          return res.status(status.INTERNAL_SERVER_ERROR).send(SOAPResponse.createFault(req.headers.soapaction));
        }

        const inputBytes = [...Buffer.from(bodyData, 'base64')];

        try {
          Log.debug(`${serviceId}(${serviceVersionId}):${method}`);
          const bytes = await service[method!](inputBytes, []);

          res.setHeader('Content-Type', 'text/xml; charset=utf-8');
          res.setHeader('Server', 'Microsoft-HTTPAPI/2.0');

          if (!bytes) {
            return res.status(status.INTERNAL_SERVER_ERROR).send(SOAPResponse.createFault(req.headers.soapaction));
          }

          return res.status(status.OK).send(SOAPResponse.create(bodyMethod!, bytes ?? []));
        } catch (error: any) {
          Log.error(error);
          return res.status(status.INTERNAL_SERVER_ERROR).send(error.message);
        }
      }
    );
  }
}
