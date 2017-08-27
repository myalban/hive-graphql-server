const HEADER_REGEX = /bearer token-(.*)$/;

// NOTE: Not used anywhere really - was temp placeholder before.
module.exports.authenticate = async ({ headers: { authorization } }, Users) => {
  const email = authorization && HEADER_REGEX.exec(authorization)[1];
  return email && await Users.findOne({ email });
};
