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

import type { Map, ShopItem, ShopItemPrice } from '@festivaldev/paradise-models';
import type { MapSettings } from '@festivaldev/uberstrike-js/UberStrike/Core/Models/Views';

export const stripPrices = <T extends Partial<ShopItem>>(items: T[]) =>
  items.map((item) => ({ ...item, Prices: undefined }));

export const getPrices = <T extends Partial<ShopItem & { Prices: Partial<ShopItemPrice>[] }>>(
  items: T[],
  key: string
) =>
  items.reduce((acc: any[], item) => {
    if (!item.Prices || !item.Prices.length) return acc;
    acc.push(...item.Prices.map((price) => ({ ...price, ID: item.ID, [key]: item.ID })));
    return acc;
  }, []);

export const getMapSettings = <T extends Partial<Map> & { Settings: Record<string, Partial<MapSettings> | undefined> }>(
  maps: T[]
) =>
  maps.reduce((acc: any[], cur) => {
    Object.entries(cur.Settings).forEach(([key, value]) => {
      acc.push({
        ...(value as object),
        MapId: cur.MapId,
        GameModeType: key
      });
    });

    return acc;
  }, []);
