FROM dh-mirror.gitverse.ru/library/python:3.11

WORKDIR /usr/src/project

RUN apt-get update && apt-get install -y \
    gcc \
    libssl-dev \
    libffi-dev \
    libpq-dev \
    python3-dev \
    build-essential \
    && apt-get clean

RUN pip install --index-url https://pypi-mirror.gitverse.ru/simple/ --upgrade pip setuptools wheel

COPY requirements.txt .
RUN pip install --index-url https://pypi-mirror.gitverse.ru/simple/ --no-cache-dir -r requirements.txt

COPY ./project .

CMD sh -c "python3 manage.py collectstatic --noinput && python3 manage.py migrate; gunicorn --bind 0.0.0.0:8080 project.wsgi"
