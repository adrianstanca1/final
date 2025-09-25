# Simple nginx deployment using pre-built files
FROM nginx:alpine

# Copy pre-built assets to nginx
COPY dist /usr/share/nginx/html

# Copy nginx config for SPA routing
COPY nginx.conf /etc/nginx/nginx.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]