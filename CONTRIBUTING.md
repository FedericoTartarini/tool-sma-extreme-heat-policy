# Contributing

Thank you for your interest in improving the Sports Medicine Australia Extreme Heat Policy Tool!

## How to Contribute

1. **Fork the repository**
2. **Create a feature branch**
    ```bash
    git checkout -b feature/your-feature-name
    ```
3. **Make your changes**
4. **Test your changes**
    ```bash
    python -m pytest
    ```
5. **Commit and push**
    ```bash
    git commit -m "Describe your change"
    git push origin feature/your-feature-name
    ```
6. **Open a Pull Request** on GitHub

## Running Tests

To run the test suite:
```bash
python -m pytest --numprocesses 3 --base-url http://0.0.0.0:8080/?id_postcode=Camperdown_NSW_2050&id_sport=soccer
```

## Deployment

### Build and Push Test Version

```bash
gcloud components update --quiet
pipenv requirements > requirements.txt
python -m pytest --numprocesses 3 --base-url http://0.0.0.0:8080/?id_country=AU&id_postcode=Camperdown_NSW_2050&id_sport=soccer
gcloud builds submit --project=sma-extreme-heat-policy --substitutions=_REPO_NAME="extreme-heat-tool-test",_PROJ_NAME="sma-extreme-heat-policy",_IMG_NAME="test"
python -m pytest --numprocesses 3 --base-url https://extreme-heat-tool-test-987661761927.asia-southeast1.run.app/?id_postcode=Camperdown_NSW_2050&id_sport=soccer
```

### Publish Main Version

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

## Issues

If you find a bug or have a feature request, please open an issue on GitHub and use the appropriate label.




