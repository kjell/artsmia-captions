sphinx_tunnel:
	ssh -fNg -L 9312:127.0.0.1:9312 collections

deploy:
	rsync -avz --exclude=.git --exclude=node_modules . dx:/apps/libel
	ssh dx "cd /apps/libel; sed -i 's/localhost/captions.dx.artsmia.org/'" bundle.js

start:
	nohup node-supervisor search.js &
	autossh -M 9312 -fNg -L 9312:127.0.0.1:9312 collections
