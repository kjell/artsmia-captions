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

search('matisse', function(_, results) {
  results.map(function(id) {
    client.hget('object:'+~~(id/1000), id, function(err, reply) {
      console.log(JSON.parse(reply))
    })
  })
  client.quit()
})

