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
import { PhotonServer } from '@festivaldev/paradise-models';
import { PhotonUsageType, RegionType } from '@festivaldev/uberstrike-js/Cmune/DataCenter/Common/Entities';
import { Separator } from '@inquirer/prompts';
import chalk from 'chalk';
import Table from 'cli-table';
import crypto from 'crypto';
import net from 'net';
import { In, Not } from 'typeorm';
import yoctoSpinner from 'yocto-spinner';
import ConsoleCommand from '../ConsoleCommand';
import ConsoleHelper from '../ConsoleHelper';

export default class ServerCommand extends ConsoleCommand {
  static override command: string = 'server';
  static override description: string = 'Manages server credentials';
  static override get usageText(): string[] {
    const lines = [
      `${this.command}: ${this.description}`,
      '  list                                               List details about all known servers.',
      '  update                                             Update servers stored in the database.',
      '  add <photon-id> <name> <ip-address> <port> <type>  Create new credentials for connecting a server to this WebServices instance.',
      '  delete <pattern>                                   Delete a server entry from the database.',
      '  renew <pattern>                                    Generate new credentials for an existing server.',
      '  enable <pattern>                                   Enables a server for in-game use.',
      '  disable <pattern>                                  Disables a server and prevents it from being pushed to clients.'
    ];

    const values: string[] = [];
    for (const key of Object.keys(PhotonUsageType)) {
      if (!isNaN(Number(key)) && PhotonUsageType[key as any]) {
        values.push(`${key} = ${PhotonUsageType[key as any]}`);
      }
    }

    lines.push(`\nServer Types: ${values.join('; ')}`);

    return lines;
  }

  override async run([cmd, ...args]: string[]) {
    if (!cmd && this.allowInteractive) return this.runInteractive();

    if (!cmd) {
      this.printUsage();
      return 2;
    }

    switch (cmd.toLocaleLowerCase()) {
      case 'ls':
      case 'list':
        return this.listServers();
      case 'update':
        return this.executeUpdateServers();
      case 'add':
        return this.addServer(args);
      case 'delete':
        return this.deleteServer(args);
      case 'renew':
        return this.renewCredentials(args);
      case 'enable':
        return this.setServerEnabled(args, true);
      case 'disable':
        return this.setServerEnabled(args, false);
      default:
        this.writeLine(`${ServerCommand.command}: unknown command ${cmd}\n`);
        return 2;
    }
  }

  // #region non-interactive
  private async listServers() {
    const servers = await PhotonServer.find();

    const table = new Table({
      head: [
        chalk.white.bold('Photon ID'),
        chalk.white.bold('Server ID'),
        chalk.white.bold('Name'),
        chalk.white.bold('Passphrase'),
        chalk.white.bold('IP'),
        chalk.white.bold('Port'),
        chalk.white.bold('Type'),
        chalk.white.bold('API Version'),
        chalk.white.bold('Enabled')
      ],
      rows: servers.map((server) => [
        String(server.PhotonId),
        server.Guid,
        server.Name,
        server.Passphrase,
        server.IP,
        String(server.Port),
        String(PhotonUsageType[server.UsageType]),
        server.ApiVersion,
        server.Enabled ? 'Yes' : 'No'
      ])
    });

    this.writeLine(table.toString());

    return 0;
  }

  private async addServer([photonId, serverName, ipAddress, port, serverType]: string[]) {
    if (!photonId || !serverName || !ipAddress || !port || !serverType) {
      this.printUsage();
      return 2;
    }

    if (isNaN(Number(photonId))) {
      this.writeLine('Photon ID must be a numeric value.');
      return 2;
    }

    let photonServer = await PhotonServer.find({ where: { PhotonId: Number(photonId) } });

    if (photonServer) {
      this.writeLine(`A server with the Photon ID ${photonId} already exists.`);
      return 1;
    }

    if (serverName.length < 3) {
      this.writeLine('Server name must contain at least 3 characters.');
      return 2;
    }

    photonServer = await PhotonServer.find({ where: { Name: serverName } });

    if (photonServer) {
      this.writeLine(`A server with the name "${serverName}" already exists.`);
      return 1;
    }

    if (!net.isIP(ipAddress)) {
      this.writeLine('IP address must be a valid IPv4 or IPv6 address.');
      return 2;
    }

    if (isNaN(Number(port))) {
      this.writeLine('Port must be a numeric value.');
      return 2;
    }

    const type = isNaN(Number(serverType)) ? Number(PhotonUsageType[String(serverType) as any]) : Number(serverType);

    if (Number.isNaN(type) || !PhotonUsageType[type]) {
      this.writeLine('Invalid parameter: type');
      return 1;
    }

    return this.executeAddServer(Number(photonId), serverName, ipAddress, Number(port), Number(type));
  }

