# One image holds everything: the C# service, with the built web app inside it.

# Stage 1: build the web app. Its output lands in the service's wwwroot folder.
FROM node:22-alpine AS web
WORKDIR /src/web
COPY web/package.json web/package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY web/ ./
RUN npm run build

# Stage 2: build the service and put the web app inside it.
FROM mcr.microsoft.com/dotnet/sdk:9.0 AS build
WORKDIR /src
COPY server/EduPulse.Api/EduPulse.Api.csproj server/EduPulse.Api/
RUN dotnet restore server/EduPulse.Api
COPY server/EduPulse.Api/ server/EduPulse.Api/
COPY --from=web /src/server/EduPulse.Api/wwwroot server/EduPulse.Api/wwwroot
RUN dotnet publish server/EduPulse.Api -c Release -o /app --no-restore

# Stage 3: a small image with only the runtime, run as an unprivileged user.
FROM mcr.microsoft.com/dotnet/aspnet:9.0
WORKDIR /app
COPY --from=build /app .
ENV ASPNETCORE_ENVIRONMENT=Production
USER $APP_UID
EXPOSE 8080
ENTRYPOINT ["dotnet", "EduPulse.Api.dll"]
