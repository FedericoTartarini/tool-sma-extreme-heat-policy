# Contributing

Thank you for your interest in improving the Sports Medicine Australia Extreme Heat Policy Tool!

## How to Contribute

1. **Fork the repository**
2. **Create a feature branch**
    ```bash
    git checkout -b feature/your-feature-name
    ```
3. **Install dependencies**
    ```bash
    pipenv install --dev
    ```
4. **Make your changes**
5. **Test your changes**
    ```bash
    # in another terminal
    pipenv run python app.py  # or: docker compose up web
    # then
    python -m pytest --numprocesses 3 --base-url http://0.0.0.0:8080
    ```
6. **Commit and push**
    ```bash
    git commit -m "Describe your change"
    git push origin feature/your-feature-name
    ```
7. **Open a Pull Request** on GitHub

## Deployment

We use GitHub Actions for continuous integration and deployment.
However, you can also deploy manually using the following commands.

### Build and Push Test Version

```bash
gcloud components update --quiet
python -m pytest --numprocesses 3 --base-url http://0.0.0.0:8080
gcloud builds submit --project=sma-extreme-heat-policy --substitutions=_REPO_NAME="extreme-heat-tool-test",_PROJ_NAME="sma-extreme-heat-policy",_IMG_NAME="test"
python -m pytest --numprocesses 3 --base-url https://extreme-heat-tool-test-987661761927.asia-southeast1.run.app
```

### Publish Main Version

```bash
gcloud components update --quiet
bump-my-version bump patch
python -m pytest --numprocesses 3 --base-url http://0.0.0.0:8080
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
for revision in inactive_revisions[2:]:
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




