module.exports = {
  apps: [
    {
      name: "univ-frontend",
      script: "npm",
      args: "run dev",
      env: {
        NODE_ENV: "development",
      },
      autorestart: true,
      watch: false,
      max_memory_restart: "1G",
    }
  ],
};
