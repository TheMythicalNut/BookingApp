# Stage 1: Build Angular app
FROM node:24.11.0-alpine AS build

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm install

# Copy source code
COPY . .

# Build the Angular app for production
RUN npm run build -- --configuration development

# Stage 2: Serve with Nginx
FROM nginx:alpine

# Remove default nginx website
RUN rm -rf /usr/share/nginx/html/*

# Copy built Angular files from previous stage
COPY --from=build /app/dist/spletka/browser /usr/share/nginx/html

# SPA routing
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose port 80
EXPOSE 80 443

# Start Nginx
CMD ["nginx", "-g", "daemon off;"]