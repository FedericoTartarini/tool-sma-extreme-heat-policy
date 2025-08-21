# Use the official lightweight Python image.
# https://hub.docker.com/_/python
FROM python:3.12-slim

# Allow statements and log messages to immediately appear in the Knative logs
ENV PYTHONUNBUFFERED True

RUN apt-get update \
&& apt-get install gcc -y \
&& apt-get clean

# Set the working directory
ENV APP_HOME /app
WORKDIR $APP_HOME

# Copy requirements.txt first to leverage Docker cache
COPY requirements.txt ./

# Install production dependencies.
RUN python -m pip install --upgrade pip
RUN pip install pipenv
RUN pipenv install

# Copy the rest of the application code
COPY . ./

EXPOSE 8080

ENV DEBUG_DASH False

CMD python main.py
