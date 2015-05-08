deploy:
	rsync -avz --exclude=.git --exclude=node_modules . dx:/apps/libel
	ssh dx "cd /apps/libel; sed -i 's/localhost:4680/search.dx.artsmia.org/'" bundle.js

start:
	watchify index.js -t jadeify -o bundle.js

