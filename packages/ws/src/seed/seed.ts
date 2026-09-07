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

import { createDataSource } from '@/Database';
import { ParadiseServiceSettings } from '@/ParadiseServiceSettings';
import { Log } from '@/utils';
import {
  ApplicationConfiguration,
  Map,
  MapSettings,
  PhotonServer,
  PublicProfile,
  ShopBundle,
  ShopBundleItem,
  ShopFunctionalItem,
  ShopGearItem,
  ShopItemPrice,
  ShopQuickItem,
  ShopWeaponItem
} from '@festivaldev/paradise-models';
import { In, Not, type BaseEntity } from 'typeorm';
import { getMapSettings, getPrices, stripPrices } from './helpers';

import yoctoSpinner from 'yocto-spinner';
import applicationConfiguration from './data/applicationConfiguration.json';
import bundleItems from './data/bundleItems.json';
import bundles from './data/bundles.json';
import maps from './data/maps.json';
import profiles from './data/profiles.json';
import shop from './data/shop.json';
import shopEconomy from './data/shop_economy.json';

const baseModels = [
  {
    model: ApplicationConfiguration,
    data: applicationConfiguration,
    conflicts: ['ApplicationId']
  },
  {
    model: PublicProfile,
    data: profiles,
    conflicts: ['Cmid']
  }
];

const shopModels = [
  {
    model: ShopFunctionalItem,
    data: stripPrices(shop.FunctionalItems),
    conflicts: ['ID']
  },
  {
    model: ShopGearItem,
    data: stripPrices(shop.GearItems),
    conflicts: ['ID']
  },
  {
    model: ShopQuickItem,
    data: stripPrices(shop.QuickItems),
    conflicts: ['ID']
  },
  {
    model: ShopWeaponItem,
    data: stripPrices(shop.WeaponItems),
    conflicts: ['ID']
  }
];

const shopModelsEconomy = [
  {
    model: ShopFunctionalItem,
    data: stripPrices(shopEconomy.FunctionalItems),
    conflicts: ['ID']
  },
  {
    model: ShopGearItem,
    data: stripPrices(shopEconomy.GearItems),
    conflicts: ['ID']
  },
  {
    model: ShopQuickItem,
    data: stripPrices(shopEconomy.QuickItems),
    conflicts: ['ID']
  },
  {
    model: ShopWeaponItem,
    data: stripPrices(shopEconomy.WeaponItems),
    conflicts: ['ID']
  }
];

const priceModels = [
  {
    data: getPrices(shop.FunctionalItems, 'FunctionalItemID')
  },
  {
    data: getPrices(shop.GearItems, 'GearItemID')
  },
  {
    data: getPrices(shop.QuickItems, 'QuickItemID')
  },
  {
    data: getPrices(shop.WeaponItems, 'WeaponItemID')
  }
];

const priceModelsEconomy = [
  {
    data: getPrices(shopEconomy.FunctionalItems, 'FunctionalItemID')
  },
  {
    data: getPrices(shopEconomy.GearItems, 'GearItemID')
  },
  {
    data: getPrices(shopEconomy.QuickItems, 'QuickItemID')
  },
  {
    data: getPrices(shopEconomy.WeaponItems, 'WeaponItemID')
  }
];

const seedModel = async (model: typeof BaseEntity, data: any) => {
  if (!data) return;

  const count = await model.count();

  if (count > 0) {
    Log.info(`Skipping ${model.name}: table not empty`);
    return;
  }

  try {
    const result = await model.insert(data);

    Log.success(`${model.name}: Inserted ${result.identifiers.length} rows`);
  } catch (error) {
    console.error(error);
    Log.error(`Failed to seed table ${model.name}`, error);
  }
};

const updateModel = async (model: typeof BaseEntity, data: any, conflictPaths: string[]) => {
  if (!data) return;

  try {
    const result = await model.upsert(data, conflictPaths);

    Log.success(`${model.name}: Update complete`);
  } catch (error) {
    Log.error(`Failed to update table ${model.name}`, error);
  }
};

const runDatabaseOperations = async (
  action: (model: typeof BaseEntity, data: any, conflictPaths?: string[]) => void,
  reset: boolean,
  economy: boolean = false
) => {
  await Promise.all(baseModels.map(({ model, data, conflicts }) => action(model, data, conflicts)));

  if (economy) {
    await Promise.all(shopModelsEconomy.map(({ model, data, conflicts }) => action(model, data, conflicts)));
  } else {
    await Promise.all(shopModels.map(({ model, data, conflicts }) => action(model, data, conflicts)));
  }

  await ShopItemPrice.clear();
  if (economy) {
    await Promise.all(
      priceModelsEconomy.map(({ data }) => action(ShopItemPrice, data, ['ID', 'Currency', 'Duration']))
    );
  } else {
    await Promise.all(priceModels.map(({ data }) => action(ShopItemPrice, data, ['ID', 'Currency', 'Duration'])));
  }

  await action(Map, [...maps], ['MapId']);
  await action(MapSettings, getMapSettings([...maps] as any), ['MapId', 'GameModeType']);

  await action(ShopBundle, bundles, ['Id']);
  await action(ShopBundleItem, bundleItems, ['id']);

  Log.info(`Database ${reset ? 'seed' : 'update'} completed.`);
};

export default async function runSeed(
  settings: ParadiseServiceSettings,
  reset: boolean = false,
  economy: boolean = false
) {
  Log.info('Connecting to database...');

  const dataSource = createDataSource(settings.DatabaseSettings);

  try {
    await dataSource.initialize();
  } catch (error: any) {
    Log.error('Error while initializing database', error);
    process.exit(0);
  }

  Log.info('Database connected.');

  if (reset) {
    Log.warn('Resetting database in 10 seconds. Press CTRL-C to cancel.');

    let seconds = 3;

    await new Promise<void>((resolve) => {
      process.stdout.write(`${seconds}...`);

      const countdown = setInterval(() => {
        seconds--;

        process.stdout.write(`${seconds}${seconds > 0 ? '...' : '\n'}`);

        if (seconds <= 0) {
          clearInterval(countdown);
          return resolve();
        }
      }, 1000);
    });
  }

  if (reset) {
    let spinner = yoctoSpinner({ text: 'Resetting database...' }).start();
    await dataSource.synchronize(true);
    spinner.stop();

    spinner = yoctoSpinner({ text: 'Seeding database...' }).start();
    await runDatabaseOperations((model, data) => seedModel(model, data), true, economy);
    spinner.stop();
  } else {
    const spinner = yoctoSpinner({ text: 'Seeding database...' }).start();
    await runDatabaseOperations((model, data, conflicts) => updateModel(model, data, conflicts!), false, economy);
    spinner.stop();
  }

  const servers = settings.PhotonServers;

  try {
    await PhotonServer.delete({
      PhotonId: Not(In(servers.map((_) => _.PhotonId))),
      Guid: Not(In(servers.map((_) => _.Guid)))
    });

    await PhotonServer.upsert(servers, ['PhotonId']);
  } catch (error: any) {
    Log.error('An error occurred while updating servers', error);
  }

  await dataSource.destroy();
}
