var request = require('browser-request')

var search = document.querySelector('#search')
  , captions = document.querySelector('#captions')
  , template = require('./captions.jade')

_search = function(query) {
  request('http://localhost:4680/'+query, function(err, res) {
    console.log(JSON.parse(res.body))
    captions.innerHTML = template({objects: JSON.parse(res.body)})
  })
}
search.addEventListener('keypress', function(event) { 
  if(event.charCode == 13) _search(this.value)
})
_search('horse')
