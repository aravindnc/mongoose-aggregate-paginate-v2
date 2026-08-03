/**
 * Mongoose Aggregate Paginate
 * @param  {Aggregate} aggregate
 * @param  {any} options
 * @param  {function} [callback]
 * @returns {Promise}
 */

const { parseSort } = require("./util");

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

  // Create a copy of the pipeline array to avoid mutating the original
  // Shallow copy is sufficient since we only modify the array itself, not the stage objects
  const pipeline = Array.isArray(query) ? [...query] : [...query._pipeline];

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
    pipeline.push({ $sort: parseSort(sort) });
  }

  let promise;

  if (options.useFacet && !options.countQuery) {
    const prepaginationIndex = pipeline.findIndex(
      (stage) => stage === PREPAGINATION_PLACEHOLDER
    );
    if (prepaginationIndex !== -1) {
      promise = q
        .append(pipeline.slice(0, prepaginationIndex))
        .facet({
          docs: [
            ...(isPaginationEnabled
              ? [{ $skip: skip }, { $limit: limit }]
              : []),
            ...pipeline.slice(prepaginationIndex + 1),
          ],
          count: [{ $count: "count" }],
        })
        .then(([{ docs, count }]) => [docs, count]);
    } else {
      // When no prepagination is used, extract stages before facet for count optimization
      // but keep all stages in docs branch to ensure operators like $lookup work correctly
      const stagesBeforeFacet = [];
      const stagesInDocs = [];
      
      // Identify stages that can be safely moved before facet (don't add fields)
      for (const stage of pipeline) {
        const stageKey = Object.keys(stage)[0];
        // Only $match and similar filtering stages can be moved before facet
        // Stages that add/modify fields like $lookup, $unwind, $group, $project, $addFields, etc.
        // should stay in the docs branch to ensure they work correctly
        if (stageKey === '$match') {
          stagesBeforeFacet.push(stage);
        } else {
          stagesInDocs.push(stage);
        }
      }
      
      promise = q
        .append(stagesBeforeFacet)
        .facet({
          docs: [
            ...stagesInDocs,
            ...(isPaginationEnabled ? [{ $skip: skip }, { $limit: limit }] : []),
          ],
          count: [{ $count: "count" }],
        })
        .then(([{ docs, count }]) => [docs, count]);
    }
  } else {
    let cleanedPipeline = pipeline.filter(
      (stage) => stage !== PREPAGINATION_PLACEHOLDER
    );

    const prepagIndex = pipeline.indexOf(PREPAGINATION_PLACEHOLDER);
    const countPipeline =
      prepagIndex !== -1
        ? [...pipeline.slice(0, prepagIndex), { $count: "count" }]
        : [...cleanedPipeline, { $count: "count" }];

    if (isPaginationEnabled) {
      let foundPrepagination = prepagIndex !== -1;
      cleanedPipeline = pipeline.flatMap((stage) => {
        if (stage === PREPAGINATION_PLACEHOLDER) {
          return [{ $skip: skip }, { $limit: limit }];
        }
        return stage;
      });
      if (!foundPrepagination) {
        cleanedPipeline.push({ $skip: skip }, { $limit: limit });
      }
    }

    let countQuery = options.countQuery
      ? options.countQuery
      : this.aggregate(countPipeline);

    if (options.countQuery) {
      countQuery = countQuery.group({
        _id: null,
        count: {
          $sum: 1,
        },
      });
    }

    if (allowDiskUse) {
      countQuery.allowDiskUse(true);
    }

    const q = this.aggregate(cleanedPipeline);

    if (query.options) q.options = query.options;

    promise = Promise.all([q.exec(), countQuery.exec()]);
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
