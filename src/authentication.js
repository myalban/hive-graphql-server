const HEADER_REGEX = /bearer token-(.*)$/;

// TODO: Use JWT instead
module.exports.authenticate = async ({ headers: { authorization } }, Users) => {
  const email = authorization && HEADER_REGEX.exec(authorization)[1];
  return email && await Users.findOne({ email });
};