  private async deleteServer([pattern]: string[]) {
    if (!pattern) {
      this.printUsage();
      return 2;
    }

    if (pattern.length < 2) {
      this.writeLine('Search pattern must contain at least 2 characters.');
      return 2;
    }

    const photonServer = await PhotonServer.findServer(pattern);

    if (!photonServer) {
      this.writeLine(`Could not find any server matching "${pattern}".`);
      return 1;
    }

    return this.executeDeleteServer(photonServer);
  }

  private async renewCredentials([pattern]: string[]) {
    if (!pattern) {
      this.printUsage();
      return 2;
    }

    if (pattern.length < 2) {
      this.writeLine('Search pattern must contain at least 2 characters.');
      return 2;
    }

    const photonServer = await PhotonServer.findServer(pattern);

    if (!photonServer) {
      this.writeLine(`Could not find any server matching "${pattern}".`);
      return 1;
    }

    return this.executeRenewCredentials(photonServer);
  }

  private async setServerEnabled([pattern]: string[], enabled: boolean) {
    if (!pattern) {
      this.printUsage();
      return 2;
    }

    if (pattern.length < 2) {
      this.writeLine('Search pattern must contain at least 2 characters.');
      return 2;
    }

    const photonServer = await PhotonServer.findServer(pattern);

    if (!photonServer) {
      this.writeLine(`Could not find any server matching "${pattern}".`);
      return 1;
    }

    return this.executeSetServerEnabled(photonServer, enabled);
  }
  // #endregion

  // #region interactive
  private async runInteractive() {
    const task = await ConsoleHelper.select({
      message: 'Choose a task:',
      choices: [
        {
          name: 'List servers',
          value: 'list',
          description: 'List details about all known servers.'
        },
        {
          name: 'Update Servers',
          value: 'update',
          description: 'Update servers stored in the database.'
        },
        {
          name: 'Enable/disable server',
          value: 'set-state',
          description: 'Allows or prevents servers from being pushed to clients.'
        },
        new Separator(),
        {
          name: 'Add server',
          value: 'add',
          description: 'Create new credentials for connecting a server to this WebServices instance.'
        },
        {
          name: 'Delete server',
          value: 'delete',
          description: 'Delete a server entry from the database.'
        },
        {
          name: 'Renew credentials',
          value: 'renew',
          description: 'Generate new credentials for an existing server.'
        }
      ]
    });

    switch (task) {
      case 'list':
        return this.listServers();
      case 'update':
        return this.executeUpdateServers();
      case 'set-state':
        return this.setServerEnabledInteractive();
      case 'add':
        return this.addServerInteractive();
      case 'delete':
        return this.deleteServerInteractive();
      case 'renew':
        return this.renewCredentialsInteractive();
      default:
        this.writeLine(`${ServerCommand.command}: unknown command ${task}\n`);
        return 2;
    }
  }

  private async addServerInteractive() {
    const photonId = await ConsoleHelper.promptNumber({
      message: 'Photon ID:',
      required: true,
      validate: async (value) => {
        if (!value || isNaN(value)) return 'Invalid Photon ID.';

        if ((await PhotonServer.findOne({ where: { PhotonId: value } })) != null)
          return 'A server with this Photon ID already exists.';

        return true;
      }
    });

    const serverName = await ConsoleHelper.promptText({
      message: 'Server name:',
      required: true,
      validate: async (value) => {
        if ((await PhotonServer.findOne({ where: { Name: value } })) != null)
          return 'A server with this name already exists.';

        return true;
      }
    });

    const ipAddress = await ConsoleHelper.promptText({
      message: 'IP Address:',
      required: true,
      validate: (value) => net.isIP(value) !== 0 || 'IP address must be a valid IPv4 or IPv6 address.'
    });

    const port = await ConsoleHelper.promptNumber({
      message: 'Port:',
      required: true,
      validate: async (value) => {
        if (!value || isNaN(value)) return 'Invalid Port.';
        if (value === 0 || value > 65535) return 'Port must be in range of 0 - 65535.';

        return true;
      }
    });

    const type = await ConsoleHelper.select({
      message: 'Server Type:',
      choices: Object.entries(PhotonUsageType)
        .filter(([key]) => !isNaN(Number(key)))
        .map(([key, value]) => ({
          name: `${value} (${key})`,
          value: Number(key)
        }))
    });

    return this.executeAddServer(photonId!, serverName, ipAddress, port!, type);
  }

