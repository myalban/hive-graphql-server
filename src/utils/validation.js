class ValidationError extends Error {
  constructor(message, field) {
    super(message);
    this.field = field;
  }
}

module.exports = {
  assertValidLink: ({ url }) => {
    try {
      new URL(url);
    } catch (error) {
      throw new ValidationError(`Link validation error: invalid url ${url}`, 'url');
    }
  }
};
