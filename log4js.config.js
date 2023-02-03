export default {
  appenders: {
    output: {
      type: "file",
      filename: "logs/logger.log",
      maxLogSize: "1K", //  K, M, G
      backups: 3,
      compress: false,
      layout: {
        type: "pattern",
        pattern: "[%d{yyyy-MM-dd hh:mm:ss}] [%p] %f{1} line-%l: %m",
      },
    },
  },
  categories: {
    default: {
      appenders: ["output"],
      level: "debug",
      enableCallStack: true
    },
  },
};