  private async deleteServerInteractive() {
    const photonServers = await PhotonServer.find();

    const photonServer = await ConsoleHelper.search({
      message: 'Select a server:',
      source: async (term) =>
        photonServers
          .filter(
            (server) =>
              !term ||
              server.Name.toLocaleLowerCase().includes(term.toLocaleLowerCase()) ||
              String(server.PhotonId).includes(term)
          )
          .map((server) => ({
            name: `${server.Name} (${server.PhotonId})`,
            value: server
          }))
    });

    return this.executeDeleteServer(photonServer);
  }

  private async renewCredentialsInteractive() {
    const photonServers = await PhotonServer.find();

    const photonServer = await ConsoleHelper.search({
      message: 'Select a server:',
      source: async (term) =>
        photonServers
          .filter(
            (server) =>
              !term ||
              server.Name.toLocaleLowerCase().includes(term.toLocaleLowerCase()) ||
              String(server.PhotonId).includes(term)
          )
          .map((server) => ({
            name: `${server.Name} (${server.PhotonId})`,
            value: server
          }))
    });

    return this.executeRenewCredentials(photonServer);
  }

  private async setServerEnabledInteractive() {
    const photonServers = await PhotonServer.find();

    const photonServer = await ConsoleHelper.search({
      message: 'Select a server:',
      source: async (term) =>
        photonServers
          .filter(
            (server) =>
              !term ||
              server.Name.toLocaleLowerCase().includes(term.toLocaleLowerCase()) ||
              String(server.PhotonId).includes(term)
          )
          .map((server) => ({
            name: `${server.Name} (${server.PhotonId})`,
            value: server
          }))
    });

    const enabled = await ConsoleHelper.select({
      message: 'Select a state:',
      choices: [
        {
          name: 'Enabled',
          value: true,
          disabled: photonServer.Enabled && '[enabled]'
        },
        {
          name: 'Disabled',
          value: false,
          disabled: !photonServer.Enabled && '[disabled]'
        }
      ]
    });

    return this.executeSetServerEnabled(photonServer, enabled);
  }
  // #endregion

  // #region executors
  private async executeUpdateServers() {
    if (
      (this.allowInteractive &&
        (await ConsoleHelper.confirm({
          message: `Are you sure you want to update servers stored in the database"?`
        }))) ||
      !this.allowInteractive
    ) {
      const spinner = yoctoSpinner({ text: 'Deleting server...' }).start();

      const servers = ParadiseService.Instance.ServiceSettings.PhotonServers;

      try {
        await PhotonServer.delete({
          PhotonId: Not(In(servers.map((_) => _.PhotonId))),
          Guid: Not(In(servers.map((_) => _.Guid)))
        });

        await PhotonServer.upsert(servers, ['PhotonId']);

        spinner.stop();

        this.writeLine(`Successfully updates ${servers.length} server(s).`);
      } catch (error: any) {
        spinner.stop();

        this.writeLine(error);
        return 1;
      }
    }

    return 0;
  }

