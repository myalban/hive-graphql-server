// Relay edge-based pagination helpers. Based on example here: https://www.reindex.io/blog/relay-graphql-pagination-with-mongodb/
// To get a better sense of pagination in Gql, see: https://dev-blog.apollodata.com/understanding-pagination-rest-graphql-and-relay-b10f835549e7

// Takes a Mongo collection and an object of options for sorting + pagination
// Returns a cursor limited to before/after bounds and sorted accordingly.
export const limitQuery = async (collection, { sortField, sortOrder, before, after, q = {} }) => {
  let filter = { ...q };
  const limits = {};
  const ors = [];
  if (before) {
    const op = sortOrder === 1 ? '$lt' : '$gt';
    const beforeObject = await collection.findOne({
      _id: before,
    }, {
      fields: {
        [sortField]: 1,
      },
    });
    limits[op] = beforeObject[sortField];
    ors.push(
      {
        [sortField]: beforeObject[sortField],
        _id: { [op]: before },
      },
    );
  }

  if (after) {
    const op = sortOrder === 1 ? '$gt' : '$lt';
    const afterObject = await collection.findOne({
      _id: after,
    }, {
      fields: {
        [sortField]: 1,
      },
    });
    limits[op] = afterObject[sortField];
    ors.push(
      {
        [sortField]: afterObject[sortField],
        _id: { [op]: after },
      },
    );
  }

  if (before || after) {
    filter = {
      ...q,
      $or: [
        {
          [sortField]: limits,
        },
        ...ors,
      ],
    };
  }

  const sortOpts = { [sortField]: sortOrder, _id: sortOrder };
  return collection.find(filter).sort(sortOpts);
};

// Takes a Mongo cursor and an object with first # and last # of documents.
// Applies pagination to the cursor via skip and limit.
// Returns next/previous page information based on the cursor.
export const applyPagination = async (cursor, first, last) => {
  let count;

  if (first || last) {
    count = await cursor.count();
    let limit;
    let skip;

    if (first && count > first) {
      limit = first;
    }

    if (last) {
      if (limit && limit > last) {
        skip = limit - last;
        limit -= skip;
      } else if (!limit && count > last) {
        skip = count - last;
      }
    }

    if (skip) {
      cursor.skip(skip);
    }

    if (limit) {
      cursor.limit(limit);
    }
  }

  return {
    hasNextPage: Boolean(first && count > first),
    hasPreviousPage: Boolean(last && count > last),
  };
};
