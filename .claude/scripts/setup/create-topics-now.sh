#!/bin/bash
# Wrapper to create topics with env vars from .env

export $(cat .env | grep -v '^#' | xargs)
node create-topic.js "$@"
