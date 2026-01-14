#!/bin/bash

# venv 활성화
source venv/bin/activate

# Django 서버 시작 (0.0.0.0:8000으로 모든 네트워크 인터페이스에서 접근 가능)
python manage.py runserver 0.0.0.0:8000

