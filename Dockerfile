FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
ENV SCIP_TRUST_PROXY=true
RUN apk add --no-cache python3 make g++
COPY package.json ./
RUN npm ci
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npx", "tsx", "server.ts"]
