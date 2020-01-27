'use strict';

let mongoose = require('mongoose');
let expect = require('chai').expect;
let mongooseAggregatePaginate = require('../index');

let MONGO_URI = 'mongodb://127.0.0.1/mongoose_paginate_test';

let AuthorSchema = new mongoose.Schema({
  name: String
});
let Author = mongoose.model('Author', AuthorSchema);

let BookSchema = new mongoose.Schema({
  title: String,
  date: Date,
  author: {
    type: mongoose.Schema.ObjectId,
    ref: 'Author'
  }
});

BookSchema.plugin(mongooseAggregatePaginate);

let Book = mongoose.model('Book', BookSchema);

describe('mongoose-paginate', function () {

  before(function (done) {
    mongoose.connect(MONGO_URI, done);
  });

  before(function (done) {
    mongoose.connection.db.dropDatabase(done);
  });

  before(function () {
    let book, books = [];
    let date = new Date();
    return Author.create({
      name: 'Arthur Conan Doyle'
    }).then(function (author) {
      for (let i = 1; i <= 100; i++) {
        book = new Book({
          title: 'Book #' + i,
          date: new Date(date.getTime() + i),
          author: author._id
        });
        books.push(book);
      }
      return Book.create(books);
    });
  });

  afterEach(function () {

  });

  it('promise return test', function () {
    var aggregate = Book.aggregate([{
      $match: {
        title: {
          $in: [/Book/i]
        }
      }
    }])
    let promise = Book.aggregatePaginate(aggregate, {});
    expect(promise.then).to.be.an.instanceof(Function);
  });

  it('callback test', function (done) {
    var aggregate = Book.aggregate([{
      $match: {
        title: {
          $in: [/Book/i]
        }
      }
    }])
    Book.aggregatePaginate(aggregate, {}, function (err, result) {
      expect(err).to.be.null;
      expect(result).to.be.an.instanceOf(Object);
      done();
    });
  });

  describe('paginates', function () {

    it('with global limit and page', function () {

      Book.aggregatePaginate.options = {
        limit: 20
      };

      var aggregate = Book.aggregate([{
        $match: {
          title: {
            $in: [/Book/i]
          }
        }
      }, {
        $sort: {
          date: 1
        }
      }])
      var options = {
        // limit: 10,
        page: 5,
        allowDiskUse: true
      };
      return Book.aggregatePaginate(aggregate, options).then((result) => {

        expect(result.docs).to.have.length(10);
        expect(result.docs[0].title).to.equal('Book #41');
        expect(result.totalDocs).to.equal(100);
        expect(result.limit).to.equal(10);
        expect(result.page).to.equal(5);
        expect(result.pagingCounter).to.equal(41);
        expect(result.hasPrevPage).to.equal(true);
        expect(result.hasNextPage).to.equal(true);
        expect(result.prevPage).to.equal(4);
        expect(result.nextPage).to.equal(6);
        expect(result.totalPages).to.equal(10);
      });
    });

    it('with custom labels', function () {

      var aggregate = Book.aggregate([{
        $match: {
          title: {
            $in: [/Book/i]
          }
        }
      }, {
        $sort: {
          date: 1
        }
      }])

      const myCustomLabels = {
        totalDocs: 'itemCount',
        docs: 'itemsList',
        limit: 'perPage',
        page: 'currentPage',
        hasNextPage: 'hasNext',
        hasPrevPage: 'hasPrev',
        nextPage: 'next',
        prevPage: 'prev',
        totalPages: 'pageCount',
        hasPrevPage: 'hasPrev',
        hasNextPage: 'hasNext',
        pagingCounter: 'pageCounter'
      };

      var options = {
        // limit: 10,
        page: 5,
        customLabels: myCustomLabels

      };
      return Book.aggregatePaginate(aggregate, options).then((result) => {

        expect(result.itemsList).to.have.length(10);
        expect(result.itemsList[0].title).to.equal('Book #41');
        expect(result.itemCount).to.equal(100);
        expect(result.perPage).to.equal(10);
        expect(result.currentPage).to.equal(5);
        expect(result.pageCounter).to.equal(41);
        expect(result.hasPrev).to.equal(true);
        expect(result.hasNext).to.equal(true);
        expect(result.prev).to.equal(4);
        expect(result.next).to.equal(6);
        expect(result.pageCount).to.equal(10);
      });
    });

  });

  after(function (done) {
    mongoose.connection.db.dropDatabase(done);
  });

  after(function (done) {
    mongoose.disconnect(done);
  });

});