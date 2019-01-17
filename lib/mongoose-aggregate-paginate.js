/**
 * Mongoose Aggregate Paginate
 * @param  {Aggregate} aggregate
 * @param  {any} options
 * @param  {function} [callback]
 * @returns {Promise}
 */
function aggregatePaginate(aggregateQuery, options, callback) {

  options = options || {};

  options.customLabels = options.customLabels ? options.customLabels : {};

  const defaultLimit = 10;

  // Custom Labels
  var labelTotal = options.customLabels.totalDocs ? options.customLabels.totalDocs : 'totalDocs';
  var labelLimit = options.customLabels.limit ? options.customLabels.limit : 'limit';
  var labelPage = options.customLabels.page ? options.customLabels.page : 'page';
  var labelTotalPages = options.customLabels.totalPages ? options.customLabels.totalPages : 'totalPages';
  var labelDocs = options.customLabels.docs ? options.customLabels.docs : 'docs';
  var labelNextPage = options.customLabels.nextPage ? options.customLabels.nextPage : 'nextPage';
  var labelPrevPage = options.customLabels.prevPage ? options.customLabels.prevPage : 'prevPage';
  var labelHasNextPage = options.customLabels.hasNextPage ? options.customLabels.hasNextPage : 'hasNextPage';
  var labelHasPrevPage = options.customLabels.hasPrevPage ? options.customLabels.hasPrevPage : 'hasPrevPage';
  var labelPagingCounter = options.customLabels.pagingCounter ? options.customLabels.pagingCounter : 'pagingCounter';
 
  var page = parseInt(options.page || 1, 10);
  var limit = parseInt(options.limit || 10, 10);
  var skip = (page - 1) * limit;
  var sort = options.sort;
  var allowDiskUse = options.allowDiskUse || false;

  var q = this.aggregate(aggregateQuery._pipeline);
  var countQuery = this.aggregate(q._pipeline);
  if (q.hasOwnProperty('options')) {
    q.options = aggregateQuery.options;
    countQuery.options = aggregateQuery.options;
  }

  if (sort) {
    q.sort(sort);
  }
  
  if (allowDiskUse) {
    q.allowDiskUse(true)
    countQuery.allowDiskUse(true)
  }

  return Promise.all([
    q
      .skip(skip)
      .limit(limit)
      .exec(), 
    countQuery.group({
      _id: null,
      count: {
        $sum: 1
      }
    }).exec()])
    .then(function (values) {

      var count = values[1][0] ? values[1][0].count : 0;
      var pages = Math.ceil(count / limit) || 1;

      var result = {
        [labelDocs]: values[0],
        [labelTotal]: count,
        [labelLimit]: limit,
        [labelPage]: page,
        [labelTotalPages]: pages,
        [labelPagingCounter]: ((page - 1) * limit) + 1,
        [labelHasPrevPage]: false,
        [labelHasNextPage]: false
      };

      // Set prev page
      if (page > 1) {
        result[labelHasPrevPage] = true;
        result[labelPrevPage] = (page - 1);
      } else {
        result[labelPrevPage] = null;
      }

      // Set next page
      if (page < pages) {
        result[labelHasNextPage] = true;
        result[labelNextPage] = (page + 1);
      } else {
        result[labelNextPage] = null;
      }
      
      if (typeof callback === 'function') {        
        return callback(null, result);
      }

      return Promise.resolve(result);

    })
    .catch(function (reject) {
      if (typeof callback === 'function') {
        return callback(reject)
      }
      return Promise.reject(reject)
    })
}

module.exports = aggregatePaginate;