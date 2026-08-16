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

using log4net;
using System.Collections.Generic;
using UberStrike.Core.Models.Views;

namespace Paradise.Realtime.Server.Game {
	public class ShopManager {
		private static readonly ILog Log = LogManager.GetLogger(nameof(ShopManager));

		public bool IsLoaded { get; private set; }

		public Dictionary<int, UberStrikeItemFunctionalView> FunctionalItems { get; set; }
		public Dictionary<int, UberStrikeItemGearView> GearItems { get; set; }
		public Dictionary<int, UberStrikeItemQuickView> QuickItems { get; set; }
		public Dictionary<int, UberStrikeItemWeaponView> WeaponItems { get; set; }

		public void Load() {
			var shopData = ShopWebServiceClient.Instance.GetShop();

			FunctionalItems = LoadShopItems(shopData.FunctionalItems);
			GearItems = LoadShopItems(shopData.GearItems);
			QuickItems = LoadShopItems(shopData.QuickItems);
			WeaponItems = LoadShopItems(shopData.WeaponItems);

			IsLoaded = true;
		}

		private Dictionary<int, T> LoadShopItems<T>(List<T> items) where T : BaseUberStrikeItemView {
			var dict = new Dictionary<int, T>(items.Count);
			foreach (var item in items) {
				dict.Add(item.ID, item);
			}

			return dict;
		}
	}
}
