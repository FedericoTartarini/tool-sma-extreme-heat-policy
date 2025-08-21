# Use the official lightweight Python image.
# https://hub.docker.com/_/python
FROM python:3.12-slim

# Allow statements and log messages to immediately appear in the Knative logs
ENV PYTHONUNBUFFERED True

RUN apt-get update \
&& apt-get install gcc -y \
&& apt-get clean

# Install pipenv
RUN python -m pip install --upgrade pip
RUN pip install pipenv

# Set working directory
WORKDIR /app

# Copy Pipfile and Pipfile.lock
COPY Pipfile Pipfile.lock ./

# Install dependencies
RUN pipenv install --deploy --system

# Copy the rest of the application code
COPY . .

EXPOSE 8080

ENV DEBUG_DASH False

# Run the application
CMD ["python", "main.py"]
