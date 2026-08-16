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

using System;
using System.Collections.Generic;
using System.IO;
using System.Text;

namespace Paradise.Transport {
    public enum WireMessageType : byte {
        Operation = 1,
        Event = 2,
        OperationResponse = 3,
    }

    internal enum WireTag : byte {
        Null,
        ByteArray,
        String,
        Int,
        Short,
        Byte,
        Bool,
        Long,
        Float,
        Double
    }

    public sealed class WireMessage {
        public WireMessageType Type;
        public byte Code;
        public short ReturnCode;
        public string DebugMessage;
        public Dictionary<byte, object> Parameters = new Dictionary<byte, object>();

        public static WireMessage Operation(byte code, Dictionary<byte, object> parameters) {
            return new WireMessage { Type = WireMessageType.Operation, Code = code, Parameters = parameters ?? new Dictionary<byte, object>() };
		}

        public static WireMessage Event(byte code, Dictionary<byte, object> parameters) {
            return new WireMessage { Type = WireMessageType.Event, Code = code, Parameters = parameters ?? new Dictionary<byte, object>() };
		}

        public static WireMessage OperationResponse(byte code, short returnCode, string debugMessage, Dictionary<byte, object> parameters) {
            return new WireMessage { Type = WireMessageType.OperationResponse, Code = code, ReturnCode = returnCode, DebugMessage = debugMessage, Parameters = parameters ?? new Dictionary<byte, object>() };
		}

		public static WireMessage Response(byte code, short returnCode, string debugMessage, Dictionary<byte, object> parameters) => OperationResponse(code, returnCode, debugMessage, parameters);
    }

    public static class WireCodec {
        public static byte[] Encode(WireMessage message) {
            using (var bytes = new MemoryStream(64))
            using (var writer = new BinaryWriter(bytes)) {
                writer.Write((byte)message.Type);
                writer.Write(message.Code);

                if (message.Type == WireMessageType.OperationResponse) {
                    writer.Write(message.ReturnCode);
                    EncodeString(writer, message.DebugMessage);
                }

                var parameters = message.Parameters;
                if (parameters == null) {
                    writer.Write((byte)0);
                } else if (parameters.Count > 255) {
                    throw new InvalidOperationException("Too many parameters (max 255).");
                } else {
                    writer.Write((byte)parameters.Count);

                    foreach (var entry in parameters) {
                        writer.Write(entry.Key);
                        EncodeValue(writer, entry.Value);
                    }
                }

                writer.Flush();
                return bytes.ToArray();
            }
        }

        public static WireMessage Decode(byte[] data, int offset, int length) {
			using (var bytes = new MemoryStream(data, offset, length, false))
			using (var reader = new BinaryReader(bytes)) {
				var message = new WireMessage {
					Type = (WireMessageType)reader.ReadByte(),
					Code = reader.ReadByte(),
				};

				if (message.Type == WireMessageType.OperationResponse) {
					message.ReturnCode = reader.ReadInt16();
					message.DebugMessage = DecodeString(reader);
				}

				int count = reader.ReadByte();

				for (int i = 0; i < count; i++) {
					byte key = reader.ReadByte();

					message.Parameters[key] = DecodeValue(reader);
				}

				return message;
			}
		}

		public static WireMessage Decode(byte[] data) => Decode(data, 0, data.Length);

        // #region Value Encoding/Decoding
        private static void EncodeValue(BinaryWriter writer, object value) {
            switch (value) {
                case null:
                    writer.Write((byte)WireTag.Null);
                    break;
                case byte[] _value:
                    writer.Write((byte)WireTag.ByteArray);
                    writer.Write(_value.Length);
                    writer.Write(_value);
                    break;
                case string _value:
                    writer.Write((byte)WireTag.String);
                    EncodeString(writer, _value);
                    break;
				case int _value:
                    writer.Write((byte)WireTag.Int);
                    writer.Write(_value);
                    break;
				case short _value:
                    writer.Write((byte)WireTag.Short);
                    writer.Write(_value);
                    break;
				case byte _value:
                    writer.Write((byte)WireTag.Byte);
                    writer.Write(_value);
                    break;
				case bool _value:
                    writer.Write((byte)WireTag.Bool);
                    writer.Write(_value);
                    break;
				case long _value:
                    writer.Write((byte)WireTag.Long);
                    writer.Write(_value);
                    break;
				case float _value:
                    writer.Write((byte)WireTag.Float);
                    writer.Write(_value);
                    break;
				case double _value:
                    writer.Write((byte)WireTag.Double);
                    writer.Write(_value);
                    break;
                default:
                    throw new NotSupportedException($"Unsupported wire value type: {value.GetType().FullName}");
            }
        }

        private static object DecodeValue(BinaryReader reader) {
			var tag = (WireTag)reader.ReadByte();

			switch (tag) {
				case WireTag.Null: return null;
				case WireTag.ByteArray: {
                    var length = reader.ReadInt32();
                    return reader.ReadBytes(length);
                }
				case WireTag.String: return DecodeString(reader);
				case WireTag.Int: return reader.ReadInt32();
				case WireTag.Short: return reader.ReadInt16();
				case WireTag.Byte: return reader.ReadByte();
				case WireTag.Bool: return reader.ReadBoolean();
				case WireTag.Long: return reader.ReadInt64();
				case WireTag.Float: return reader.ReadSingle();
				case WireTag.Double: return reader.ReadDouble();
				default: throw new NotSupportedException($"Unknown wire tag: {tag}");
			}
		}

        private static void EncodeString(BinaryWriter writer, string value) {
			if (value == null) {
                writer.Write(-1);
                return;
            }

			var bytes = Encoding.UTF8.GetBytes(value);
			writer.Write(bytes.Length);
			writer.Write(bytes);
		}

        private static string DecodeString(BinaryReader reader) {
			var length = reader.ReadInt32();

			if (length < 0) return null;

			return Encoding.UTF8.GetString(reader.ReadBytes(length));
		}
        // #endregion
    }

    public static class WireConnect {
		public static byte[] EncodeApplicationId(string applicationId) => Encoding.UTF8.GetBytes(applicationId ?? string.Empty);
		public static string DecodeApplicationId(byte[] data) => data == null ? string.Empty : Encoding.UTF8.GetString(data);
	}
}
