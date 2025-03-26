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

### Run the tests
```bash
python -m pytest --numprocesses 3 --base-url http://0.0.0.0:8080/?id_postcode=Camperdown_NSW_2050&id_sport=soccer
```

### Push the container image to *Test Version*

```bash
gcloud components update --quiet
pipenv requirements > requirements.txt
python -m pytest --numprocesses 3 --base-url http://0.0.0.0:8080/?id_postcode=Camperdown_NSW_2050&id_sport=soccer
gcloud builds submit --project=sma-extreme-heat-policy --substitutions=_REPO_NAME="extreme-heat-tool-test",_PROJ_NAME="sma-extreme-heat-policy"
python -m pytest --numprocesses 3 --base-url https://extreme-heat-tool-test-987661761927.asia-southeast1.run.app/?id_postcode=Camperdown_NSW_2050&id_sport=soccer
```

### Publish the main version of the application
```bash
gcloud components update --quiet
bump-my-version bump patch
pipenv requirements > requirements.txt
python -m pytest --numprocesses 3 --base-url http://0.0.0.0:8080/?id_postcode=Camperdown_NSW_2050&id_sport=soccer
gcloud builds submit --project=sma-extreme-heat-policy --substitutions=_REPO_NAME="extreme-heat-tool",_PROJ_NAME="sma-extreme-heat-policy"
python -m pytest --numprocesses 3 --base-url https://sma-heat-policy.sydney.edu.au/
```