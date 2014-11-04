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

app.listen(4680)
