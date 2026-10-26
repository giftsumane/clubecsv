const baseConfig = require("./app.json").expo;

module.exports = () => {
  const isStaging = process.env.APP_VARIANT === "staging";

  return {
    ...baseConfig,
    name: isStaging ? "Clube CSV Staging" : baseConfig.name,
    scheme: isStaging ? "clubecsv-staging" : baseConfig.scheme,
    ios: {
      ...baseConfig.ios,
      bundleIdentifier: isStaging
        ? "com.csveventos.clubecsv.staging"
        : baseConfig.ios.bundleIdentifier,
    },
    android: {
      ...baseConfig.android,
      package: isStaging
        ? "com.csveventos.clubecsv.staging"
        : baseConfig.android.package,
    },
  };
};
