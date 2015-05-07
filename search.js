var l = require('limestone').SphinxClient()
var es = new require('elasticsearch').Client({
  host: process.env.ES_URL+'/test/',
  log: false
})

var search = function(query, size, filters, callback) {

var fields = ["artist.artist^15", "artist.folded^15", "title^11", "description^3", "text^2", "accession_number", "_all", "artist.ngram^2", "title.ngram"]
if(filters) query += ' '+filters
var searches = {
flt: {
  fields: fields,
  like_text: query,
},
multi_match: {
  query: query,
  fields: fields,
  type: "best_fields",
  tie_breaker: 0.3,
},
common: {
  _all: {
    query: query,
    cutoff_frequency: 0.01,
    minimum_should_match: { low_freq: 1, high_freq: 3 }
  },
},
sqs: {
  query: query,
  fields: fields,
  tie_breaker: 0.3,
  default_operator: "and",
  // default_operator: "or",
  minimum_should_match: "2<60%",
  // "fuzzy_prefix_length" : 3,
},
}
var function_score_sqs = {
  query: {query_string: searches.sqs}, // good
  //query: {flt: searches.flt}, // not great
  //query: {multi_match: searches.multi_match}, // good
  //query: {common: searches.common}, // ok, v different from sqs and multi
  functions: [
    {filter: {term: {image: "valid"}}, weight: 2},
    {filter: {prefix: {room: "g"}}, weight: 1.1},
  ],
  score_mode: "sum"
}

  var q = {function_score: function_score_sqs}
  var suggest = {
    text: query,
    byTitle: {term: {field: "title"}},
    byArtist: {term: {field: "artist"}},
    testphrase: {
      phrase: {field: 'artist'}
    }
  }
  var aggSize = 200
  var aggs = {
        // "Image": {"terms": {"script": "doc['image'].value == 'valid' ? 'yes' : 'no'", "size": aggSize}},
        "Image": {"terms": {"field": "image", "size": aggSize}},
	"On View": {"terms": {"script": "doc['room'].value == 'Not on View' ? 'Not on View' : 'On View'", size: aggSize}},
        "Room": {"terms": {"field": "room.raw", "size": aggSize}},
        "Artist": {"terms": {"field": "artist.raw", "size": aggSize}},
        "Country": {"terms": {"field": "country.raw", "size": aggSize}},
        "Style": {"terms": {"field": "style.raw", "size": aggSize}},
        "Medium": {"terms": {"field": "medium", "size": aggSize}},
        "Title": {"terms": {"field": "title.raw", "size": aggSize}},
	"Gist": {"significant_terms": {"field": "_all"}},
	// other facets? department
	// "year": {"histogram": {"field": "dated", "interval": 50}},
	// "year": {"terms": {"field": "dated", "size": aggSize}},
      }
  var highlight = {fields: {artist: {}, title: {}}}

  var search = {body: {query: q, aggs: aggs, highlight: highlight, suggest: suggest}, size: size}
  // when the search is undefined or blank, do a count over the aggregations
  if(query == '' || query == undefined) {
    search = {body: {size: 0, aggs: aggs}, searchType: 'count'}
  }
  es.search(search).then(function (body) {
    // l.connect('localhost:9312', function(error) {
    //   l.query({query: query, limit: 50}, function(err, answer) {
    //    callback(null, answer.matches.map(function(match) { return match.doc }), body)
    //   })
    // })
    body.query = q
    callback(null, [], body)
  }, function (error) {
    console.log(error)
    callback(error, [], [])
  })
}

var redis = require('redis')
  , client = redis.createClient()
  , express = require('express')
  , app = express()
  , cors = require('cors')

app.use(cors())

app.get('/', function(req, res) {
  res.end('.')
})

app.get('/:query', function(req, res) {
  if(req.params.query == 'favicon.ico') return res.send(404)
  var replies = []
  var size = req.query.size || 100
  var filters = req.query.filters
  search(req.params.query || '', size, filters, function(error, results, es) {
    if(results.length == 0) return res.send({sphinx: [], es: es, query: req.params.query, error: error, filters: filters}, 200)

    results.map(function(id, index) {
      client.hget('object:'+~~(id/1000), id, function(err, reply) {
        replies.push(JSON.parse(reply))
        if(index >= results.length-1) res.send({sphinx: replies, es: es, query: req.params.query})
      })
    })
  })
})

app.get('/id/:id', function(req, res) {
  var id = req.params.id
  client.hget('object:'+~~(id/1000), id, function(err, reply) {
    res.json(JSON.parse(reply))
  })
})

app.get('/ids/:ids', function(req, res) {
  var ids = req.params.ids.split(',')
  var m = client.multi()
  ids.forEach(function(id) { m.hget('object:'+~~(id/1000), id) })

  m.exec(function(err, replies) {
    var filter = req.query.filter
    if(filter == undefined) return res.json(replies.map(function(meta) { return JSON.parse(meta) }))
    filter = filter.split(',')
    var filtered = replies.map(function(meta) {
      if(meta == null) return
      var json = JSON.parse(meta)
      return filter.reduce(function(all, field) { 
        all[field] = json[field]; return all
      }, {})
    })
    return res.send(filtered)
  })
})

app.listen(4680)
