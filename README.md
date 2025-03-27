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
gcloud builds submit --project=sma-extreme-heat-policy --substitutions=_REPO_NAME="extreme-heat-tool-test",_PROJ_NAME="sma-extreme-heat-policy",_IMG_NAME="test"
python -m pytest --numprocesses 3 --base-url https://extreme-heat-tool-test-987661761927.asia-southeast1.run.app/?id_postcode=Camperdown_NSW_2050&id_sport=soccer
```

### Publish the main version of the application
```bash
gcloud components update --quiet
bump-my-version bump patch
pipenv requirements > requirements.txt
python -m pytest --numprocesses 3 --base-url http://0.0.0.0:8080/?id_postcode=Camperdown_NSW_2050&id_sport=soccer
gcloud builds submit --project=sma-extreme-heat-policy --substitutions=_REPO_NAME="extreme-heat-tool",_PROJ_NAME="sma-extreme-heat-policy",_IMG_NAME="main"
python -m pytest --numprocesses 3 --base-url https://sma-heat-policy.sydney.edu.au/
```

### Delete unused revisions

```python
import subprocess

project = "sma-extreme-heat-policy"
region = "asia-southeast1"
test_service = "extreme-heat-tool-test"
main_service = "extreme-heat-tool"

def run_command(command):
    result = subprocess.run(command, shell=True, capture_output=True, text=True)
    if result.returncode != 0:
        raise Exception(f"Command failed: {command}\n{result.stderr}")
    return result.stdout.strip()

# Set the project and region
run_command(f"gcloud auth application-default set-quota-project {project}")
run_command(f"gcloud config set project {project}")
run_command(f"gcloud config set run/region {region}")

# Get the list of inactive revisions
inactive_revisions = run_command(
    f"gcloud run revisions list --platform managed --service {test_service} "
    "--filter=\"status.conditions.type:Active AND status.conditions.status:'False'\" "
    "--format='value(metadata.name)'"
).split()

# Delete inactive revisions
for revision in inactive_revisions:
    run_command(f"gcloud run revisions delete {revision} --quiet")

# Get the list of all revisions for hss-app, sorted by creation timestamp
all_inactive_main_revisions = run_command(
    f"gcloud run revisions list --platform managed --service {main_service} "
    "--filter=\"status.conditions.type:Active AND status.conditions.status:'False'\" "
    "--sort-by=~creationTimestamp --format='value(metadata.name)'"
).split()

# Delete the remaining revisions
revisions_to_delete = all_inactive_main_revisions[4:]
for revision in revisions_to_delete:
    run_command(f"gcloud run revisions delete {revision} --quiet")
```