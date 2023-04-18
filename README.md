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
gcloud config set account hhri.usyd@gmail.com
gcloud builds submit --tag gcr.io/sma-extreme-heat-policy/extreme-heat-tool-us  --project=sma-extreme-heat-policy
gcloud run deploy extreme-heat-tool-us --image gcr.io/sma-extreme-heat-policy/extreme-heat-tool-us  --project=sma-extreme-heat-policy --region=us-central1 --platform managed
```

### Push the container image to *Test Version*
```
gcloud builds submit --tag gcr.io/sma-extreme-heat-policy/extreme-heat-tool-us-test  --project=sma-extreme-heat-policy
gcloud run deploy extreme-heat-tool-us-test --image gcr.io/sma-extreme-heat-policy/extreme-heat-tool-us-test  --project=sma-extreme-heat-policy --region=us-central1 --platform managed
```