# syntax=docker/dockerfile:1

FROM --platform=$BUILDPLATFORM mcr.microsoft.com/dotnet/sdk:10.0-alpine AS build
WORKDIR /src

COPY ./packages/realtime ./packages/realtime
COPY --parents ./packages/shims/Photon.SocketServer \
               ./packages/shims/Photon3Unity3D \
               ./packages/shims/PhotonHostRuntimeInterfaces \
               ./packages/shims/shared \
               ./packages/shims/UnityEngine \
               ./
COPY ./packages/vendor/LiteNetLib ./packages/vendor/LiteNetLib
COPY ./packages/vendor/UberStrike ./packages/vendor/UberStrike

RUN dotnet build packages/realtime/Paradise.Realtime.Host/Paradise.Realtime.Host.csproj -c Release -r linux-musl-x64

FROM alpine:3.24 AS runtime
RUN apk add dotnet10-runtime mono
WORKDIR /app

COPY --from=build /src/.release/server/_pak/Paradise.Realtime ./
# COPY --from=build /src/.release/server/_pak/Paradise.Realtime/photon/   ./photon/

WORKDIR /app
ENTRYPOINT ["sh", "-c", "sleep 2 && exec mono Paradise.Realtime.Host.exe \"$@\"", "--"]
CMD ["comm"]