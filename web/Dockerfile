FROM oven/bun:latest

WORKDIR /app

# Copy all static files
COPY . .

EXPOSE 3000

# Run with file watching for development
CMD ["bun", "run", "dev"]