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
```

```
gcloud builds submit --tag gcr.io/sma-extreme-heat-policy/sma-extreme-heat-tool-v2  --project=sma-extreme-heat-policy
gcloud run deploy sma-extreme-heat-tool-v2 --image gcr.io/sma-extreme-heat-policy/sma-extreme-heat-tool-v2  --project=sma-extreme-heat-policy --region=asia-southeast1 --platform managed
```

