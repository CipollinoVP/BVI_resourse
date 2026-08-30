hello: docker-compose.production.yml
	docker compose -f docker-compose.production.yml build
	docker service rm bvi_front
	docker service rm bvi_back
	docker service rm bvi_db
	docker service rm bvi_proxy

