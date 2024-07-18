/**
 * Mongoose Aggregate Paginate
 * @param  {Aggregate} aggregate
 * @param  {any} options
 * @param  {function} [callback]
 * @returns {Promise}
 */

const defaultOptions = {
  customLabels: {
    totalDocs: "totalDocs",
    limit: "limit",
    page: "page",
    totalPages: "totalPages",
    docs: "docs",
    nextPage: "nextPage",
    prevPage: "prevPage",
    pagingCounter: "pagingCounter",
    hasPrevPage: "hasPrevPage",
    hasNextPage: "hasNextPage",
    meta: null,
  },
  collation: {},
  lean: false,
  leanWithId: true,
  limit: 10,
  projection: {},
  select: "",
  options: {},
  pagination: true,
  countQuery: null,
  useFacet: true,
};

const PREPAGINATION_PLACEHOLDER = "__PREPAGINATE__";

function aggregatePaginate(query, options, callback) {
  options = {
    ...defaultOptions,
    ...aggregatePaginate.options,
    ...options,
  };

  const pipeline = Array.isArray(query) ? query : query._pipeline;

  const customLabels = {
    ...defaultOptions.customLabels,
    ...options.customLabels,
  };

  const defaultLimit = 10;

  // Custom Labels
  const labelTotal = customLabels.totalDocs;
  const labelLimit = customLabels.limit;
  const labelPage = customLabels.page;
  const labelTotalPages = customLabels.totalPages;
  const labelDocs = customLabels.docs;
  const labelNextPage = customLabels.nextPage;
  const labelPrevPage = customLabels.prevPage;
  const labelHasNextPage = customLabels.hasNextPage;
  const labelHasPrevPage = customLabels.hasPrevPage;
  const labelPagingCounter = customLabels.pagingCounter;
  const labelMeta = customLabels.meta;

  let page = parseInt(options.page || 1, 10) || 1;
  let limit =
    parseInt(options.limit, 10) > 0
      ? parseInt(options.limit, 10)
      : defaultLimit;

  // const skip = (page - 1) * limit;
  let skip;
  let offset;

  if (Object.prototype.hasOwnProperty.call(options, "offset")) {
    offset = Math.abs(parseInt(options.offset, 10));
    skip = offset;
  } else if (Object.prototype.hasOwnProperty.call(options, "page")) {
    page = Math.abs(parseInt(options.page, 10)) || 1;
    skip = (page - 1) * limit;
  } else {
    offset = 0;
    page = 1;
    skip = offset;
  }

  const sort = options.sort;
  const allowDiskUse = options.allowDiskUse || false;
  const isPaginationEnabled = options.pagination === false ? false : true;

  let q = this.aggregate();

  if (query.options) q.options = query.options;

  if (allowDiskUse) {
    q.allowDiskUse(true);
  }

  if (sort) {
    pipeline.push({ $sort: sort });
  }

  function constructPipelines() {
    let cleanedPipeline = pipeline.filter(
      (stage) => stage !== PREPAGINATION_PLACEHOLDER
    );

    const countPipeline = [...cleanedPipeline, { $count: "count" }];

    if (isPaginationEnabled) {
      let foundPrepagination = false;
      cleanedPipeline = pipeline.flatMap((stage) => {
        if (stage === PREPAGINATION_PLACEHOLDER) {
          foundPrepagination = true;
          return [{ $skip: skip }, { $limit: limit }];
        }
        return stage;
      });
      if (!foundPrepagination) {
        cleanedPipeline.push({ $skip: skip }, { $limit: limit });
      }
    }
    return [cleanedPipeline, countPipeline];
  }

  let promise;
  if (options.useFacet && !options.countQuery) {
    let [pipeline, countPipeline] = constructPipelines();
    const match = pipeline[0]?.$match;
    if (match) {
      pipeline.shift();
      countPipeline.shift();
      q = q.match(match);
    }
    promise = q
      .facet({
        docs: pipeline,
        count: countPipeline,
      })
      .then(([{ docs, count }]) => [docs, count]);
  } else {
    const [pipeline, countPipeline] = constructPipelines();

    const countQuery = options.countQuery
      ? options.countQuery
      : this.aggregate(countPipeline);

    if (allowDiskUse) {
      countQuery.allowDiskUse(true);
    }

    const q = this.aggregate(pipeline);

    if (query.options) q.options = query.options;

    promise = Promise.all([
      q.exec(),
      countQuery
        .group({
          _id: null,
          count: {
            $sum: 1,
          },
        })
        .exec(),
    ]);
  }

  return promise
    .then(function (values) {
      var count = values[1][0] ? values[1][0].count : 0;

      if (isPaginationEnabled === false) {
        limit = count;
        page = 1;
      }

      const pages = Math.ceil(count / limit) || 1;

      var result = {
        [labelDocs]: values[0],
      };

      var meta = {
        [labelTotal]: count,
        [labelLimit]: limit,
        [labelPage]: page,
        [labelTotalPages]: pages,
        [labelPagingCounter]: (page - 1) * limit + 1,
        [labelHasPrevPage]: false,
        [labelHasNextPage]: false,
      };

      if (typeof offset !== "undefined") {
        page = Math.ceil((offset + 1) / limit);

        meta.offset = offset;
        meta[labelPage] = Math.ceil((offset + 1) / limit);
        meta[labelPagingCounter] = offset + 1;
      }

      // Set prev page
      if (page > 1) {
        meta[labelHasPrevPage] = true;
        meta[labelPrevPage] = page - 1;
      } else {
        meta[labelPrevPage] = null;
      }

      // Set next page
      if (page < pages) {
        meta[labelHasNextPage] = true;
        meta[labelNextPage] = page + 1;
      } else {
        meta[labelNextPage] = null;
      }

      if (labelMeta) {
        result[labelMeta] = meta;
      } else {
        result = Object.assign(result, meta);
      }

      if (typeof callback === "function") {
        return callback(null, result);
      }

      return Promise.resolve(result);
    })
    .catch(function (reject) {
      if (typeof callback === "function") {
        return callback(reject);
      }
      return Promise.reject(reject);
    });
}

module.exports = aggregatePaginate;

module.exports.PREPAGINATION_PLACEHOLDER = PREPAGINATION_PLACEHOLDER;
