# mongoose-aggregate-paginate-v2
[![npm version](https://img.shields.io/npm/v/mongoose-aggregate-paginate-v2.svg)](https://www.npmjs.com/package/mongoose-aggregate-paginate-v2)
[![Dependency Status](https://david-dm.org/aravindnc/mongoose-aggregate-paginate-v2.svg)](https://david-dm.org/aravindnc/mongoose-aggregate-paginate-v2)
[![devDependency Status](https://david-dm.org/aravindnc/mongoose-aggregate-paginate-v2/dev-status.svg)](https://david-dm.org/aravindnc/mongoose-aggregate-paginate-v2#info=devDependencies)
[![contributions welcome](https://img.shields.io/badge/contributions-welcome-brightgreen.svg?style=flat)](https://github.com/aravindnc/mongoose-aggregate-paginate-v2/issues)
[![HitCount](http://hits.dwyl.io/aravindnc/mongoose-aggregate-paginate-v2.svg)](http://hits.dwyl.io/aravindnc/mongoose-aggregate-paginate-v2)

> A cursor based custom aggregate pagination library for [Mongoose](http://mongoosejs.com) with customizable labels.

If you are looking for basic query pagination library without aggregate, use this one [mongoose-paginate-v2](https://github.com/aravindnc/mongoose-paginate-v2)

## Installation

```sh
npm install mongoose-aggregate-paginate-v2
```

## Usage

Adding the plugin to a schema,

```js
var mongoose = require('mongoose');
var aggregatePaginate = require('mongoose-aggregate-paginate-v2');

var mySchema = new mongoose.Schema({ 
    /* your schema definition */ 
});

mySchema.plugin(aggregatePaginate);

var myModel = mongoose.model('SampleModel',  mySchema); 

```

and then use model `aggregatePaginate` method,
```js
// as Promise

var myModel = require('/models/samplemodel');

const options = {
    page: 1,
    limit: 10
};

var myAggregate = myModel.aggregate();
myModel.aggregatePaginate(myAggregate, options).then(function(results){
	console.log(results);
}).catch(function(err){
	console.log(err);
})
```
```js
// as Callback

var myModel = require('/models/samplemodel');

const options = {
    page: 1,
    limit: 10
};

var myAggregate = myModel.aggregate();
myModel.aggregatePaginate(myAggregate, options, function(err, results) {
	if(err) {
		console.err(err);
	else { 
    	console.log(results);
	}
})
```

### Model.aggregatePaginate([aggregateQuery], [options], [callback])

Returns promise

**Parameters**

* `[aggregate-query]` {Object} - Aggregate Query criteria. [Documentation](https://docs.mongodb.com/manual/aggregation/)
* `[options]` {Object}
  - `[sort]` {Object | String} - Sort order. [Documentation](http://mongoosejs.com/docs/api.html#query_Query-sort)
  - `[page]` {Number} - Current Page (Defaut: 1)
  - `[limit]` {Number} - Docs. per page (Default: 10).
  - `[customLabels]` {Object} - Developers can provide custom labels for manipulating the response data.
  - `[pagination]` {Boolean} - If `pagination` is set to false, it will return all docs without adding limit condition. (Default: True)
  - `[allowDiskUse]` {Bool} - To enable diskUse for bigger queries. (Default: False)
* `[callback(err, result)]` - (Optional) If specified the callback is called once pagination results are retrieved or when an error has occurred.

**Return value**

Promise fulfilled with object having properties:
* `docs` {Array} - Array of documents
* `totalDocs` {Number} - Total number of documents that match a query
* `limit` {Number} - Limit that was used
* `page` {Number} - Current page number 
* `totalPages` {Number} - Total number of pages.
* `hasPrevPage` {Bool} - Availability of prev page.
* `hasNextPage` {Bool} - Availability of next page.
* `prevPage` {Number} - Previous page number if available or NULL
* `nextPage` {Number} - Next page number if available or NULL
* `pagingCounter` {Number} - The starting sl. number of first document.

Please note that the above properties can be renamed by setting customLabels attribute.

### Sample Usage

#### Return first 10 documents from 100

```javascript

const options = {
    page: 1,
    limit: 10
};

// Define your aggregate.
var aggregate = Model.aggregate();

Model.aggregatePaginate(aggregate, options)
	.then(function(result) {
		// result.docs
		// result.totalDocs = 100
		// result.limit = 10
		// result.page = 1
		// result.totalPages = 10    
		// result.hasNextPage = true
		// result.nextPage = 2
		// result.hasPrevPage = false
		// result.prevPage = null
	})
	.catch(function(err){
		console.log(err);
	});
```

### With custom return labels

Now developers can specify the return field names if they want. Below are the list of attributes whose name can be changed.

* totalDocs
* docs
* limit
* page
* nextPage
* prevPage
* totalPages
* hasNextPage
* hasPrevPage
* pagingCounter

You should pass the names of the properties you wish to changes using `customLabels` object in options. Labels are optional, you can pass the labels of what ever keys are you changing, others will use the default labels.

Same query with custom labels
```javascript

const myCustomLabels = {
    totalDocs: 'itemCount',
    docs: 'itemsList',
    limit: 'perPage',
    page: 'currentPage',
    nextPage: 'next',
    prevPage: 'prev',
    totalPages: 'pageCount',
	hasPrevPage: 'hasPrev',
	hasNextPage: 'hasNext',
	pagingCounter: 'pageCounter'
};

const options = {
    page: 1,
    limit: 10,
    customLabels: myCustomLabels
};

// Define your aggregate.
var aggregate = Model.aggregate();

Model.aggregatePaginate(aggregate, options, function(err, result) {
	if(!err) {
		// result.itemsList [here docs become itemsList]
		// result.itemCount = 100 [here totalDocs becomes itemCount]
		// result.perPage = 10 [here limit becomes perPage]
		// result.currentPage = 1 [here page becomes currentPage]
		// result.pageCount = 10 [here totalPages becomes pageCount]
		// result.next = 2 [here nextPage becomes next]
		// result.prev = null [here prevPage becomes prev]

		// result.hasNextPage = true [not changeable]
		// result.hasPrevPage = false [not changeable]
	} else {
		console.log(err);
	};
```

### Global Options
If you want to set the pagination options globally across the model. Then you can do like below,

```js

let mongooseAggregatePaginate = require('mongoose-aggregate-paginate-v2');

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

// Like this.
Book.aggregatePaginate.options = {
  limit: 20
};

```

## License
[MIT](LICENSE)
