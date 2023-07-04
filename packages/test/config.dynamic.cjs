const officeAddinDevCerts = require('office-addin-dev-certs');

module.exports = async () => ({
  https: await officeAddinDevCerts.getHttpsServerOptions(),
  projectRoot: __dirname,
});
