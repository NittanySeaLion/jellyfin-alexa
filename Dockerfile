FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install --omit=dev

COPY src ./src

RUN chown -R node:node /app

ENV NODE_ENV=production
EXPOSE 1456

USER node

CMD ["node", "src/index.js"]
