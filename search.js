var l = require('limestone').SphinxClient()
var es = new require('elasticsearch').Client({
  host: process.env.ES_URL,
  log: 'trace'
})

var search = function(query, callback) {
  var q = {
    fuzzy_like_this: {
      fields: ['artist', 'title'],
      like_text: query
    }
  }

  console.log(JSON.stringify(q))

  es.search({body: {query: q, aggs: aggs, highlight: highlight}, size: 100}).then(function (body) {
    // l.connect('localhost:9312', function(error) {
    //   l.query({query: query, limit: 50}, function(err, answer) {
    //    callback(null, answer.matches.map(function(match) { return match.doc }), body)
    //   })
    // })
    body.query = q
    callback(null, [], body)
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
  var replies = []
  search(req.params.query, function(_, results, es) {
    if(results.length == 0) return res.send({sphinx: [], es: es}, 404)

    results.map(function(id, index) {
      client.hget('object:'+~~(id/1000), id, function(err, reply) {
        replies.push(JSON.parse(reply))
        if(index >= results.length-1) res.send({sphinx: replies, es: es})
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
