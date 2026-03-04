import { exec } from "child_process";
import fs from "fs";
import path from "path";

export class DeployService {
  async generateDeployFiles() {
    const deployDir = path.join(process.cwd(), "deploy");
    if (!fs.existsSync(deployDir)) {
      fs.mkdirSync(deployDir);
    }

    const dockerCompose = `
version: '3.8'
services:
  backend:
    build:
      context: .
      dockerfile: Dockerfile.backend
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - GEMINI_API_KEY=\${GEMINI_API_KEY}
    volumes:
      - ./uzbechka.db:/app/uzbechka.db
    restart: always

  admin:
    build:
      context: .
      dockerfile: Dockerfile.admin
    ports:
      - "80:80"
    depends_on:
      - backend
    restart: always
`;

    const dockerfileBackend = `
FROM node:20-slim
WORKDIR /app
COPY package*.json ./
RUN npm install --production
COPY . .
EXPOSE 3000
CMD ["npm", "start"]
`;

    const dockerfileAdmin = `
FROM node:20-slim AS build
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
`;

    const nginxConf = `
server {
    listen 80;
    server_name localhost;

    location / {
        root /usr/share/nginx/html;
        index index.html;
        try_files $uri $uri/ /index.html;
    }

    location /api {
        proxy_pass http://backend:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    location /socket.io {
        proxy_pass http://backend:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "Upgrade";
    }
}
`;

    const autoUpdate = `
#!/bin/bash
git pull origin main
docker-compose up -d --build
`;

    fs.writeFileSync(path.join(deployDir, "docker-compose.yml"), dockerCompose);
    fs.writeFileSync(path.join(deployDir, "Dockerfile.backend"), dockerfileBackend);
    fs.writeFileSync(path.join(deployDir, "Dockerfile.admin"), dockerfileAdmin);
    fs.writeFileSync(path.join(deployDir, "nginx.conf"), nginxConf);
    fs.writeFileSync(path.join(deployDir, "auto-update.sh"), autoUpdate);
    fs.chmodSync(path.join(deployDir, "auto-update.sh"), "755");

    return true;
  }

  async deployUpdate() {
    return new Promise((resolve, reject) => {
      exec("sh ./deploy/auto-update.sh", (error, stdout, stderr) => {
        if (error) {
          console.error(`Deploy error: ${error}`);
          return reject(error);
        }
        console.log(`Deploy stdout: ${stdout}`);
        resolve(true);
      });
    });
  }
}
