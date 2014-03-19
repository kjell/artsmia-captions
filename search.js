var l = require('limestone').SphinxClient()

var search = function(query, callback) {
  l.connect('localhost:9312', function(error) {
    l.query({query: query}, function(err, answer) {
      callback(null, answer.matches.map(function(match) { return match.doc }))
    })
  })
}

var redis = require('redis')
  , client = redis.createClient()
  , express = require('express')
  , app = express()

app.get('/', function(req, res) {
  res.end('.')
})

app.get('/:query', function(req, res) {
  var replies = []
  search(req.params.query, function(_, results) {
    results.map(function(id) {
      client.hget('object:'+~~(id/1000), id, function(err, reply) {
        replies.push(JSON.parse(reply))
      })
    })

    setTimeout(function() { res.send(replies) }, 200)
  })
})

app.listen(4680)
