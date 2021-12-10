const mongoose = require("mongoose");
const aggregatePaginate = require("./lib/mongoose-aggregate-paginate");

/**
 * @param {Schema} schema
 */
module.exports = function (schema) {
  schema.statics.aggregatePaginate = aggregatePaginate;

  mongoose.Aggregate.prototype.paginateExec = function (options, cb) {
    return this.model().aggregatePaginate(this, options, cb);
  };
};

module.exports.paginate = aggregatePaginate
