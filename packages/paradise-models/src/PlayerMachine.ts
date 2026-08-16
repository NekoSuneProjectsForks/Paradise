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

import { BaseEntity, Column, Entity, JoinColumn, ManyToOne, PrimaryColumn, type Relation } from 'typeorm';
import { PublicProfile } from './PublicProfile';

@Entity('PlayerMachines')
export class PlayerMachine extends BaseEntity {
  @PrimaryColumn('int')
  Cmid: number;

  @PrimaryColumn('varchar')
  SystemIdentifier: string; // CSProduct -> UUID

  @Column('varchar', { nullable: true })
  SystemVendor: string | null; // CSProduct -> Vendor

  @Column('varchar', { nullable: true })
  SystemModel: string | null; // CSProduct -> Name

  @Column('varchar', { nullable: true })
  SystemDeviceType: string | null;

  @Column('varchar', { nullable: true })
  SystemOperatingSystem: string | null; // OS -> Caption,Version,OSArchitecture

  @Column('varchar', { nullable: true })
  SystemProcessorVendor: string | null; // CPU -> Manufacturer

  @Column('varchar', { nullable: true })
  SystemProcessorModel: string | null; // CPU -> Name

  @Column('varchar', { nullable: true })
  SystemCoreCount: number | null; // CPU -> NumberOfCores

  @Column('varchar', { nullable: true })
  SystemThreadCount: number | null; // CPU -> NumberOfLogicalProcessors

  @Column('int', { nullable: true })
  SystemMemory: BigInt | null; // ComputerSystem -> TotalPhysicalMemory

  @Column('varchar', { nullable: true })
  GPUVendor: string | null;

  @Column('varchar', { nullable: true })
  GPUModel: string | null;

  @Column('varchar', { nullable: true })
  GPUVendorID: string | null;

  @Column('varchar', { nullable: true })
  GPUDeviceID: string | null;

  @Column('int', { nullable: true })
  GPUMemory: BigInt | null;

  @Column('varchar', { nullable: true })
  GPUDriverVersion: string | null; // wmic PATH Win32_videocontroller WHERE "AdapterRAM > 0" GET Caption,DriverVersion,AdapterRAM,AdapterCompatibility

  @Column('varchar', { nullable: true })
  ClientVersion: string | null;

  @Column('varchar', { nullable: true })
  ParadiseVersion: string | null;

  @Column('varchar', { nullable: true })
  ParadiseBuild: string | null;

  @ManyToOne(() => PublicProfile, (publicProfile) => publicProfile.Machines, {
    onUpdate: 'CASCADE',
    onDelete: 'CASCADE'
  })
  @JoinColumn({ name: 'Cmid', referencedColumnName: 'Cmid' })
  PublicProfile: Relation<PublicProfile>;
}