  private async executeAddServer(
    photonId: number,
    serverName: string,
    ipAddress: string,
    port: number,
    serverType: PhotonUsageType
  ) {
    const spinner = yoctoSpinner({ text: 'Adding server...' }).start();

    try {
      const photonServer = await PhotonServer.save(
        PhotonServer.create({
          PhotonId: photonId,
          Guid: crypto.randomUUID(),
          Passphrase: crypto.createHash('sha256').update(`${photonId}_${new Date().getTime()}`).digest('base64'),
          IP: ipAddress,
          Port: port,
          Name: serverName,
          Enabled: true,
          ApiVersion: '2.0',
          Region: RegionType.EuWest,
          UsageType: serverType
        })
      );

      spinner.stop();

      this.writeLine(`Successfully added server "${serverName}".`);

      const table = new Table({
        head: [
          chalk.white.bold('Photon ID'),
          chalk.white.bold('Server ID'),
          chalk.white.bold('Name'),
          chalk.white.bold('Passphrase'),
          chalk.white.bold('IP'),
          chalk.white.bold('Port'),
          chalk.white.bold('Type'),
          chalk.white.bold('API Version'),
          chalk.white.bold('Enabled')
        ],
        rows: [
          [
            String(photonServer.PhotonId),
            photonServer.Guid,
            photonServer.Name,
            photonServer.Passphrase,
            photonServer.IP,
            String(photonServer.Port),
            String(PhotonUsageType[photonServer.UsageType]),
            photonServer.ApiVersion,
            photonServer.Enabled ? 'Yes' : 'No'
          ]
        ]
      });

      this.writeLine(table.toString());
    } catch (error: any) {
      spinner.stop();

      this.writeLine(error);
      return 1;
    }

    return 0;
  }

  private async executeDeleteServer(photonServer: PhotonServer) {
    if (
      (this.allowInteractive &&
        (await ConsoleHelper.confirm({
          message: `Are you sure you want to delete the server "${photonServer.Name}"?`
        }))) ||
      !this.allowInteractive
    ) {
      const spinner = yoctoSpinner({ text: 'Deleting server...' }).start();

      try {
        await PhotonServer.delete(photonServer.PhotonId);

        spinner.stop();

        this.writeLine(`Successfully deleted server "${photonServer.Name}".`);
      } catch (error: any) {
        spinner.stop();

        this.writeLine(error);
        return 1;
      }
    }

    return 0;
  }

  private async executeRenewCredentials(photonServer: PhotonServer) {
    if (
      (this.allowInteractive &&
        (await ConsoleHelper.confirm({
          message: `Are you sure you want to renew the credentials for the server "${photonServer.Name}"?`
        }))) ||
      !this.allowInteractive
    ) {
      const spinner = yoctoSpinner({ text: 'Renewing credentials...' }).start();

      try {
        const updated = await PhotonServer.save({
          ...photonServer,
          Guid: crypto.randomUUID(),
          Passphrase: crypto
            .createHash('sha256')
            .update(`${photonServer.PhotonId}_${new Date().getTime()}`)
            .digest('base64')
        });

        spinner.stop();

        this.writeLine(`Successfully renewed credentials for server "${photonServer.Name}".`);

        const table = new Table({
          head: [
            chalk.white.bold('Photon ID'),
            chalk.white.bold('Server ID'),
            chalk.white.bold('Name'),
            chalk.white.bold('Passphrase'),
            chalk.white.bold('IP'),
            chalk.white.bold('Port'),
            chalk.white.bold('Type'),
            chalk.white.bold('API Version'),
            chalk.white.bold('Enabled')
          ],
          rows: [
            [
              String(updated.PhotonId),
              updated.Guid,
              updated.Name,
              updated.Passphrase,
              updated.IP,
              String(updated.Port),
              String(PhotonUsageType[updated.UsageType]),
              updated.ApiVersion,
              updated.Enabled ? 'Yes' : 'No'
            ]
          ]
        });

        this.writeLine(table.toString());
      } catch (error: any) {
        spinner.stop();

        this.writeLine(error);
        return 1;
      }
    }

    return 0;
  }

  private async executeSetServerEnabled(photonServer: PhotonServer, enabled: boolean) {
    if (
      (this.allowInteractive &&
        (await ConsoleHelper.confirm({
          message: `Are you sure you want to ${enabled ? 'enable' : 'disable'} the server "${photonServer.Name}"?`
        }))) ||
      !this.allowInteractive
    ) {
      const spinner = yoctoSpinner({ text: `${enabled ? 'Enabling' : 'Disabling'} server...` }).start();

      try {
        await PhotonServer.update(photonServer.PhotonId, {
          Enabled: enabled
        });

        spinner.stop();

        this.writeLine(`Successfully ${enabled ? 'enabled' : 'disabled'} server "${photonServer.Name}".`);
      } catch (error: any) {
        spinner.stop();

        this.writeLine(error);
        return 1;
      }
    }

    return 0;
  }
  // #endregion
}
