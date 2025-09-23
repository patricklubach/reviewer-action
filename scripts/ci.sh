#!/bin/bash

set -e

echo "Running ESLint for code quality checks"
npm run lint

echo "Creating dev environment"
npm run dev

echo "Open terminal"
bash
