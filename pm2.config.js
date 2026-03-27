module.exports = {
  apps: [
    {
      name: "univ-frontend",
      cwd: "/var/www/workers/news-universitiy",
      script: "npm",
      args: "run dev -- --host",
      interpreter: "none",
      env: {
        NODE_ENV: "development",
      },
    },
  ],
};
