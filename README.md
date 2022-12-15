### Create dependencies
```
pipenv run pip3 freeze > requirements.txt
```

### Build and run the container locally using Docker
```
docker build . --tag gcr.io/football-nsw-369006/extreme-heat-tool
PORT=8080 && docker run -p 9090:${PORT} -e PORT=${PORT} gcr.io/football-nsw-369006/extreme-heat-tool
```
You should be able to access the application at this URL: `http://127.0.0.1:9090/`

### Push the container image to Container Registry and deploy
```
gcloud components update
pipenv run pip3 freeze > requirements.txt
```

```
gcloud builds submit --tag gcr.io/football-nsw-369006/extreme-heat-tool  --project=football-nsw-369006
gcloud run deploy extreme-heat-tool --image gcr.io/football-nsw-369006/extreme-heat-tool  --project=football-nsw-369006 --platform managed
```

