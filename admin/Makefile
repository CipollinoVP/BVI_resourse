hello: Dockerfile
	docker build --no-cache --pull -t react-app .
	docker stop admin-container && docker rm admin-container
	docker run -d --name admin-container -p 8660:80 react-app