var request = require('browser-request')

var search = document.querySelector('#search')
  , captions = document.querySelector('#captions')
  , template = require('./captions.jade')
  , fieldsInput = document.querySelector('#fields')
  , fields = ['country', 'culture', 'title', 'artist', 'dated', 'medium', 'dimension', 'creditline', 'accession_number']
  , objects = []

_search = function(query) {
  request('http://caption-search.dx.artsmia.org/'+query, function(err, res) {
    objects = JSON.parse(res.body)
    console.log(objects)
    captions.innerHTML = template({objects: objects, fields: fields})
    if(document.querySelector('input:checked')) {
      updateFields(formats[document.querySelector('input:checked').id][0].split(','))
    }
  })
}
search.addEventListener('keypress', function(event) {
  if(event.charCode == 13 || event.keyCode == 13) _search(this.value)
})
_search('horse')

var formats = {
  default: [fields.join(','), "\n"],
  ad: ['artist,life_date,title,dated,creditline', ','],
  catalog: ['artist,life_date,title,dated,description,dimension', "\n"],
  label: ['artist,life_date,title,dated,medium,creditline', "\n"],
}

fieldsInput.value = fields
var updateFields = function(fields) {
  captions.innerHTML = template({objects: objects, fields: fields})
  fieldsInput.value = fields
}
fieldsInput.addEventListener('keypress', function(event) {
  // if(event.charCode == 13) updateFields(this.value.split(','))
})

document.querySelector('form').addEventListener('change', function(e) {
  updateFields(formats[document.querySelector('input:checked').id][0].split(','))
})
