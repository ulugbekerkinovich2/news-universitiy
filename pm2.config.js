module.exports = {
  apps: [
    {
      name: "univ-frontend",
      script: "npx",
      args: "serve -s dist -l 5173",
      env: {
        NODE_ENV: "production",
      },
      autorestart: true,
      max_memory_restart: "1G",
    }
  ],
};
