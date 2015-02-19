var l = require('limestone').SphinxClient()

var search = function(query, callback) {
  l.connect('localhost:9312', function(error) {
    l.query({query: query, limit: 50}, function(err, answer) {
      callback(null, answer.matches.map(function(match) { return match.doc }))
    })
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
  search(req.params.query, function(_, results) {
    if(results.length == 0) return res.send([], 404)

    results.map(function(id, index) {
      client.hget('object:'+~~(id/1000), id, function(err, reply) {
        replies.push(JSON.parse(reply))
        if(index >= results.length-1) res.send(replies)
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
