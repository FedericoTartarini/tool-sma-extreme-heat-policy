# Sports Medicine Australia Extreme Heat Policy Tool

This is a tool to help sports clubs and organisations to determine the risk of heat stress during their events. 
It is based on the Sports Medicine Australia Extreme Heat Policy and on the following research paper:

- [Tartarini, F., Smallcombe, J.W., Lynch, G.P., Cross, T.J., Broderick, C. and Jay, O., 2025. A modified sports medicine Australia extreme heat policy and web tool. Journal of Science and Medicine in Sport.](https://www.sciencedirect.com/science/article/pii/S1440244025000696)


## Contributing

If you have a suggestion that would make this better, please fork the repo and create a pull request. 
You can also simply open an issue with the tag "enhancement".

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Test your changes and make sure the tests are passing
5. Bump the version `bump-my-version bump patch`
6. Push to the Branch (`git push origin feature/AmazingFeature`)
7. Open a Pull Request


## Guides

### Build and run the container locally using Docker
```
docker build . --tag gcr.io/football-nsw-369006/extreme-heat-tool
PORT=8080 && docker run -p 9090:${PORT} -e PORT=${PORT} gcr.io/football-nsw-369006/extreme-heat-tool
```
You should be able to access the application at this URL: `http://127.0.0.1:9090/`

### Run the tests
```
python -m pytest --base-url http://0.0.0.0:8080
```

### Push the container image to Container Registry and deploy
```
gcloud components update
```

```
gcloud components update --quiet
gcloud config set account hhri.usyd@gmail.com
pipenv requirements > requirements.txt
gcloud builds submit --tag asia.gcr.io/sma-extreme-heat-policy/asia.gcr.io/sma-extreme-heat-tool  --project=sma-extreme-heat-policy
gcloud run deploy extreme-heat-tool --image asia.gcr.io/sma-extreme-heat-policy/asia.gcr.io/sma-extreme-heat-tool --project=sma-extreme-heat-policy --region=asia-southeast1 --platform managed --update-secrets=firebase_secret=firebase-realtime-database:1
```

### Push the container image to *Test Version*
```
gcloud components update --quiet
gcloud config set account hhri.usyd@gmail.com
pipenv requirements > requirements.txt
gcloud builds submit --tag asia.gcr.io/sma-extreme-heat-policy/asia.gcr.io/extreme-heat-tool-test  --project=sma-extreme-heat-policy
gcloud run deploy extreme-heat-tool-test --image asia.gcr.io/sma-extreme-heat-policy/asia.gcr.io/extreme-heat-tool-test --project=sma-extreme-heat-policy --region=asia-southeast1 --platform managed --update-secrets=firebase_secret=firebase-realtime-database:1