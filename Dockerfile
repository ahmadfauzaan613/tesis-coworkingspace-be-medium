FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
EXPOSE 5000

CMD ["sh", "-c", "npx knex migrate:latest && npx knex seed:run && node index.js"]