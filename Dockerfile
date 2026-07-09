# ── Build (Vite) ──────────────────────────────────────────────────────────
FROM node:22-alpine AS build
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

# Le variabili VITE_ vengono "cotte" nel bundle al build: Coolify le passa come
# build args. Il cervello del tutor è la Edge Function (VITE_AI_PROXY_URL).
ARG VITE_AI_PROXY_URL
ARG VITE_SUPABASE_ANON_KEY
ENV VITE_AI_PROXY_URL=$VITE_AI_PROXY_URL
ENV VITE_SUPABASE_ANON_KEY=$VITE_SUPABASE_ANON_KEY
RUN npm run build

# ── Serve (nginx statico) ─────────────────────────────────────────────────
FROM nginx:alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
