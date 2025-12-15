FROM node:18-alpine AS base
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .

FROM base AS uat
ENV NODE_ENV=uat
EXPOSE 8787
CMD ["npm", "start"]

FROM base AS production
ENV NODE_ENV=production
EXPOSE 8787
CMD ["npm", "start"]
